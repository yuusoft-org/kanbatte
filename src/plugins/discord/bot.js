import { Client, Collection, Events, GatewayIntentBits, MessageFlags, ChannelType } from 'discord.js';
import * as sessionsSlashCommands from "./slash-commands/sessions.js";

export const startDiscordBot = async (deps) => {
  const { sessionService, discordService } = deps;

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

  const commands = { ...sessionsSlashCommands.default };
  client.commands = new Collection(Object.entries(commands));
  console.log("Commands loaded:", client.commands.map(cmd => cmd.data.name));

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const isThread = message.channel.type === ChannelType.PublicThread ||
      message.channel.type === ChannelType.PrivateThread ||
      message.channel.type === ChannelType.AnnouncementThread;

    if (!isThread || !message.mentions.has(client.user)) return;

    try {
      const sessionId = await discordService.getSessionIdByThread({ threadId: message.channel.id });
      const messageContent = message.content.replace(/<@!?(\d+)>/, '').trim();
      await sessionService.appendSessionMessages({ sessionId, messages: [{ role: "user", content: messageContent }] });
      await message.reply(`Your message has been appended to session ${sessionId}.`);
    } catch (error) {
      console.error('Error:', error);
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
      const replyOptions = {
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
  });

  client.login(token);
};