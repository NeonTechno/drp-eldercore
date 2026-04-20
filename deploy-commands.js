// deploy-commands.js — Run ONCE to register slash commands with Discord
// Usage: node deploy-commands.js
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if ElderCore is live'),

  new SlashCommandBuilder()
    .setName('learn')
    .setDescription('Learn about DRP topics powered by AI')
    .addStringOption(opt =>
      opt.setName('topic')
         .setDescription('Topic to learn about')
         .setRequired(true)
         .addChoices(
           { name: 'DRP', value: 'drp' },
           { name: 'Blockchain', value: 'blockchain' },
           { name: 'AI Ethics', value: 'ai' },
           { name: 'Human Rights', value: 'rights' }
         )),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Get your daily mission'),

  new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Check your XP and level'),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View the community leaderboard'),

  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify an activity to earn XP')
    .addStringOption(opt =>
      opt.setName('activity')
         .setDescription('Describe what you did')
         .setRequired(true)),

  new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit a DRP idea or proposal')
    .addStringOption(opt =>
      opt.setName('idea')
         .setDescription('Your idea or proposal')
         .setRequired(true)),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const CLIENT_ID = process.env.CLIENT_ID;
    const GUILD_ID  = process.env.GUILD_ID;
    if (!CLIENT_ID) { console.error('❌ CLIENT_ID missing from .env'); process.exit(1); }
    console.log(`🔄 Registering ${commands.length} slash commands...`);
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✅ Registered ${commands.length} guild commands for guild ${GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log(`✅ Registered ${commands.length} global commands (may take up to 1h)`);
    }
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
})();
