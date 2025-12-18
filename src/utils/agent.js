/**
 * Build query options for Claude agent
 */
export const buildQueryOptions = ({ worktreePath, claudeSessionId, systemPrompt }) => {
  const options = {
    model: "opus",
    settingSources: ['project'],
    canUseTool: (toolName, inputData) => ({
      behavior: "allow",
      updatedInput: inputData,
    }),
    cwd: worktreePath,
  };

  if (systemPrompt) {
    options.systemPrompt = systemPrompt;
  }

  if (claudeSessionId) {
    options.resume = claudeSessionId;
  }

  return options;
};

/**
 * Handle Claude session initialization message
 */
export const handleSessionInit = async ({ message, sessionId, claudeSessionId, sessionService }) => {
  if (!claudeSessionId && message.type === 'system' && message.subtype === 'init' && message.session_id) {
    await sessionService.addClaudeSessionRecord({
      sessionId,
      claudeSessionId: message.session_id,
    });
    console.log(`Claude session started and saved for ${sessionId}`);
    return message.session_id;
  }
  return claudeSessionId;
};

/**
 * Save message content to session
 */
export const saveMessageContent = async ({ message, sessionId, sessionService }) => {
  if (message.message?.content) {
    await sessionService.appendSessionMessages({
      sessionId,
      messages: [{
        role: message.message.role,
        content: message.message.content,
        timestamp: Date.now()
      }]
    });
  }
};

/**
 * Check if session was interrupted by user
 */
export const checkInterruption = async ({ sessionId, sessionService }) => {
  const state = await sessionService.getViewBySessionId({ sessionId });
  return state.status !== "in-progress";
};
