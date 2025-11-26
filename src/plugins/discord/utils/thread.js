import { ChannelType } from 'discord.js';

export const isThreadChannel = (channel) => {
  return channel.type === ChannelType.PublicThread ||
    channel.type === ChannelType.PrivateThread ||
    channel.type === ChannelType.AnnouncementThread;
}