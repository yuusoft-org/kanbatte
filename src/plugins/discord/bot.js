// minimal-discord-bot.js
import { Client, Collection, Events, GatewayIntentBits, MessageFlags, ChannelType } from 'discord.js';
import * as sessionsSlashCommands from "./slash-commands/sessions";
import { createMainInsiemeDao } from '../../deps/mainDao';
import { createDiscordInsiemeDao } from './deps/discordDao';
import { appendSessionMessages } from '../../commands/session';

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

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const commands = {
  ...sessionsSlashCommands.default,
};

client.commands = new Collection(Object.entries(commands));

console.log("Commands loaded:", client.commands.map(cmd => cmd.data.name));

client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages to avoid loops
  if (message.author.bot) return;

  const isThread = message.channel.type === ChannelType.PublicThread ||
    message.channel.type === ChannelType.PrivateThread ||
    message.channel.type === ChannelType.AnnouncementThread;

  if (!isThread) return;

  if (message.mentions.has(client.user)) {
    try {
      const insiemeDao = await createMainInsiemeDao();
      const discordInsiemeDao = await createDiscordInsiemeDao();
      const sessionId = await discordInsiemeDao.getSessionIdByThread({ threadId: message.channel.id });
      const messageContent = message.content.replace(/<@!?(\d+)>/, '').trim();
      await appendSessionMessages({ insiemeDao }, { sessionId, messages: `[{"role": "user","content": "${messageContent}"}]` });
      await message.reply(`Your message has been appended to session ${sessionId}.`);
    } catch (error) {
      console.error('Error:', error);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

client.login(token);
