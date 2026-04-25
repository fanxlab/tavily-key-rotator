import { execSync } from "child_process";
import { resolve } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

const ROTATOR_SCRIPT = resolve(
  process.env.HOME,
  ".openclaw/workspace-feynman/scripts/tavily_key_rotator.sh"
);

const KEYS_FILE = resolve(process.env.HOME, ".openclaw/tavily-keys.json");

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

function ensureKeysFile() {
  if (existsSync(KEYS_FILE)) return;

  const currentKey = (() => {
    try {
      const cfg = JSON.parse(readFileSync(
        resolve(process.env.HOME, ".openclaw/openclaw.json"), "utf-8"
      ));
      return cfg?.plugins?.entries?.tavily?.config?.webSearch?.apiKey || "";
    } catch {
      return "";
    }
  })();

  const template = {
    current: currentKey,
    pool: currentKey ? [currentKey] : []
  };

  try {
    writeFileSync(KEYS_FILE, JSON.stringify(template, null, 2), "utf-8");
    console.log(`[tavily-key-rotator] Created ${KEYS_FILE} — please add your backup API keys to the "pool" array`);
  } catch (e) {
    console.warn(`[tavily-key-rotator] Could not create keys file: ${e.message}`);
  }
}

function rotateKey(errorOutput) {
  try {
    const result = execSync(`bash "${ROTATOR_SCRIPT}" '${String(errorOutput).replace(/'/g, "'\\''")}'`, {
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
      if (!isTavilyTool(event.toolName)) return;

      const errorStr = event.error ? String(event.error) : "";
      if (!errorStr) return;

      if (!isRateLimitError(errorStr)) return;

      console.log(`[tavily-key-rotator] Rate limit detected for ${event.toolName}, rotating key...`);

      // Ensure keys file exists before attempting rotation
      ensureKeysFile();

      const rotated = rotateKey(errorStr);
      if (rotated) {
        console.log("[tavily-key-rotator] Key rotated. Next Tavily call will use new key.");
      } else {
        console.warn("[tavily-key-rotator] Rotation failed. Check ~/.openclaw/tavily-keys.json");
      }
    });
  },
};

export default plugin;
