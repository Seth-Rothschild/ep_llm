# ep_llm
[![GitHub](https://img.shields.io/badge/github-Seth--Rothschild%2Fep__llm-blue?logo=github)](https://github.com/Seth-Rothschild/ep_llm)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue)](https://www.gnu.org/licenses/agpl-3.0)

An LLM feedback plugin for [Etherpad](https://etherpad.org/). In the same way you might talk to a [rubber duck](https://en.wikipedia.org/wiki/Rubber_duck_debugging), you can get feedback from an LLM that is intended to help you think through your structure and phrasing.

This plugin is mostly vibe coded. Feel free to modify it to suit your own needs.

## Configuration

Set these environment variables before starting Etherpad:

| Variable | Required | Description |
|---|---|---|
| `LLM_API_KEY` | Yes | API key sent as a Bearer token |
| `LLM_API_ENDPOINT` | No | Chat completions URL (default: `https://api.openai.com/v1/chat/completions`) |
| `LLM_MODEL` | No | Model name (default: `gpt-4o-mini`) |

Make sure your `LLM_API_ENDPOINT` follows the [OpenAI chat completions format](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

## Installation

From your Etherpad directory run

```
pnpm run plugins install ep_llm
```

## License

AGPL-3.0
