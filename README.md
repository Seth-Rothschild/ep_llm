# ep_llm

An LLM feedback plugin for [Etherpad](https://etherpad.org/). Adds a **SEND** button to the toolbar that sends selected text (or the full document if nothing is selected) to a configurable LLM endpoint and displays the response in a sidebar panel.

## Features

- **Toolbar button** — click SEND to request feedback on the current selection
- **Full-document fallback** — if no text is selected, the entire document is sent
- **Configurable backend** — point the plugin at any OpenAI-compatible API via environment variables
- **Response panel** — feedback appears in a floating panel without leaving the pad

## Configuration

Set these environment variables before starting Etherpad:

| Variable | Required | Description |
|---|---|---|
| `LLM_API_KEY` | Yes | API key sent as a Bearer token |
| `LLM_API_ENDPOINT` | No | Chat completions URL (default: `https://api.openai.com/v1/chat/completions`) |
| `LLM_MODEL` | No | Model name (default: `gpt-4o-mini`) |

The endpoint must accept the [OpenAI chat completions format](https://platform.openai.com/docs/api-reference/chat).

## Installation

From your Etherpad directory run

```
pnpm run plugins install ep_llm
```

## License

GPL-3.0
