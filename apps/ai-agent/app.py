"""
FreightClaims AI Agent - Agentic browser automation for carrier portal interactions.

Orchestrates specialized agents that interact with carrier websites to file claims,
check statuses, upload documents, and negotiate settlements. Uses browser-use for
agentic browsing and Playwright for reliable page automation.

Now powered by Google Gemini instead of OpenAI.

Location: apps/ai-agent/app.py
Related: apps/ai-agent/tools.py (custom Playwright tools)
         apps/ai-agent/prompts/ (carrier-specific prompt templates)
"""
import os
import sys
import asyncio
import json
import base64
import logging
import subprocess
import tempfile
from typing import Optional, Dict, Any
from pathlib import Path
from importlib import metadata

os.environ["ANONYMIZED_TELEMETRY"] = "false"

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError

load_dotenv()

try:
    import aiohttp
    from browser_use import Agent, Browser, Tools
    from browser_use.browser import BrowserSession
    from playwright.async_api import Browser as PwBrowser, Page, async_playwright
except ImportError as exc:
    print(f"Missing dependencies: {exc}")
    print("Install with: pip install -r requirements.txt && playwright install chromium")
    sys.exit(1)

import tools as agent_tools

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SERVICE_API_KEY = os.getenv("SERVICE_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gemini-2.0-flash")
AES_KEY = os.getenv("AI_AGENT_AES_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
S3_PROMPTS_BUCKET = os.getenv("AWS_S3_BUCKET_AI_PROMPTS", "freightclaims-aibot")
S3_DOCUMENTS_BUCKET = os.getenv("AWS_S3_BUCKET_DOCUMENTS", "freightclaims-documents")
TIMEOUT_MS = int(os.getenv("TIMEOUT_MS", "120000"))
BROWSER_ARGS = os.getenv(
    "BROWSER_ARGS",
    "--no-sandbox --disable-dev-shm-usage --disable-gpu --disable-extensions",
).split()

app = FastAPI(title="FreightClaims AI Agent", version="1.0.0")

playwright_browser: Optional[PwBrowser] = None
playwright_page: Optional[Page] = None


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class RunRequest(BaseModel):
    """Payload for running an AI agent against a carrier portal."""
    auth: Dict[str, str]
    scacCode: str
    data: Dict[str, Any]


# ---------------------------------------------------------------------------
# Gemini LLM wrapper (compatible with browser-use ChatLLM interface)
# ---------------------------------------------------------------------------
class ChatGemini:
    """
    Lightweight wrapper around the Google Gemini REST API that presents
    the same interface browser-use expects from a ChatLLM.
    """

    def __init__(self, model: str = AI_MODEL, api_key: str = GEMINI_API_KEY):
        self.model = model
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def achat(self, messages: list[dict]) -> str:
        """Async chat completion that converts message format for Gemini."""
        contents = []
        for msg in messages:
            role = "user" if msg.get("role") in ("user", "system") else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 8192,
                "topP": 0.95,
            },
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=120)) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise RuntimeError(f"Gemini returned {resp.status}: {body}")
                data = await resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]


# ---------------------------------------------------------------------------
# Helpers: Chrome, Playwright, S3, Encryption
# ---------------------------------------------------------------------------
async def start_chrome(port: int = 9222):
    """Launch headless Chrome with CDP debugging enabled."""
    user_data = tempfile.mkdtemp(prefix="chrome_cdp_")
    chrome_paths = [
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    ]
    chrome_exe = None
    for path in chrome_paths:
        if os.path.exists(path):
            chrome_exe = path
            break
    if not chrome_exe:
        raise RuntimeError("Chrome not found. Install Chrome or Chromium.")

    cmd = [
        chrome_exe, "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
        f"--remote-debugging-port={port}", f"--user-data-dir={user_data}",
        "--no-first-run", "--no-default-browser-check", "about:blank",
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    for _ in range(20):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"http://localhost:{port}/json/version",
                    timeout=aiohttp.ClientTimeout(total=1),
                ) as resp:
                    if resp.status == 200:
                        return proc
        except Exception:
            pass
        await asyncio.sleep(1)

    proc.terminate()
    raise RuntimeError("Chrome failed to start with CDP")


async def connect_playwright(cdp_url: str):
    """Connect Playwright to the running Chrome instance for custom tool use."""
    global playwright_browser, playwright_page
    pw = await async_playwright().start()
    playwright_browser = await pw.chromium.connect_over_cdp(cdp_url)
    if playwright_browser.contexts and playwright_browser.contexts[0].pages:
        playwright_page = playwright_browser.contexts[0].pages[0]
    else:
        ctx = await playwright_browser.new_context()
        playwright_page = await ctx.new_page()


PROMPTS_DIR = Path(__file__).parent / "prompts"

def load_prompt(scac_code: str) -> str:
    """Fetch the carrier-specific prompt template. Checks local prompts/ dir first, then S3."""
    scac_map = {
        "SEFL": "southeastern.txt",
        "XPOL": "xpo.txt",
        "CNWY": "xpo.txt",
    }
    normalized = scac_code.strip().upper()
    if normalized not in scac_map:
        raise HTTPException(400, f"Unknown SCAC code: {scac_code}")

    filename = scac_map[normalized]

    local_path = PROMPTS_DIR / filename
    if local_path.exists():
        return local_path.read_text(encoding="utf-8")

    aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")
    if not aws_key:
        raise HTTPException(500, f"Prompt '{filename}' not found locally and AWS credentials not configured")

    try:
        s3 = boto3.client("s3", region_name=AWS_REGION)
        obj = s3.get_object(Bucket=S3_PROMPTS_BUCKET, Key=filename)
        return obj["Body"].read().decode("utf-8")
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code == "NoSuchKey":
            raise HTTPException(500, f"Prompt '{filename}' not found in S3")
        raise HTTPException(500, f"Error loading prompt: {exc}")


async def download_claim_docs(claim_documents: list) -> list[str]:
    """Download claim docs from S3 and return local file paths."""
    if not claim_documents:
        return []

    aws_key = os.getenv("AWS_ACCESS_KEY_ID", "")
    if not aws_key:
        logger.warning("AWS credentials not configured — skipping document download")
        return []

    files_dir = Path("/tmp/fc-agent-files")
    files_dir.mkdir(parents=True, exist_ok=True)
    s3 = boto3.client("s3", region_name=AWS_REGION)
    paths: list[str] = []

    for doc in claim_documents:
        claim_id = doc["claimId"]
        category = doc["documentCategoryName"]
        name = doc["documentName"]
        key = f"{category}/{claim_id}-{category}-{name}"
        local = files_dir / f"{claim_id}-{category}-{name}"
        try:
            s3.download_file(S3_DOCUMENTS_BUCKET, key, str(local))
            paths.append(str(local))
        except Exception as exc:
            logger.exception(f"Failed to download {key}: {exc}")

    return paths


def decrypt_credential(encrypted_b64: str) -> str:
    """Decrypt AES-CBC encrypted carrier credentials."""
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad

    key = AES_KEY.ljust(32)[:32].encode("utf-8")
    data = base64.b64decode(encrypted_b64)
    iv, ciphertext = data[:16], data[16:]
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(ciphertext), AES.block_size).decode("utf-8")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/healthz")
async def healthz():
    return {"ok": True, "model": AI_MODEL}


@app.get("/debug")
async def debug():
    return {
        "browser_use": metadata.version("browser-use"),
        "playwright": metadata.version("playwright"),
        "llm_provider": "gemini",
        "model": AI_MODEL,
        "args": BROWSER_ARGS,
        "timeout_ms": TIMEOUT_MS,
    }


@app.post("/run")
async def run_agent(req: RunRequest, x_api_key: Optional[str] = Header(None)):
    """
    Main endpoint: receives claim data, downloads documents, loads the
    carrier-specific prompt, and runs the browser agent using Gemini.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY not set")

    payload = req.model_dump()

    file_paths = await download_claim_docs(payload["data"].get("claimDocuments", []))

    prompt_template = load_prompt(payload["scacCode"])
    prompt = prompt_template.format(
        data=json.dumps(req.data, indent=2),
        available_file_paths=file_paths,
    )

    sensitive_data = {
        "username": decrypt_credential(payload["auth"].get("username", "")),
        "password": decrypt_credential(payload["auth"].get("password", "")),
    }

    chrome_proc = None
    llm = ChatGemini(model=AI_MODEL, api_key=GEMINI_API_KEY)

    custom_tools = Tools()
    agent_tools.register(custom_tools)

    try:
        chrome_proc = await start_chrome()
        cdp_url = "http://localhost:9222"
        await connect_playwright(cdp_url)

        agent_tools.playwright_page = playwright_page

        session = BrowserSession(cdp_url=cdp_url)
        agent = Agent(
            task=prompt,
            sensitive_data=sensitive_data,
            browser_session=session,
            llm=llm,
            tools=custom_tools,
            available_file_paths=file_paths,
        )

        result = await asyncio.wait_for(agent.run(), timeout=600)
        return {
            "success": result.is_successful(),
            "output": result.final_result(),
        }

    except asyncio.TimeoutError:
        raise HTTPException(504, "Agent timed out after 600s")
    finally:
        if playwright_browser:
            await playwright_browser.close()
        if chrome_proc:
            chrome_proc.terminate()
            try:
                await asyncio.wait_for(chrome_proc.wait(), 5)
            except TimeoutError:
                chrome_proc.kill()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, workers=1)
