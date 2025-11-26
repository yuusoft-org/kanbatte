import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isThreadChannel } from '../utils';
import { createMainInsiemeDao } from '../../../deps/mainDao';
import { createDiscordInsiemeDao } from '../deps/discordDao';
import { addSession } from '../../../commands/session';
import { agent } from '../../../commands/agent';

// export const ping = {
//   data: new SlashCommandBuilder()
//     .setName('ping')
//     .setDescription('Replies with Pong!'),

//   async execute(interaction) {
//     await interaction.reply('Pong!');
//   },
// };

const queueSession = {
  data: new SlashCommandBuilder()
    .setName('queue-session')
    .setDescription('Create a new session thread in the current channel')
    .addStringOption((option) => option.setName('message').setDescription('Initial message for the session').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const insiemeDao = await createMainInsiemeDao();
    const discordInsiemeDao = await createDiscordInsiemeDao();
    const channelId = interaction.channel.id;

    const project = await discordInsiemeDao.getProjectIdByChannel({ channelId });

    const message = interaction.options.getString('message');

    const session = await addSession({ insiemeDao }, { project, message });

    // Not in a thread - create one
    const thread = await interaction.channel.threads.create({
      name: `[${session.status}] ${session.sessionId}`,
      autoArchiveDuration: 1440, // 24 hours
      reason: `Session: ${session.sessionId}`,
    });

    // Add the user who created the task to the thread
    await thread.members.add(interaction.user.id);

    // Send message to the new thread
    await thread.send(`🗨️ User: ${message}`);
    await discordInsiemeDao.addSessionThreadRecord({ sessionId: session.sessionId, threadId: thread.id });

    const reply = `Session ${session.sessionId} created: <#${thread.id}>`;
    console.log(reply);

    // Update the deferred reply
    await interaction.editReply({
      content: reply
    });
  }
}

const setStatus = {
  data: new SlashCommandBuilder()
    .setName('set-status')
    .setDescription('Set the status of an existing session')
    .addStringOption((option) => option.setName('status').setDescription('New status for the session').setRequired(true)),

  async execute(interaction) {
    const isThread = isThreadChannel(interaction.channel);
    if (!isThread) {
      await interaction.reply({
        content: 'This command can only be used in a thread channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const status = interaction.options.getString('status');
    if (!['ready', 'in-progress', 'review', 'done'].includes(status)) {
      await interaction.reply({
        content: `Invalid status '${status}'. Valid statuses are: ready, in-progress, review, done.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const discordInsiemeDao = await createDiscordInsiemeDao();
    const mainInsiemeDao = await createMainInsiemeDao();
    const sessionId = await discordInsiemeDao.getSessionIdByThread({ threadId: interaction.channel.id });
    if (!sessionId) {
      await interaction.reply({
        content: `No session found for this thread.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await mainInsiemeDao.updateSessionStatus({ sessionId, status });
    await interaction.reply({
      content: `🔄 Session ${sessionId} status updated to: ${status}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

const startAgent = {
  data: new SlashCommandBuilder()
    .setName('start-agent')
    .setDescription('Start the agent to work on this session'),

  async execute(interaction) {
    const insiemeDao = await createMainInsiemeDao();
    await interaction.reply({
      content: `Starting agent for all ready sessions...`,
      flags: MessageFlags.Ephemeral,
    });
    await agent({ insiemeDao });
  }
}

export default {
  'queue-session': queueSession,
  'set-status': setStatus,
  'start-agent': startAgent,
}