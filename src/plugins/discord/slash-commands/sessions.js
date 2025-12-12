import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { isThreadChannel } from "../utils";

const queueSession = {
  data: new SlashCommandBuilder()
    .setName("queue-session")
    .setDescription("Create a new session thread in the current channel")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Initial message for the session")
        .setRequired(true),
    ),

  async execute(interaction, services) {
    const { sessionService, discordService } = services;

    if (isThreadChannel(interaction.channel)) {
      await interaction.reply({
        content: "This command cannot be used in a thread. Please use it in a regular channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channelId = interaction.channel.id;
    const projectConfig = discordService.getProjectConfigByChannelId({ channelId });

    if (!projectConfig || !projectConfig.projectId) {
      await interaction.editReply({
        content: `This channel is not configured for a project in kanbatte.config.yaml.`,
      });
      return;
    }
    const projectId = projectConfig.projectId;

    const message = interaction.options.getString("message");
    const sessionNumber = await sessionService.getNextSessionNumber({ projectId });
    const sessionId = `${projectId}-${sessionNumber}`;
    const now = Date.now();
    const sessionData = {
      messages: [{ role: "user", content: message, timestamp: now }],
      project: projectId,
      status: "ready",
      createdAt: now,
      updatedAt: now,
    };

    await sessionService.addSession({ sessionId, sessionData });

    const thread = await interaction.channel.threads.create({
      name: `${sessionId}`,
      autoArchiveDuration: 1440,
      reason: `Session: ${sessionId}`,
    });

    await thread.members.add(interaction.user.id);
    await thread.send(`🗨️ User: ${message}`);
    await discordService.addSessionThreadRecord({ sessionId, threadId: thread.id });

    const reply = `Session ${sessionId} created: <#${thread.id}>`;
    console.log(reply);
    await interaction.editReply({ content: reply });
  },
};

const setStatus = {
  data: new SlashCommandBuilder()
    .setName("set-status")
    .setDescription("Set the status of an existing session")
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("New status for the session")
        .setRequired(true)
        .addChoices(
          { name: "Ready", value: "ready" },
          { name: "In Progress", value: "in-progress" },
          { name: "Review", value: "review" },
          { name: "Done", value: "done" }
        ),
    ),

  async execute(interaction, services) {
    const { sessionService, discordService } = services;

    if (!isThreadChannel(interaction.channel)) {
      await interaction.reply({
        content: 'This command can only be used in a thread channel.'
      });
      return;
    }

    const status = interaction.options.getString("status");
    const sessionId = await discordService.getSessionIdByThread({
      threadId: interaction.channel.id,
    });

    if (!sessionId) {
      await interaction.reply({
        content: `No session found for this thread.`
      });
      return;
    }
    
    await sessionService.updateSessionStatus({ sessionId, status });

    await interaction.reply({
      content: `🔄 Session ${sessionId} status updating to: ${status}...`,
    });
  },
};

const requestPR = {
  data: new SlashCommandBuilder()
    .setName("request-pr")
    .setDescription("Append request message to commit changes and create a new pull request"),

  async execute(interaction, services) {
    const { sessionService, discordService } = services;

    if (!isThreadChannel(interaction.channel)) {
      await interaction.reply({
        content: 'This command can only be used in a thread channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sessionId = await discordService.getSessionIdByThread({
      threadId: interaction.channel.id
    });

    if (!sessionId) {
      await interaction.reply({
        content: 'No session found for this thread.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const authorInfo = discordService.getDiscordUserByUserId({ userId: interaction.user.id });
    console.log("Author Info:", authorInfo);
    if (!authorInfo || !authorInfo.name || !authorInfo.email) {
      await interaction.reply({
        content: `Could not find your git author info in kanbatte.config.yaml. Please bind your user first.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const authorPrompt = `Commit author is: ${authorInfo.name} <${authorInfo.email}>.`;
    const prompt = `Save all changes, submit a commit. ${authorPrompt} Do not change git config. Don't add any coauthors and dont mention claude or any AI. Check this branch already exists related Pull Request, if not create a new pr, or just update it. Keep commit message and PR content minimal and simple.`;

    await sessionService.appendSessionMessages({
      sessionId,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }]
    });

    // Automatically set status to ready after request-pr
    await sessionService.updateSessionStatus({ sessionId, status: "ready" });

    await interaction.reply({
      content: `Your commit and PR request has been added to session ${sessionId}. Status set to ready.`,
    });
  }
};


export default {
  "queue-session": queueSession,
  "set-status": setStatus,
  "request-pr": requestPR,
};
