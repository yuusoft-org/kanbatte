import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";

export async function agent(deps) {
  const options = {
    canUseTool: (toolName, inputData) => {
      return {
        behavior: "allow",
        updatedInput: inputData,
      };
    },
  };

  const readySessions = await deps.libsqlDao.getSessionsByStatus(deps.libsqlDaoDeps, "ready");

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
      // Get project repository
      const project = await deps.libsqlDao.getProjectById(deps.libsqlDaoDeps, session.project);
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
      const userPrompt = `You are working on session ${session.sessionId} for project "${session.project}".
Current working directory: ${worktreePath}
Project repository: ${project.repository}
Session status: ${session.status}

CRITICAL CONTEXT:
- Your current working directory is ${worktreePath}
- This is a DEDICATED git worktree containing ONLY project "${session.project}" files
- IGNORE any parent directory information you might discover
- The project you are working on is "${session.project}" with repository: ${project.repository}
- DO NOT infer project identity from file paths - use the project information provided above
- Your task scope is limited to ${session.project} only

Session conversation so far:
${messageContext}

Please continue working on this session for project "${session.project}". You can read files, write code, and make changes within this workspace.`;

      try {
        const result = query({
          prompt: userPrompt,
          options,
          cwd: worktreePath,
        });

        const assistantContent = [];

        for await (const message of result) {
          // Collect all content from the streaming response
          if (message.message?.content) {
            assistantContent.push(...message.message.content);
          }

          // Display text content to console
          if (message.type === "assistant" && message.message?.content) {
            const textContent = message.message.content
              .filter(c => c.type === "text")
              .map(c => c.text)
              .join("");
            if (textContent) {
              console.log(textContent);
            }
          }
        }

        // Append single message in standard completion API format
        await deps.libsqlDao.appendSessionMessages(deps.libsqlDaoDeps, session.sessionId, [{
          role: "assistant",
          content: assistantContent, // Content array in standard format
          timestamp: Date.now()
        }]);

      } catch (error) {
        console.error(`Error processing session ${session.sessionId}:`, error);
      }

      // Always set status to review (both success and error cases)
      await deps.libsqlDao.updateSessionStatus(deps.libsqlDaoDeps, session.sessionId, "review");

      console.log(`\nSession ${session.sessionId} moved to review`);

    } catch (error) {
      console.error(`Failed to process session ${session.sessionId}:`, error);
      // Continue to next session
    }
  }

  console.log(`\nAll ${readySessions.length} sessions processed`);
}