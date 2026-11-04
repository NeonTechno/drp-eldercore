# ElderCore — DRP Community Bot

ElderCore is the Discord community bot for the Decentralized Rights Protocol (DRP).

## Runtime configuration

Set these environment variables in your hosting provider (for example, Botkeep):

- `DISCORD_TOKEN` — Discord bot token.
- `NVIDIA_API_KEY` — NVIDIA API key used by the `/learn` command.
- `GUILD_ID` — DRP Discord server ID used to scope the welcome event.

The AI integration uses NVIDIA NIM's OpenAI-compatible chat-completions endpoint and the model:

```text
mistralai/mistral-large-4-1t-a52b
```

The key is read from `NVIDIA_API_KEY`; do not put it in source code, commit it, or share it in chat.

## Commands

- `/ping` — checks the Discord bot response and gateway latency.
- `/learn topic` — explains DRP, blockchain, AI ethics, and human rights using NVIDIA NIM.
- `/daily` — provides a community mission.
- `/xp` — shows the member's current XP and level.
- `/rank` — shows the in-memory XP leaderboard.
- `/verify activity` — accepts a self-reported activity submission.
- `/submit idea` — submits an idea to the configured proposals channel.

## Local setup

Requires Node.js 18 and npm.

```bash
npm install
npm run check
npm start
```

Run `npm run deploy` only when slash commands need to be registered or updated. That command also requires `CLIENT_ID` in the environment.

## Current limitations

- XP and leaderboard data are held in process memory and reset after a restart.
- `/verify` is currently self-reported; it does not independently verify evidence or create a DRP PoAT attestation.
- The welcome-member event requires the Discord application's **Server Members Intent** to be enabled in the Discord Developer Portal. Do not enable the gateway intent in code unless that portal setting is also enabled.
