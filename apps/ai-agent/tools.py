"""
Custom Playwright tools for the FreightClaims AI Agent.

These tools handle actions that the default browser-use agent can't do well
on its own, like precise file uploads, dropdown selections, and waiting for
specific page states.

Location: apps/ai-agent/tools.py
Related: apps/ai-agent/app.py (registers these tools)
"""
import logging
from browser_use import ActionResult

logger = logging.getLogger(__name__)

playwright_page = None


def register(tools):
    """Register all custom tools with the browser-use Tools instance."""

    @tools.action(description="Upload a file to a file input on the page")
    async def upload_file(selector: str, file_path: str) -> ActionResult:
        if not playwright_page:
            return ActionResult(extracted_content="Error: Playwright page not available")
        try:
            file_input = await playwright_page.query_selector(selector)
            if not file_input:
                return ActionResult(extracted_content=f"Error: Could not find element with selector '{selector}'")
            await file_input.set_input_files(file_path)
            return ActionResult(extracted_content=f"Successfully uploaded {file_path}")
        except Exception as exc:
            logger.exception(f"File upload failed: {exc}")
            return ActionResult(extracted_content=f"Error uploading file: {exc}")

    @tools.action(description="Wait for a specific element to appear on the page")
    async def wait_for_element(selector: str, timeout_ms: int = 30000) -> ActionResult:
        if not playwright_page:
            return ActionResult(extracted_content="Error: Playwright page not available")
        try:
            await playwright_page.wait_for_selector(selector, timeout=timeout_ms)
            return ActionResult(extracted_content=f"Element '{selector}' found")
        except Exception as exc:
            return ActionResult(extracted_content=f"Timed out waiting for '{selector}': {exc}")

    @tools.action(description="Select a value from a dropdown by its visible text")
    async def select_dropdown(selector: str, value: str) -> ActionResult:
        if not playwright_page:
            return ActionResult(extracted_content="Error: Playwright page not available")
        try:
            await playwright_page.select_option(selector, label=value)
            return ActionResult(extracted_content=f"Selected '{value}' in dropdown")
        except Exception as exc:
            return ActionResult(extracted_content=f"Error selecting dropdown: {exc}")

    @tools.action(description="Get the current page URL")
    async def get_current_url() -> ActionResult:
        if not playwright_page:
            return ActionResult(extracted_content="Error: Playwright page not available")
        return ActionResult(extracted_content=playwright_page.url)

    @tools.action(description="Take a screenshot of the current page")
    async def take_screenshot(path: str = "/tmp/screenshot.png") -> ActionResult:
        if not playwright_page:
            return ActionResult(extracted_content="Error: Playwright page not available")
        try:
            await playwright_page.screenshot(path=path, full_page=True)
            return ActionResult(extracted_content=f"Screenshot saved to {path}")
        except Exception as exc:
            return ActionResult(extracted_content=f"Error taking screenshot: {exc}")
