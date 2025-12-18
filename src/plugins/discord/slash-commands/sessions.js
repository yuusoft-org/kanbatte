import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { isThreadChannel } from "../utils";
import { getWorktreePath } from "../../../utils/git.js";

const queueSession = {
  data: new SlashCommandBuilder()
    .setName("queue-session")
    .setDescription("Create a new session thread in the current channel")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Initial message for the session")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("prompt-preset")
        .setDescription("The agent persona to use (e.g., software-engineer)")
        .setRequired(false)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction, services) {
    const { configService } = services;
    const focusedValue = interaction.options.getFocused();
    const presets = configService.getPromptPresets();
    const filtered = presets.filter((choice) => choice.name.startsWith(focusedValue));
    await interaction.respond(
      filtered.map((choice) => ({ name: choice.name, value: choice.value })),
    );
  },

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
    const presetName = interaction.options.getString("prompt-preset");

    const sessionNumber = await sessionService.getNextSessionNumber({ projectId });
    const sessionId = `${projectId}-${sessionNumber}`;
    const now = Date.now();
    const sessionData = {
      messages: [{ role: "user", content: message, timestamp: now }],
      project: projectId,
      status: "ready",
      createdAt: now,
      updatedAt: now,
      promptPreset: presetName || null,
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

    let reply = `Session ${sessionId} created: <#${thread.id}>`;
    if (presetName) {
      reply += ` with the '${presetName}' persona.`;
    }
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
    .setDescription("Commit changes and create a pull request for this session.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Optional commit message and PR title.")
        .setRequired(false),
    ),

  async execute(interaction, services) {
    const { sessionService, discordService, gitService } = services;

    if (!isThreadChannel(interaction.channel)) {
      await interaction.reply({
        content: "This command can only be used in a thread channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferReply();
    const sessionId = await discordService.getSessionIdByThread({
      threadId: interaction.channel.id,
    });

    if (!sessionId) {
      await interaction.editReply({
        content: "No session found for this thread.",
      });
      return;
    }
    const authorInfo = discordService.getDiscordUserByUserId({
      userId: interaction.user.id,
    });
    if (!authorInfo || !authorInfo.name || !authorInfo.email) {
      await interaction.editReply({
        content: `Could not find your git author info in kanbatte.config.yaml. Please bind your user first.`,
      });
      return;
    }

    const message = interaction.options.getString("message");

    try {
      const session = await sessionService.getViewBySessionId({ sessionId });
      if (!session) {
        await interaction.editReply({
          content: `Session ${sessionId} could not be found.`,
        });
        return;
      }

      const worktreePath = getWorktreePath(sessionId);
      const branchName = `task/${sessionId.toLowerCase()}`;

      const prMessage =
        message ||
        session.messages.find((m) => m.role === "user")?.content ||
        sessionId;
      const commitMessage = prMessage.substring(0, 72);
      const prTitle = `${sessionId}: ${prMessage.substring(0, 100)}`;
      const prBody = `This PR is automatically generated for session ${sessionId}.`;

      // const authorPrompt = `Commit author is: ${authorInfo.name} <${authorInfo.email}>.`;
      // const prompt = `Save all changes, submit a commit. ${authorPrompt} Do not change git config. Don't add any coauthors and dont mention claude or any AI. Check this branch already exists related Pull Request, if not create a new pr, or just update it. Keep commit message and PR content minimal and simple.`;

      // await sessionService.appendSessionMessages({
      //   sessionId,
      //   messages: [{ role: "user", content: prompt, timestamp: Date.now() }]
      // });

      await gitService.commit({
        worktreePath,
        commitMessage,
        authorName: authorInfo.name,
        authorEmail: authorInfo.email,
      });

      await gitService.push({
        worktreePath,
        branchName,
      });

      await gitService.createPR({
        worktreePath,
        branchName,
        title: prTitle,
        body: prBody,
      });

      // Automatically set status to review after request-pr
      await sessionService.updateSessionStatus({
        sessionId,
        status: "review",
      });

      await interaction.editReply({
        content: `✅ Pull Request for session ${sessionId} has been created/updated successfully! Status set to review.`,
      });
    } catch (error) {
      console.error(`Failed to create PR for session ${sessionId}:`, error);
      await interaction.editReply({
        content: `❌ PR creation failed for session ${sessionId}. Please check the logs for details.`,
      });
    }
  },
};


export default {
  "queue-session": queueSession,
  "set-status": setStatus,
  "request-pr": requestPR,
};
