// minimal-discord-bot.js
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { isThreadChannel, isMemberAllowed } from './utils';
import * as sessionsSlashCommands from "./slash-commands/sessions";
import { createMainInsiemeDao } from '../../deps/mainDao';
import { createDiscordInsiemeDao, createDiscordStore } from './deps/discordDao';
import { appendSessionMessages } from '../../commands/session';
import { discordStartLoop, initializeOffset } from './commands/start';

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error('Error: Missing DISCORD_BOT_TOKEN environment variable');
  process.exit(1);
}

export const startDiscordBot = () => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const discordStore = await createDiscordStore();
    const mainInsiemeDao = await createMainInsiemeDao();
    const discordInsiemeDao = await createDiscordInsiemeDao();

    let currentOffsetId = await initializeOffset({ discordStore });

    while (true) {
      currentOffsetId = await discordStartLoop({
        mainInsiemeDao,
        discordStore,
        discordInsiemeDao,
        client
      }, { currentOffsetId });
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  });

  const commands = {
    ...sessionsSlashCommands.default,
  };

  client.commands = new Collection(Object.entries(commands));

  console.log("Commands loaded:", client.commands.map(cmd => cmd.data.name));

  client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages to avoid loops
    if (message.author.bot) return;

    const isThread = isThreadChannel(message.channel);

    if (!isThread) return;

    // reject if member roles is not cached
    const discordStore = await createDiscordStore();
    const roles = await discordStore.get("allowedRoleIds") || [];
    if (!isMemberAllowed(message.member, roles)) {
      await message.reply("❌ You don't have permission to interact in this thread.");
      return;
    }

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
      // reject if member roles is not cached
      const discordStore = await createDiscordStore();
      const roles = await discordStore.get("allowedRoleIds") || [];
      if (!isMemberAllowed(interaction.member, roles)) {
        await interaction.reply({
          content: "❌ You don't have permission to use this command.",
        });
        return;
      }
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
        });
      }
    }
  });

  client.login(token);
}
