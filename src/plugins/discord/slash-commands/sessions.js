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
    const project = await discordService.getProjectIdByChannel({ channelId });

    // if (!project) {
    //   await interaction.editReply({
    //     content: `This channel is not configured for a project. Use the \`discord channel add\` command.`,
    //   });
    //   return;
    // }

    const message = interaction.options.getString("message");
    const sessionNumber = await sessionService.getNextSessionNumber({ projectId: project });
    const sessionId = `${project}-${sessionNumber}`;
    const now = Date.now();
    const sessionData = {
      messages: [{ role: "user", content: message, timestamp: now }],
      project: project,
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
        content: 'This command can only be used in a thread channel.',
        ephemeral: true,
      });
      return;
    }

    const status = interaction.options.getString("status");
    const sessionId = await discordService.getSessionIdByThread({
      threadId: interaction.channel.id,
    });

    if (!sessionId) {
      await interaction.reply({
        content: `No session found for this thread.`,
        ephemeral: true,
      });
      return;
    }
    
    await sessionService.updateSessionStatus({ sessionId, status });

    await interaction.reply({
      content: `🔄 Session ${sessionId} status updating to: ${status}...`,
    });
  },
};

export default {
  "queue-session": queueSession,
  "set-status": setStatus,
};
