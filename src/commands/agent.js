import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";

export const agent = async (deps) => {
  const { sessionService, configService, discordService } = deps;
  const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

  if (readySessions.length === 0) {
    console.log("No sessions with status 'ready' found");
    return;
  }

  console.log(`Found ${readySessions.length} ready sessions`);

  // Process all ready sessions
  for (const session of readySessions) {
    console.log(`\nRunning agent for session: ${session.sessionId}`);
    console.log(`Messages count: ${session.messages.length}`);

    try {
      await sessionService.updateSessionStatus({
        sessionId: session.sessionId,
        status: "in-progress"
      });

      // Get project repository
      const project = sessionService.getProjectById({ projectId: session.project });
      if (!project || !project.gitRepository) {
        throw new Error(`No repository found for project ${session.project} in config file.`);
      }

      // Setup git worktree using project repository
      const worktreePath = await setupWorktree(session.sessionId, project.gitRepository);
      console.log(`\nWorktree ready at: ${worktreePath}\n`);

      let claudeSessionId = await sessionService.getClaudeSessionIdBySessionId({
        sessionId: session.sessionId
      });

      const lastMessage = session.messages[session.messages.length - 1];
      const userPrompt = `${lastMessage.content}`;

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

      const promptPresetName = session.promptPreset || "default";
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
        console.log(`Using system prompt preset: ${promptPresetName}`);

      }
      else {
        console.warn(`Prompt preset '${promptPresetName}' not found in config. Using default.`,);
      }

      if (claudeSessionId) {
        queryOptions.resume = claudeSessionId;
      }

      try {
        const result = query({
          prompt: userPrompt,
          options: queryOptions,
        });

        //const assistantContent = [];

        for await (const message of result) {

          const currentSessionState = await sessionService.getViewBySessionId({ sessionId: session.sessionId });
          if (currentSessionState.status !== "in-progress") {
            console.warn(`Interruption detected for session ${session.sessionId}.`);
            break;
          }
          if (!claudeSessionId && message.type === 'system' && message.subtype === 'init' && message.session_id) {
            claudeSessionId = message.session_id;
            await sessionService.addClaudeSessionRecord({
              sessionId: session.sessionId,
              claudeSessionId: message.session_id,
            });
            console.log(`Claude session started and saved for ${session.sessionId}`);
          }

          // Collect all content from the streaming response
          if (message.message?.content) {
            await sessionService.appendSessionMessages({
              sessionId: session.sessionId,
              messages: [{
                // Doc: https://platform.claude.com/docs/en/agent-sdk/typescript#message-types
                role: message.message.role,
                content: message.message.content,
                timestamp: Date.now()
              }]
            });
          }
        }

      } catch (error) {
        console.warn(`Error processing session ${session.sessionId}:`, error);
      }

      const currentSessionState = await sessionService.getViewBySessionId({ sessionId: session.sessionId });
      if (currentSessionState.status !== "in-progress") {
        console.warn(`Work on session ${session.sessionId} was interrupted by user. Discarding results.`);
        continue;
      }

      await sessionService.updateSessionStatus({
        sessionId: session.sessionId,
        status: "review"
      });

      console.log(`\nSession ${session.sessionId} moved to review`);

    } catch (error) {
      console.warn(`Failed to process session ${session.sessionId}:`, error);
      // Continue to next session
    }
  }

  console.log(`\nAll ${readySessions.length} sessions processed`);
}

export const agentStart = async (deps) => {
  while (true) {
    await agent(deps);
    // Wait 5 seconds before next run
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
