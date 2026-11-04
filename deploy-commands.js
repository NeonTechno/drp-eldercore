// Manually register slash commands if needed: npm run deploy
// The bot also registers its guild commands automatically at startup.
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const commands = require('./commands');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID. Automatic registration at bot startup does not need CLIENT_ID.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`Registered ${commands.length} guild slash commands in ${GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log(`Registered ${commands.length} global slash commands`);
    }
  } catch (error) {
    console.error('Slash-command registration failed:', error);
    process.exit(1);
  }
})();
