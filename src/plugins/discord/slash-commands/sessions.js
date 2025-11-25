import { SlashCommandBuilder } from 'discord.js';
import { createMainInsiemeDao } from '../../../deps/mainDao';
import { createDiscordInsiemeDao } from '../deps/discordDao';
import { addSession } from '../../../commands/session';

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
    const insiemeDao = await createMainInsiemeDao();
    const discordInsiemeDao = await createDiscordInsiemeDao();
    const channelId = interaction.channel.id;

    const project = await discordInsiemeDao.getProjectIdByChannel({ channelId });
    
    const message = interaction.options.getString('message');

    const session = await addSession({ insiemeDao }, { project, message });

    const reply = `Session created successfully! Session ID: ${session.sessionId}`;
    console.log(reply);
    await interaction.reply(reply);
  }
}

export default {
  'queue-session': queueSession,
}