const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GUILD_ID = process.env.GUILD_ID;

// In-memory XP store (replace with DB for persistence)
let memberXP = {};

const dailyMissions = [
  "Help a newcomer understand DRP",
  "Share a DRP idea in #ideas-feedback",
  "Test a blockchain feature",
  "Write about human rights in tech",
  "Contribute to GitHub discussion"
];

client.once('ready', () => {
  console.log(`✅ ElderCore is online! Logged in as ${client.user.tag}`);
  // FIX: Use ActivityType enum (discord.js v14 requirement)
  client.user.setActivity('DRP Community', { type: ActivityType.Watching });
});

client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== GUILD_ID) return;
  try {
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#00ff88')
      .setTitle('🌍 Welcome to DRP!')
      .setDescription('Building AI powered human rights verification.')
      .addFields(
        { name: '📚 Resources', value: '[GitHub](https://github.com/Decentralized-Rights-Protocol/Dr-Blockchain)' },
        { name: '🎯 Get Started', value: 'Type `/learn topic:drp`!' },
        { name: '🏆 Earn XP', value: 'Complete missions and contribute!' }
      );
    await member.send({ embeds: [welcomeEmbed] });
    const roleId = '1431482088002945264';
    const role = member.guild.roles.cache.get(roleId);
    if (role) await member.roles.add(role);
    memberXP[member.id] = 0;
    console.log(`✅ Welcomed ${member.user.tag}`);
  } catch (error) {
    console.error('Error welcoming member:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName } = interaction;
  try {
    switch (commandName) {
      case 'ping':   await handlePing(interaction);   break;
      case 'learn':  await handleLearn(interaction);  break;
      case 'daily':  await handleDaily(interaction);  break;
      case 'xp':     await handleXP(interaction);     break;
      case 'rank':   await handleRank(interaction);   break;
      case 'verify': await handleVerify(interaction); break;
      case 'submit': await handleSubmit(interaction); break;
    }
  } catch (error) {
    console.error(`Error in /${commandName}:`, error);
    const reply = { content: '❌ An error occurred. Please try again.', ephemeral: true };
    if (interaction.deferred) await interaction.editReply(reply);
    else await interaction.reply(reply);
  }
});

// /ping
async function handlePing(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#00ff88')
    .setTitle('🏓 Pong!')
    .setDescription('**Eldercore is live** ⚡')
    .addFields(
      { name: 'Bot Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
      { name: 'API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true }
    )
    .setFooter({ text: 'ElderCore | DRP Community Bot' });
  await interaction.reply({ embeds: [embed] });
}

// /learn
async function handleLearn(interaction) {
  await interaction.deferReply();
  const topic = interaction.options.getString('topic');
  const prompts = {
    drp: "Explain DRP (Decentralized Rights Protocol) in 150 words focusing on AI verification, proof of activity, human rights, and SDGs.",
    blockchain: "Explain blockchain for beginners in 100 words.",
    ai: "Explain AI ethics in 100 words.",
    rights: "Why are human rights important? 100 words."
  };
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are ElderCore, AI advisor for DRP. Be helpful and encouraging.' },
        { role: 'user', content: prompts[topic] || prompts.drp }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
    });
    const content = response.data.choices[0].message.content;
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`📖 Learn: ${topic ? topic.toUpperCase() : 'DRP'}`)
      .setDescription(content)
      .setFooter({ text: 'ElderCore | Powered by OpenAI' });
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('OpenAI error:', error.message);
    await interaction.editReply('❌ Failed to fetch learning content. Check OPENAI_API_KEY.');
  }
}

// /daily
async function handleDaily(interaction) {
  const mission = dailyMissions[Math.floor(Math.random() * dailyMissions.length)];
  const xpReward = Math.floor(Math.random() * 50) + 25;
  const embed = new EmbedBuilder()
    .setColor('#ffaa00')
    .setTitle('🎯 Daily Mission')
    .setDescription(mission)
    .addFields({ name: '⭐ XP Reward', value: `+${xpReward} XP`, inline: true })
    .setFooter({ text: 'Use /verify to claim!' });
  await interaction.reply({ embeds: [embed] });
}

// /xp
async function handleXP(interaction) {
  const userId = interaction.user.id;
  const xp = memberXP[userId] || 0;
  const level = Math.floor(xp / 100);
  const levels = ['🌱 Citizen', '🛠️ Builder', '⚡ Validator', '🔮 Elder', '🌍 Ambassador', '🦋 Luminary'];
  const embed = new EmbedBuilder()
    .setColor('#00ff88')
    .setTitle('📊 Your Stats')
    .addFields(
      { name: 'XP', value: `${xp}`, inline: true },
      { name: 'Level', value: levels[Math.min(level, 5)], inline: true }
    );
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// /rank
async function handleRank(interaction) {
  const sorted = Object.entries(memberXP).sort(([, a], [, b]) => b - a).slice(0, 10);
  const desc = sorted.map(([id, xp], i) => `${i + 1}. <@${id}> — ${xp} XP`).join('\n') || 'No members yet!';
  const embed = new EmbedBuilder()
    .setColor('#ff00ff')
    .setTitle('🏆 Leaderboard')
    .setDescription(desc)
    .setFooter({ text: 'Top 10' });
  await interaction.reply({ embeds: [embed] });
}

// /verify — FIX: was corrupted (bad addFields, broken async keyword)
async function handleVerify(interaction) {
  const userId = interaction.user.id;
  const activity = interaction.options.getString('activity');
  memberXP[userId] = (memberXP[userId] || 0) + 50;
  const embed = new EmbedBuilder()
    .setColor('#00dd00')
    .setTitle('✅ Activity Verified!')
    .setDescription(`Activity: ${activity}`)
    .addFields({ name: 'XP Gained', value: '+50 XP', inline: true });
  await interaction.reply({ embeds: [embed] });
}

// /submit
async function handleSubmit(interaction) {
  const userId = interaction.user.id;
  const submission = interaction.options.getString('idea');
  memberXP[userId] = (memberXP[userId] || 0) + 25;
  const embed = new EmbedBuilder()
    .setColor('#9900ff')
    .setTitle('📝 Idea Submitted!')
    .setDescription(submission)
    .addFields({ name: 'XP Gained', value: '+25 XP', inline: true });
  await interaction.reply({ embeds: [embed] });
  const proposalsChannel = interaction.guild.channels.cache.get('1431482627218608191');
  if (proposalsChannel) {
    const proposalEmbed = new EmbedBuilder()
      .setColor('#9900ff')
      .setTitle('New Proposal')
      .setDescription(submission)
      .setAuthor({ name: interaction.user.username });
    await proposalsChannel.send({ embeds: [proposalEmbed] });
  }
}

process.on('SIGTERM', () => { client.destroy(); process.exit(0); });
process.on('SIGINT',  () => { client.destroy(); process.exit(0); });

client.login(DISCORD_TOKEN);
