# Tavily Key Rotator

Auto-rotates Tavily API keys on 429 rate limit errors for OpenClaw.

## What it does

When Tavily returns a 429 (rate limit) error, this plugin automatically rotates to the next available API key and retries, ensuring uninterrupted web search functionality.

## Configuration

The plugin reads key pool from `~/.openclaw/tavily-keys.json`:

```json
{
  "current": "tvly-dev-xxx",
  "pool": [
    "tvly-dev-xxx",
    "tvly-dev-yyy",
    "tvly-dev-zzz"
  ]
}
```

Update the `openclaw.json` to point to the current key after rotation (handled automatically by the rotator script).

## Usage

Once installed and enabled, the plugin operates automatically. No manual intervention is required when rate limits are encountered.
