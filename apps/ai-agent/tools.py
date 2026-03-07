"""
Custom Playwright tools for the FreightClaims AI Agent.

These tools handle actions that the default browser-use agent can't do well
on its own, like precise file uploads, dropdown selections, and waiting for
specific page states.

Location: apps/ai-agent/tools.py
Related: apps/ai-agent/app.py (registers these tools)
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Shared Playwright page handle -- set by app.py after connecting to Chrome
playwright_page = None


def register(tools):
    """Register all custom tools with the browser-use Tools instance."""

    @tools.action("Upload a file to a file input on the page")
    async def upload_file(selector: str, file_path: str):
        """Uploads a local file to the specified file input element."""
        if not playwright_page:
            return "Error: Playwright page not available"
        try:
            file_input = await playwright_page.query_selector(selector)
            if not file_input:
                return f"Error: Could not find element with selector '{selector}'"
            await file_input.set_input_files(file_path)
            return f"Successfully uploaded {file_path}"
        except Exception as exc:
            logger.exception(f"File upload failed: {exc}")
            return f"Error uploading file: {exc}"

    @tools.action("Wait for a specific element to appear on the page")
    async def wait_for_element(selector: str, timeout_ms: int = 30000):
        """Waits for an element matching the selector to appear in the DOM."""
        if not playwright_page:
            return "Error: Playwright page not available"
        try:
            await playwright_page.wait_for_selector(selector, timeout=timeout_ms)
            return f"Element '{selector}' found"
        except Exception as exc:
            return f"Timed out waiting for '{selector}': {exc}"

    @tools.action("Select a value from a dropdown by its visible text")
    async def select_dropdown(selector: str, value: str):
        """Selects an option from a <select> element by visible label text."""
        if not playwright_page:
            return "Error: Playwright page not available"
        try:
            await playwright_page.select_option(selector, label=value)
            return f"Selected '{value}' in dropdown"
        except Exception as exc:
            return f"Error selecting dropdown: {exc}"

    @tools.action("Get the current page URL")
    async def get_current_url():
        """Returns the current page URL for navigation verification."""
        if not playwright_page:
            return "Error: Playwright page not available"
        return playwright_page.url

    @tools.action("Take a screenshot of the current page")
    async def take_screenshot(path: str = "/tmp/screenshot.png"):
        """Captures a screenshot for debugging or verification."""
        if not playwright_page:
            return "Error: Playwright page not available"
        try:
            await playwright_page.screenshot(path=path, full_page=True)
            return f"Screenshot saved to {path}"
        except Exception as exc:
            return f"Error taking screenshot: {exc}"
