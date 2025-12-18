import { ChannelType } from 'discord.js';

export const isThreadChannel = (channel) => {
  return channel.type === ChannelType.PublicThread ||
    channel.type === ChannelType.PrivateThread ||
    channel.type === ChannelType.AnnouncementThread;
}

export const isMemberAllowed = (member, allowedRoleIds) => {
  for (const roleId of allowedRoleIds) {
    if (member.roles.cache.has(roleId)) {
      return true;
    }
  }
  return false;
}

export const splitTextForDiscord = (text, maxLength = 1500) => {
  if (!text || text.trim().length === 0) {
    return [];
  }
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

const generateTodoText = (todos) => {
  let todoText = "Todo List:\n";

  for (const todo of todos) {
    let statusIcon;

    switch (todo.status) {
      case 'pending':
        statusIcon = '[PENDING]';
        break;
      case 'in_progress':
        statusIcon = '[IN_PROGRESS]';
        break;
      case 'completed':
        statusIcon = '[COMPLETED]';
        break;
      default:
        statusIcon = '[PENDING]';
    }

    todoText += `- ${statusIcon} ${todo.content}\n`;
  }

  return todoText.trim();
}


const generateToolUseMessage = (contentPart) => {
  switch (contentPart.name) {
    case 'Bash':
      return `Running bash command, ${contentPart.input["description"]} \n\`\`\`sh\n${contentPart.input["command"]}\n\`\`\``;
    case 'Edit':
      const { file_path } = contentPart.input;
      return `Editing file: ${file_path}`;
    case 'Grep':
      const glob = contentPart.input["glob"];
      const type = contentPart.input["type"];
      let result = `Grep pattern: ${contentPart.input["pattern"]}`;
      if (glob) {
        result += ` in ${glob}`;
      }
      if (type) {
        result += ` (${type})`;
      }
      return result;
    case 'Glob':
      const globPattern = contentPart.input["pattern"];
      const path = contentPart.input["path"];
      let globResult = `Glob files: ${globPattern}`;
      if (path) {
        globResult += ` in ${path}`;
      }
      return globResult;
    case 'TodoWrite':
      return generateTodoText(contentPart.input["todos"]);
    case 'Read':
      return `Reading file: ${contentPart.input["file_path"]}`;
    case 'WebSearch':
      return `Searching the web for: ${contentPart.input["query"]}`;
    default:
      return `Assistant is calling tool: ${contentPart.name}`;
  }
}

export const transformSessionMessageAppend = (message) => {
  if (message.role === 'user') {
    if (typeof message.content === 'string') {
      return `User: ${message.content}`;
    } else if (Array.isArray(message.content)) {
      // not handling for now.
    }
  } else if (message.role === 'assistant') {
    if (typeof message.content === 'string') {
      return `Assistant: ${message.content}`;
    } else if (Array.isArray(message.content)) {
      for (const contentPart of message.content) {
        if (contentPart.type === 'text') {
          return `Assistant: ${contentPart.text}`;
        } else if (contentPart.type === 'tool_use') {
          return generateToolUseMessage(contentPart);
        }
      }
    }
  } else if (message.role === 'system') {
    return `System: ${message.content}`;
  } else {
    return `${message.role}: ${message.content}`;
  }
}