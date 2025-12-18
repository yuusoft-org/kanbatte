import {
  Client,
  Events,
  GatewayIntentBits,
  RESTJSONErrorCodes,
} from "discord.js";
import { isThreadChannel, isMemberAllowed } from "./utils";
import { createCommandsCollection } from "./slash-commands/index.js";
import { createStartCommands } from "./commands/start.js";

const token = process.env.DISCORD_BOT_TOKEN;

export const startDiscordBot = (services) => {
  if (!token) {
    console.error("Error: Missing DISCORD_BOT_TOKEN environment variable");
    process.exit(1);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.services = services;

  client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const startCommands = createStartCommands({ ...services, client });

    let currentOffsetId = await startCommands.initializeOffset();

    while (true) {
      currentOffsetId = await startCommands.discordStartLoop(currentOffsetId);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });

  // Load all slash commands from the centralized location
  client.commands = createCommandsCollection();

  console.log(
    "Commands loaded:",
    client.commands.map((cmd) => cmd.data.name),
  );

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!isThreadChannel(message.channel)) return;

    const { discordService } = message.client.services;
    const roles =
      discordService.getAllowedRolesByGuildId({ guildId: message.guild.id }) ||
      [];
    if (!isMemberAllowed(message.member, roles)) {
      await message.reply(
        "❌ You don't have permission to interact in this thread.",
      );
      return;
    }

    if (message.mentions.has(client.user)) {
      try {
        const { sessionService, discordService } = message.client.services;
        const sessionId = await discordService.getSessionIdByThread({
          threadId: message.channel.id,
        });
        const messageContent = message.content.replace(/<@!?\d+>/g, "").trim();

        if (!sessionId) {
          await message.reply(
            "Could not find a Kanbatte session associated with this thread.",
          );
          return;
        }

        if (!messageContent) {
          await message.reply(
            "Please provide a message along with the mention.",
          );
          return;
        }

        await sessionService.appendSessionMessages({
          sessionId,
          messages: [{ role: "user", content: messageContent }],
        });

        await sessionService.updateSessionStatus({
          sessionId,
          status: "ready",
        });

        await message.reply(
          `Your message has been appended to session ${sessionId}.`,
        );
      } catch (error) {
        console.error("Error:", error);
        await message.reply(
          "There was an error processing your message. Please try again.",
        );
      }
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;
      try {
        await command.autocomplete(interaction, interaction.client.services);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }
    try {
      const { discordService } = interaction.client.services;
      const roles =
        discordService.getAllowedRolesByGuildId({
          guildId: interaction.guild.id,
        }) || [];
      if (!isMemberAllowed(interaction.member, roles)) {
        await interaction.reply({
          content: "❌ You don't have permission to use this command.",
        });
        return;
      }
      await command.execute(interaction, interaction.client.services);
    } catch (error) {
      console.error(error);
      if (error.code === RESTJSONErrorCodes.UnknownInteraction) {
        console.warn("Interaction has expired, skipping reply.");
        return;
      }
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
        });
      }
    }
  });

  client.login(token);
};
