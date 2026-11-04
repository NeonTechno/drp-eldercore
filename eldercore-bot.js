const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
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
  console.warn('⚠️ NVIDIA_API_KEY is missing. ElderCore will start, but /learn will be unavailable.');
}

// Keep the existing gateway intents to avoid requiring a new privileged intent
// and accidentally preventing the currently active bot from connecting.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// In-memory XP store. XP resets whenever the process restarts; persistence is a future task.
const memberXP = {};

const dailyMissions = [
  'Help a newcomer understand DRP',
  'Share a DRP idea in #ideas-feedback',
  'Test a blockchain feature',
  'Write about human rights in tech',
  'Contribute to GitHub discussion'
];

client.once('ready', () => {
  console.log(`✅ ElderCore is online! Logged in as ${client.user.tag}`);
  console.log(`🤖 AI provider: NVIDIA NIM | Model: ${NVIDIA_MODEL}`);
  client.user.setActivity('DRP Community', { type: ActivityType.Watching });
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
        { name: '🎯 Get Started', value: 'Type `/learn topic:drp`!' },
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
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

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
    await interaction.editReply('⚠️ AI learning is not configured yet. Please ask an administrator to add NVIDIA_API_KEY to the bot hosting environment.');
    return;
  }

  const topic = interaction.options.getString('topic') || 'drp';
  const prompts = {
    drp: 'Explain DRP (Decentralized Rights Protocol) in about 150 words, focusing on AI verification, proof of activity, human rights, and the Sustainable Development Goals.',
    blockchain: 'Explain blockchain for beginners in about 100 words, using a practical example.',
    ai: 'Explain AI ethics in about 100 words, including fairness, transparency, accountability, and human oversight.',
    rights: 'Explain why human rights matter in technology and digital systems in about 100 words.'
  };

  try {
    const response = await axios.post(
      NVIDIA_API_URL,
      {
        model: NVIDIA_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are ElderCore, the AI learning companion for the Decentralized Rights Protocol community. Be accurate, accessible, constructive, and encouraging. Do not claim that an activity or identity has been verified unless a real verification system has confirmed it.'
          },
          { role: 'user', content: prompts[topic] || prompts.drp }
        ],
        max_tokens: 1200,
        temperature: 0.5,
        stream: false,
        reasoning_effort: 'none'
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

    const content = response.data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('NVIDIA returned an empty or unexpected response.');
    }

    const embed = new EmbedBuilder()
      .setColor('#76b900')
      .setTitle(`📖 Learn: ${topic.toUpperCase()}`)
      .setDescription(content.trim().slice(0, 4000))
      .setFooter({ text: 'ElderCore | Powered by NVIDIA NIM · Mistral Large 4' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const status = error.response?.status;
    const providerMessage = error.response?.data?.detail || error.response?.data?.message;
    console.error('NVIDIA NIM request failed:', {
      status: status || 'no HTTP response',
      message: providerMessage || error.message
    });

    let userMessage = '❌ ElderCore could not reach its AI provider. Please try again shortly.';
    if (status === 401) userMessage = '❌ NVIDIA rejected the API key. Check the NVIDIA_API_KEY secret in the hosting environment.';
    else if (status === 402) userMessage = '❌ The NVIDIA API account needs available credits or an enabled trial.';
    else if (status === 429) userMessage = '⏳ NVIDIA rate limit reached. Please wait a moment and try again.';
    else if (status === 400 || status === 422) userMessage = '❌ NVIDIA rejected the request. Check the model configuration and hosting logs.';

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
    .setFooter({ text: 'Use /verify to submit an activity (self-reported, not independently verified).' });

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
  const sorted = Object.entries(memberXP)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const description = sorted
    .map(([id, xp], index) => `${index + 1}. <@${id}> — ${xp} XP`)
    .join('\n') || 'No members yet!';

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
    .setDescription(`Activity: ${activity}\n\nThis is a self-reported submission, not an independently verified DRP PoAT attestation.`)
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

client.on('error', (error) => console.error('Discord client error:', error));
process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error));

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down ElderCore cleanly.`);
  client.destroy();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('❌ Discord login failed:', error.message);
  process.exit(1);
});
