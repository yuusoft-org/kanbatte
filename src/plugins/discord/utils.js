import { ChannelType } from 'discord.js';

export const isThreadChannel = (channel) => {
  return channel.type === ChannelType.PublicThread ||
    channel.type === ChannelType.PrivateThread ||
    channel.type === ChannelType.AnnouncementThread;
}

export const splitTextForDiscord = (text, maxLength = 1500) => {
  if (text.length <= maxLength) {
    return [text];
  }

  let result = [];
  let currentText = text;

  while (currentText.length > maxLength) {
    const doubleNewlineIndex = currentText.lastIndexOf('\n\n', maxLength);
    if (doubleNewlineIndex > 0 && doubleNewlineIndex < maxLength) {
      result.push(currentText.substring(0, doubleNewlineIndex).trim());
      currentText = currentText.substring(doubleNewlineIndex + 2).trim();
      continue;
    }

    const punctuationMatch = currentText.substring(0, maxLength).match(/[.!?。！？]/);
    if (punctuationMatch) {
      const punctuationIndex = punctuationMatch.index;
      result.push(currentText.substring(0, punctuationIndex + 1).trim());
      currentText = currentText.substring(punctuationIndex + 1).trim();
      continue;
    }

    const spaceIndex = currentText.lastIndexOf(' ', maxLength);
    if (spaceIndex > 0) {
      result.push(currentText.substring(0, spaceIndex).trim());
      currentText = currentText.substring(spaceIndex + 1).trim();
      continue;
    }

    result.push(currentText.substring(0, maxLength));
    currentText = currentText.substring(maxLength);
  }

  if (currentText.trim()) {
    result.push(currentText.trim());
  }

  return result.filter(text => text.length > 0);
};

export const classifyEventsBySession = (events) => {
  const eventsBySession = {};

  for (const event of events) {
    if (event.sessionId) {
      if (!eventsBySession[event.sessionId]) {
        eventsBySession[event.sessionId] = [];
      }
      eventsBySession[event.sessionId].push(event);
    }
  }

  return eventsBySession;
};