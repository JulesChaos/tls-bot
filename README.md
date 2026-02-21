# Discord Bot Setup Guide

## 1. Create a Discord Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and give it a name.
3. Go to the **Bot** tab and click **Add Bot**.
4. Under **Privileged Gateway Intents**, enable ALL intents (Presence, Server Members, Message Content).
5. Copy the **Token** and paste it into the `.env` file where it says `active_token_here`.

## 2. Invite the Bot
1. Go to the **OAuth2** tab -> **URL Generator**.
2. Select scopes: `bot`, `applications.commands`.
3. Select permissions: `Administrator` (easiest for setup) or manually select: `Manage Roles`, `Manage Channels`, `Kick Members`, `Moderate Members`, `Send Messages`, `Embed Links`, `Attach Files`.
4. Copy the generated URL and open it in your browser to invite the bot to your server.

## 3. Configuration
- Open `config.json` to change role names, channel names, or the banner URL.
- Open `.env` and fill in:
  - `DISCORD_TOKEN`: Your bot token.
  - `CLIENT_ID`: Your application ID (from General Information tab).
  - `GUILD_ID`: (Optional) Right-click your server icon -> Copy ID. If left blank, it will try to setup every server it joins.

## 4. Run the Bot
1. Open a terminal in this folder.
2. Run: `npm start` (or `node index.js`).
3. The bot should log in and start creating channels/roles immediately!

## Features
- **Auto-Setup**: Run the bot, and it automatically creates:
  - Roles: `Besucher`, `Verified`, `Moderator`
  - Channels: `welcome`, `verify`, `tickets`, `chat`, `media`, `bot-commands`, `suggestions`, `giveaway`
- **Verification**: Click "Verify" in the `#verify` channel to get the `Verified` role.
- **Tickets**: Click "Buy / Open Ticket" in `#tickets` to create a private channel.
- **Anti-Spam**: Users sending >5 messages in 5 seconds get timed out for 1 minute.

## Troubleshooting

### "Invalid OAuth2 Redirect / Code Grant"
If you see an error about **"Code Grant"** when inviting the bot:
1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Click the **Bot** tab.
3.  Scroll down to **Authorization Flow**.
4.  **UNCHECK** the box that says **"Requires OAuth2 Code Grant"**.
5.  Save Changes and try the invite link again.

### "Used disallowed intents"
If the bot crashes with this error:
1.  Go to the **Bot** tab in Developer Portal.
2.  Enable **ALL** Privileged Gateway Intents (Presence, Server Members, Message Content).
3.  Save Changes.
