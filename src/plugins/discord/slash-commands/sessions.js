import { SlashCommandBuilder, MessageFlags } from 'discord.js';

const queueSession = {
  data: new SlashCommandBuilder()
    .setName('queue-session')
    .setDescription('Create a new session thread in the current channel')
    .addStringOption((option) => option.setName('message').setDescription('Initial message for the session').setRequired(true)),

  async execute(interaction, services) {
    const { sessionService, discordService } = services;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channelId = interaction.channel.id;
    const project = await discordService.getProjectIdByChannel({ channelId });
    const message = interaction.options.getString('message');

    // Create a session number and ID
    const sessionNumber = await sessionService.getNextSessionNumber({ projectId: project });
    const sessionId = `${project}-${sessionNumber}`;
    const now = Date.now();

    // Prepare session data
    const sessionData = {
      messages: [{ role: "user", content: message, timestamp: now }],
      project: project,
      status: "ready",
      createdAt: now,
      updatedAt: now,
    };

    // Add the session using the sessionService
    await sessionService.addSession({ sessionId, sessionData });

    // Create the Discord thread
    const thread = await interaction.channel.threads.create({
      name: `[ready] ${sessionId}`,
      autoArchiveDuration: 1440, // 24 hours
      reason: `Session: ${sessionId}`,
    });

    await thread.members.add(interaction.user.id);
    await thread.send(message);
    await discordService.addSessionThreadRecord({ sessionId: sessionId, threadId: thread.id });

    const reply = `Session ${sessionId} created: <#${thread.id}>`;
    console.log(reply);

    await interaction.editReply({ content: reply });
  },
};

export default {
  'queue-session': queueSession,
};