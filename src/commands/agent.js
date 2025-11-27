import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";

export const agent = async (deps) => {
  const readySessions = await deps.insiemeDao.getSessionsByStatus({ status: "ready" });

  if (readySessions.length === 0) {
    //console.log("No sessions with status 'ready' found");
    return;
  }

  console.log(`Found ${readySessions.length} ready sessions`);

  // Process all ready sessions
  for (const session of readySessions) {
    console.log(`\nRunning agent for session: ${session.sessionId}`);
    console.log(`Messages count: ${session.messages.length}`);

    try {
      await deps.insiemeDao.updateSessionStatus({
        sessionId: session.sessionId,
        status: "in-progress"
      });

      // Get project repository
      const project = await deps.insiemeDao.getProjectById({ projectId: session.project });
      if (!project || !project.repository) {
        throw new Error(`No repository found for project ${session.project}`);
      }

      // Setup git worktree using project repository
      const worktreePath = await setupWorktree(session.sessionId, project.repository);
      console.log(`\nWorktree ready at: ${worktreePath}\n`);

      // Build context from session messages
      const messageContext = session.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Build user prompt with context
      const userPrompt = `
Session conversation so far:
${messageContext}

Please continue working on this session for project "${session.project}". You can read files, write code, and make changes within this workspace.`;

      try {
        const result = query({
          prompt: userPrompt,
          options: {
            canUseTool: (toolName, inputData) => {
              return {
                behavior: "allow",
                updatedInput: inputData,
              };
            },
            cwd: worktreePath,
          },
        });

        //const assistantContent = [];

        for await (const message of result) {
          // Collect all content from the streaming response
          if (message.message?.content) {
            //assistantContent.push(...message.message.content);
            await deps.insiemeDao.appendSessionMessages({
              sessionId: session.sessionId,
              messages: [{
                // Doc: https://platform.claude.com/docs/en/agent-sdk/typescript#message-types
                role: message.message.role,
                content: message.message.content, // Content array in standard format
                timestamp: Date.now()
              }]
            });
          }

          // Display text content to console
          // if (message.type === "assistant" && message.message?.content) {
          //   const textContent = message.message.content
          //     .filter(c => c.type === "text")
          //     .map(c => c.text)
          //     .join("");
          //   if (textContent) {
          //     console.log(textContent);
          //   }
          // }
        }


      } catch (error) {
        console.warn(`Error processing session ${session.sessionId}:`, error);
      }

      // Always set status to review (both success and error cases)
      await deps.insiemeDao.updateSessionStatus({
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