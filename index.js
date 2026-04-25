import { execSync } from "child_process";
import { resolve } from "path";

const ROTATOR_SCRIPT = resolve(
  process.env.HOME,
  ".openclaw/workspace-feynman/scripts/tavily_key_rotator.sh"
);

function isRateLimitError(error) {
  if (!error) return false;
  const errStr = String(error).toLowerCase();
  return (
    errStr.includes("429") ||
    errStr.includes("quota") ||
    errStr.includes("rate limit") ||
    errStr.includes("exceeded")
  );
}

function isTavilyTool(toolName) {
  if (!toolName) return false;
  const name = toolName.toLowerCase();
  return (
    name.includes("tavily") ||
    name.includes("web_search") ||
    name.includes("websearch") ||
    name.includes("search")
  );
}

function rotateKey(errorOutput) {
  try {
    const result = execSync(`bash "${ROTATOR_SCRIPT}" '${errorOutput.replace(/'/g, "'\\''")}'`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    return result.includes("Rotated:");
  } catch (e) {
    return false;
  }
}

const plugin = {
  register(api) {
    api.on("after_tool_call", async (event) => {
      // Only handle Tavily/search tools
      if (!isTavilyTool(event.toolName)) return;

      // Check if there was an error
      const errorStr = event.error ? String(event.error) : "";
      if (!errorStr) return;

      // Check if it's a rate limit error
      if (!isRateLimitError(errorStr)) return;

      console.log(`[tavily-key-rotator] Rate limit detected for ${event.toolName}, rotating key...`);

      const rotated = rotateKey(errorStr);
      if (rotated) {
        console.log("[tavily-key-rotator] Key rotated successfully. Next Tavily call will use new key.");
      } else {
        console.log("[tavily-key-rotator] Key rotation failed or no more keys available.");
      }
    });
  },
};

export default plugin;
