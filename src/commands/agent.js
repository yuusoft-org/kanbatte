import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";
import {
  buildQueryOptions,
  handleSessionInit,
  saveMessageContent,
  checkInterruption
} from "../utils/agent.js";

/**
 * Process a single session with the Claude agent
 */
export const processSession = async (session, deps) => {
  const { sessionService, configService } = deps;

  console.log(`\nRunning agent for session: ${session.sessionId}`);
  console.log(`Messages count: ${session.messages.length}`);

  await sessionService.updateSessionStatus({
    sessionId: session.sessionId,
    status: "in-progress"
  });

  // Get project repository
  const project = sessionService.getProjectById({ projectId: session.project });
  if (!project || !project.gitRepository) {
    throw new Error(`No repository found for project ${session.project} in config file.`);
  }

  // Setup git worktree
  const worktreePath = await setupWorktree(session.sessionId, project.gitRepository);
  console.log(`\nWorktree ready at: ${worktreePath}\n`);

  // Get system prompt if preset specified
  let systemPrompt = null;
  if (session.promptPreset) {
    systemPrompt = configService.getPrompt(session.promptPreset);
    if (systemPrompt) {
      console.log(`Using system prompt preset: ${session.promptPreset}`);
    } else {
      console.warn(`Prompt preset '${session.promptPreset}' not found in config. Using default.`);
    }
  }

  // Get existing claude session ID for resume
  let claudeSessionId = await sessionService.getClaudeSessionIdBySessionId({
    sessionId: session.sessionId
  });

  const queryOptions = buildQueryOptions({ worktreePath, claudeSessionId, systemPrompt });
  const lastMessage = session.messages[session.messages.length - 1];

  try {
    const result = query({
      prompt: lastMessage.content,
      options: queryOptions,
    });

    for await (const message of result) {
      // Check for user interruption
      if (await checkInterruption({ sessionId: session.sessionId, sessionService })) {
        console.warn(`Interruption detected for session ${session.sessionId}.`);
        break;
      }

      // Handle session init
      claudeSessionId = await handleSessionInit({
        message,
        sessionId: session.sessionId,
        claudeSessionId,
        sessionService
      });

      // Save message content
      await saveMessageContent({
        message,
        sessionId: session.sessionId,
        sessionService
      });
    }
  } catch (error) {
    console.warn(`Error processing session ${session.sessionId}:`, error);
  }

  // Final interruption check
  if (await checkInterruption({ sessionId: session.sessionId, sessionService })) {
    console.warn(`Work on session ${session.sessionId} was interrupted by user. Discarding results.`);
    return false;
  }

  await sessionService.updateSessionStatus({
    sessionId: session.sessionId,
    status: "review"
  });

  console.log(`\nSession ${session.sessionId} moved to review`);
  return true;
};

export const agent = async (deps) => {
  const { sessionService } = deps;
  const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

  if (readySessions.length === 0) {
    console.log("No sessions with status 'ready' found");
    return;
  }

  console.log(`Found ${readySessions.length} ready sessions`);

  for (const session of readySessions) {
    try {
      await processSession(session, deps);
    } catch (error) {
      console.warn(`Failed to process session ${session.sessionId}:`, error);
    }
  }

  console.log(`\nAll ${readySessions.length} sessions processed`);
};

export const agentStart = async (deps) => {
  while (true) {
    await agent(deps);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};
