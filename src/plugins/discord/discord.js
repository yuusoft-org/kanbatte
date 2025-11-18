// minimal-discord-bot.js
import { Client, GatewayIntentBits } from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error('Error: Missing DISCORD_BOT_TOKEN environment variable');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Simple echo: reply with exactly what the user sent
client.on('messageCreate', async (message) => {
  // Ignore bot messages to avoid loops
  if (message.author.bot) return;

  await message.reply(message.content);
});

client.login(token);
