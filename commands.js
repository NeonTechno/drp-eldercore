const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if ElderCore is live'),

  new SlashCommandBuilder()
    .setName('learn')
    .setDescription('Ask ElderCore an AI-powered question')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Ask anything about DRP, technology, or human rights')
        .setRequired(true)
        .setMaxLength(1000)
    ),

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
    .setDescription('Submit a self-reported activity')
    .addStringOption(option =>
      option.setName('activity')
        .setDescription('Describe what you did')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit a DRP idea or proposal')
    .addStringOption(option =>
      option.setName('idea')
        .setDescription('Your idea or proposal')
        .setRequired(true)
    )
].map(command => command.toJSON());

module.exports = commands;
