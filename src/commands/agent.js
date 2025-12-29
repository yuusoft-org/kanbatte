import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";

// Helper function for consistent timestamp logging
const log = (sessionId, ...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [session:${sessionId || 'global'}]`, ...args);
};

const logWarn = (sessionId, ...args) => {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [session:${sessionId || 'global'}] [WARN]`, ...args);
};

const logError = (sessionId, ...args) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [session:${sessionId || 'global'}] [ERROR]`, ...args);
};

export const agent = async (deps) => {
  const { sessionService, configService, discordService } = deps;

  log(null, "Fetching sessions with status 'ready'...");
  const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

  if (readySessions.length === 0) {
    log(null, "No sessions with status 'ready' found");
    return;
  }

  log(null, `Found ${readySessions.length} ready sessions`);

  // Process all ready sessions
  for (const session of readySessions) {
    const startTime = Date.now();
    log(session.sessionId, `Starting agent processing`);
    log(session.sessionId, `Messages count: ${session.messages.length}`);

    try {
      log(session.sessionId, `Updating status to 'in-progress'...`);
      await sessionService.updateSessionStatus({
        sessionId: session.sessionId,
        status: "in-progress"
      });
      log(session.sessionId, `Status updated to 'in-progress'`);

      // Get project repository
      log(session.sessionId, `Getting project info for: ${session.project}`);
      const project = sessionService.getProjectById({ projectId: session.project });
      if (!project || !project.gitRepository) {
        throw new Error(`No repository found for project ${session.project} in config file.`);
      }
      log(session.sessionId, `Project found, repository: ${project.gitRepository}`);

      // Setup git worktree using project repository
      log(session.sessionId, `Setting up git worktree...`);
      const worktreePath = await setupWorktree(session.sessionId, project.gitRepository);
      log(session.sessionId, `Worktree ready at: ${worktreePath}`);

      log(session.sessionId, `Fetching Claude session ID...`);
      let claudeSessionId = await sessionService.getClaudeSessionIdBySessionId({
        sessionId: session.sessionId
      });
      log(session.sessionId, `Claude session ID: ${claudeSessionId || '(new session)'}`);

      const lastMessage = session.messages[session.messages.length - 1];
      const userPrompt = `${lastMessage.content}`;
      log(session.sessionId, `User prompt length: ${userPrompt.length} chars`);

      const queryOptions = {
        model: "opus",
        settingSources: ['project'],
        canUseTool: (toolName, inputData) => {
          return {
            behavior: "allow",
            updatedInput: inputData,
          };
        },
        cwd: worktreePath,
      };

      const promptPresetName = session.promptPreset ?? "default";
      let systemPrompt = configService.getPrompt(promptPresetName);

      if (systemPrompt) {
        if (systemPrompt.includes("${gitAuthor}")) {
          const discordUserId = await discordService.getCreatorIdBySessionId({
            sessionId: session.sessionId
          });

          if (!discordUserId) {
            throw new Error(`Discord user ID not found for session ${session.sessionId}. Cannot replace \${gitAuthor}.`);
          }

          const creatorInfo = configService.getDiscordUserByUserId(discordUserId);

          if (!creatorInfo || !creatorInfo.gitAuthor) {
            throw new Error(`Git author info not found for user ${discordUserId}. Cannot replace \${gitAuthor}.`);
          }

          systemPrompt = systemPrompt.replace(
            /\$\{gitAuthor\}/g,
            creatorInfo.gitAuthor,
          );
        }
        queryOptions.systemPrompt = systemPrompt;
        log(session.sessionId, `Using system prompt preset: ${promptPresetName}`);

      }
      else {
        logWarn(session.sessionId, `Prompt preset '${promptPresetName}' not found in config. Using default.`);
      }

      if (claudeSessionId) {
        queryOptions.resume = claudeSessionId;
        log(session.sessionId, `Resuming existing Claude session: ${claudeSessionId}`);
      }

      try {
        log(session.sessionId, `Calling Claude Agent SDK query()...`);
        const queryStartTime = Date.now();
        const result = query({
          prompt: userPrompt,
          options: queryOptions,
        });
        log(session.sessionId, `Query object created, starting async iteration...`);

        let messageCount = 0;
        let lastMessageTime = Date.now();
        let lastMessageType = null;

        for await (const message of result) {
          messageCount++;
          const now = Date.now();
          const timeSinceLastMessage = now - lastMessageTime;
          lastMessageTime = now;

          // Log detailed message info
          const messageInfo = {
            count: messageCount,
            type: message.type,
            subtype: message.subtype || null,
            hasContent: !!message.message?.content,
            contentLength: message.message?.content ? JSON.stringify(message.message.content).length : 0,
            timeSinceLastMs: timeSinceLastMessage,
          };
          log(session.sessionId, `Message received:`, JSON.stringify(messageInfo));
          lastMessageType = message.type;

          // Check for interruption
          log(session.sessionId, `Checking session status for interruption...`);
          const currentSessionState = await sessionService.getViewBySessionId({ sessionId: session.sessionId });
          if (currentSessionState.status !== "in-progress") {
            logWarn(session.sessionId, `Interruption detected! Current status: ${currentSessionState.status}`);
            break;
          }

          if (!claudeSessionId && message.type === 'system' && message.subtype === 'init' && message.session_id) {
            claudeSessionId = message.session_id;
            log(session.sessionId, `Saving Claude session ID: ${message.session_id}`);
            await sessionService.addClaudeSessionRecord({
              sessionId: session.sessionId,
              claudeSessionId: message.session_id,
            });
            log(session.sessionId, `Claude session ID saved successfully`);
          }

          // Collect all content from the streaming response
          if (message.message?.content) {
            log(session.sessionId, `Appending assistant message to session...`);
            await sessionService.appendSessionMessages({
              sessionId: session.sessionId,
              messages: [{
                // Doc: https://platform.claude.com/docs/en/agent-sdk/typescript#message-types
                role: message.message.role,
                content: message.message.content,
                timestamp: Date.now()
              }]
            });
            log(session.sessionId, `Assistant message appended`);
          }
        }

        const queryDuration = Date.now() - queryStartTime;
        log(session.sessionId, `Async iteration completed. Total messages: ${messageCount}, Duration: ${queryDuration}ms, Last message type: ${lastMessageType}`);

      } catch (error) {
        logError(session.sessionId, `Error during Claude query processing:`, error.message);
        logError(session.sessionId, `Error stack:`, error.stack);
      }

      log(session.sessionId, `Checking final session status before moving to review...`);
      const currentSessionState = await sessionService.getViewBySessionId({ sessionId: session.sessionId });
      if (currentSessionState.status !== "in-progress") {
        logWarn(session.sessionId, `Work was interrupted by user. Current status: ${currentSessionState.status}. Discarding results.`);
        continue;
      }

      log(session.sessionId, `Updating session status to 'review'...`);
      await sessionService.updateSessionStatus({
        sessionId: session.sessionId,
        status: "review"
      });

      const totalDuration = Date.now() - startTime;
      log(session.sessionId, `Session processing completed. Status: review. Total duration: ${totalDuration}ms`);

    } catch (error) {
      logError(session.sessionId, `Failed to process session:`, error.message);
      logError(session.sessionId, `Error stack:`, error.stack);
      // Continue to next session
    }
  }

  log(null, `All ${readySessions.length} sessions processed`);
}

export const agentStart = async (deps) => {
  let loopCount = 0;
  log(null, `Agent loop starting...`);

  while (true) {
    loopCount++;
    log(null, `Agent loop iteration #${loopCount} starting...`);
    const loopStartTime = Date.now();

    try {
      await agent(deps);
    } catch (error) {
      logError(null, `Unexpected error in agent loop iteration #${loopCount}:`, error.message);
      logError(null, `Error stack:`, error.stack);
    }

    const loopDuration = Date.now() - loopStartTime;
    log(null, `Agent loop iteration #${loopCount} completed in ${loopDuration}ms. Waiting 5 seconds...`);

    // Wait 5 seconds before next run
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
