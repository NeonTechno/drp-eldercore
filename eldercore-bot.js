const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
const commands = require('./commands');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const GUILD_ID = process.env.GUILD_ID;

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'mistralai/mistral-large-4-1t-a52b';

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing. Add it to the hosting environment.');
  process.exit(1);
}
if (!NVIDIA_API_KEY) {
  console.warn('⚠️ NVIDIA_API_KEY is missing. ElderCore will start, but AI answers will be unavailable.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const memberXP = {};
const dailyMissions = [
  'Help a newcomer understand DRP',
  'Share a DRP idea in #ideas-feedback',
  'Test a blockchain feature',
  'Write about human rights in tech',
  'Contribute to GitHub discussion'
];

client.once('ready', async () => {
  console.log(`✅ ElderCore is online! Logged in as ${client.user.tag}`);
  console.log(`🤖 AI provider: NVIDIA NIM | Model: ${NVIDIA_MODEL}`);
  client.user.setActivity('DRP Community', { type: ActivityType.Watching });

  // Register guild commands automatically. This uses the bot's application ID,
  // so CLIENT_ID is not required in the hosting environment.
  try {
    await client.application.commands.set(commands, GUILD_ID || undefined);
    console.log(`✅ Registered ${commands.length} slash commands ${GUILD_ID ? `for guild ${GUILD_ID}` : 'globally'}`);
  } catch (error) {
    console.error('❌ Automatic slash-command registration failed:', {
      status: error.status,
      code: error.code,
      message: error.message
    });
  }
});

client.on('guildMemberAdd', async (member) => {
  if (GUILD_ID && member.guild.id !== GUILD_ID) return;
  try {
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#00ff88')
      .setTitle('🌍 Welcome to DRP!')
      .setDescription('Building AI-powered human rights verification.')
      .addFields(
        { name: '📚 Resources', value: '[GitHub](https://github.com/Decentralized-Rights-Protocol/Dr-Blockchain)' },
        { name: '🎯 Get Started', value: 'Use /learn and ask ElderCore a question.' },
        { name: '🏆 Earn XP', value: 'Complete missions and contribute!' }
      );
    await member.send({ embeds: [welcomeEmbed] });
    const role = member.guild.roles.cache.get('1431482088002945264');
    if (role) await member.roles.add(role);
    memberXP[member.id] = memberXP[member.id] || 0;
    console.log(`✅ Welcomed ${member.user.tag}`);
  } catch (error) {
    console.error('Error welcoming member:', error.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const handlers = {
    ping: handlePing,
    learn: handleLearn,
    daily: handleDaily,
    xp: handleXP,
    rank: handleRank,
    verify: handleVerify,
    submit: handleSubmit
  };
  const handler = handlers[interaction.commandName];
  if (!handler) return;
  try {
    await handler(interaction);
  } catch (error) {
    console.error(`Error in /${interaction.commandName}:`, error);
    const payload = { content: '❌ An error occurred. Please try again.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

// In-channel conversational mode: mention @ElderCore and include a question.
// Discord's Message Content privileged intent must be enabled in the Developer Portal.
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || (GUILD_ID && message.guild.id !== GUILD_ID)) return;
  const mentioned = message.mentions.has(client.user);
  const repliedToBot = message.reference?.messageId
    ? await message.channel.messages.fetch(message.reference.messageId)
        .then(original => original.author.id === client.user.id)
        .catch(() => false)
    : false;
  if (!mentioned && !repliedToBot) return;

  const question = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!question) {
    await message.reply('Ask me a question after mentioning me, for example: @ElderCore What is DRP?');
    return;
  }
  if (!NVIDIA_API_KEY) {
    await message.reply('AI answers are not configured. An administrator needs to set NVIDIA_API_KEY in the hosting environment.');
    return;
  }

  await message.channel.sendTyping().catch(() => {});
  try {
    const answer = await askNvidia(question);
    await message.reply(answer.slice(0, 1900));
  } catch (error) {
    console.error('Mention-based NVIDIA request failed:', error.response?.status, error.response?.data || error.message);
    await message.reply('I could not reach my AI service just now. Please try again shortly.');
  }
});

async function askNvidia(question) {
  const response = await axios.post(
    NVIDIA_API_URL,
    {
      model: NVIDIA_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are ElderCore, the AI community assistant for the Decentralized Rights Protocol (DRP). Answer questions clearly and accurately. Explain technical ideas accessibly, support human rights and responsible technology, and distinguish plans from implemented features. Never claim that activity, identity, or rights have been independently verified unless a real verification system confirms it.'
        },
        { role: 'user', content: question }
      ],
      max_tokens: 1200,
      temperature: 0.5,
      stream: false
    },
    {
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 90000
    }
  );
  const answer = response.data?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('NVIDIA returned an empty response');
  return answer.trim();
}

async function handlePing(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#00ff88')
    .setTitle('🏓 Pong!')
    .setDescription('**ElderCore is live** ⚡')
    .addFields(
      { name: 'Bot Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
      { name: 'API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true }
    )
    .setFooter({ text: 'ElderCore | DRP Community Bot' });
  await interaction.reply({ embeds: [embed] });
}

async function handleLearn(interaction) {
  await interaction.deferReply();
  if (!NVIDIA_API_KEY) {
    await interaction.editReply('⚠️ AI is not configured. Ask an administrator to set NVIDIA_API_KEY in the hosting environment.');
    return;
  }
  const question = interaction.options.getString('question', true);
  try {
    const answer = await askNvidia(question);
    const embed = new EmbedBuilder()
      .setColor('#76b900')
      .setTitle('🧠 ElderCore')
      .setDescription(answer.slice(0, 4000))
      .setFooter({ text: 'Powered by NVIDIA NIM · Mistral Large 4' });
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const status = error.response?.status;
    console.error('NVIDIA NIM request failed:', {
      status: status || 'no HTTP response',
      message: error.response?.data?.detail || error.response?.data?.message || error.message
    });
    let userMessage = '❌ ElderCore could not reach its AI provider. Please try again shortly.';
    if (status === 401) userMessage = '❌ NVIDIA rejected the API key. Check NVIDIA_API_KEY in the hosting environment.';
    else if (status === 402) userMessage = '❌ The NVIDIA API account needs available credits or an enabled trial.';
    else if (status === 429) userMessage = '⏳ NVIDIA rate limit reached. Please wait and try again.';
    else if (status === 400 || status === 422) userMessage = '❌ NVIDIA rejected the request. Check the model and request configuration.';
    await interaction.editReply(userMessage);
  }
}

async function handleDaily(interaction) {
  const mission = dailyMissions[Math.floor(Math.random() * dailyMissions.length)];
  const xpReward = Math.floor(Math.random() * 50) + 25;
  const embed = new EmbedBuilder()
    .setColor('#ffaa00')
    .setTitle('🎯 Daily Mission')
    .setDescription(mission)
    .addFields({ name: '⭐ XP Reward', value: `+${xpReward} XP`, inline: true })
    .setFooter({ text: 'Use /verify to submit a self-reported activity.' });
  await interaction.reply({ embeds: [embed] });
}

async function handleXP(interaction) {
  const xp = memberXP[interaction.user.id] || 0;
  const level = Math.floor(xp / 100);
  const levels = ['🌱 Citizen', '🛠️ Builder', '⚡ Validator', '🔮 Elder', '🌍 Ambassador', '🦋 Luminary'];
  const embed = new EmbedBuilder()
    .setColor('#00ff88')
    .setTitle('📊 Your Stats')
    .addFields(
      { name: 'XP', value: String(xp), inline: true },
      { name: 'Level', value: levels[Math.min(level, levels.length - 1)], inline: true }
    );
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRank(interaction) {
  const sorted = Object.entries(memberXP).sort(([, a], [, b]) => b - a).slice(0, 10);
  const description = sorted.map(([id, xp], index) => `${index + 1}. <@${id}> — ${xp} XP`).join('\n') || 'No members yet!';
  const embed = new EmbedBuilder()
    .setColor('#ff00ff')
    .setTitle('🏆 Leaderboard')
    .setDescription(description)
    .setFooter({ text: 'Top 10 | XP is currently stored in memory' });
  await interaction.reply({ embeds: [embed] });
}

async function handleVerify(interaction) {
  const userId = interaction.user.id;
  const activity = interaction.options.getString('activity');
  memberXP[userId] = (memberXP[userId] || 0) + 50;
  const embed = new EmbedBuilder()
    .setColor('#00dd00')
    .setTitle('📝 Activity Submitted')
    .setDescription(`Activity: ${activity}\n\nThis is self-reported, not an independently verified DRP PoAT attestation.`)
    .addFields({ name: 'XP Gained', value: '+50 XP', inline: true });
  await interaction.reply({ embeds: [embed] });
}

async function handleSubmit(interaction) {
  const submission = interaction.options.getString('idea');
  memberXP[interaction.user.id] = (memberXP[interaction.user.id] || 0) + 25;
  const embed = new EmbedBuilder()
    .setColor('#9900ff')
    .setTitle('📝 Idea Submitted!')
    .setDescription(submission.slice(0, 4000))
    .addFields({ name: 'XP Gained', value: '+25 XP', inline: true });
  await interaction.reply({ embeds: [embed] });

  const proposalsChannel = interaction.guild?.channels.cache.get('1431482627218608191');
  if (proposalsChannel?.isTextBased()) {
    const proposalEmbed = new EmbedBuilder()
      .setColor('#9900ff')
      .setTitle('New Proposal')
      .setDescription(submission.slice(0, 4000))
      .setAuthor({ name: interaction.user.username });
    await proposalsChannel.send({ embeds: [proposalEmbed] });
  }
}

client.on('error', error => console.error('Discord client error:', error));
process.on('unhandledRejection', error => console.error('Unhandled promise rejection:', error));

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down ElderCore cleanly.`);
  client.destroy();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

client.login(DISCORD_TOKEN).catch(error => {
  console.error('❌ Discord login failed:', error.message);
  process.exit(1);
});
