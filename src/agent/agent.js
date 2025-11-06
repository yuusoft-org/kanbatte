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

  const readySessions = await deps.getSessionsByStatus("ready");

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
      const project = await deps.getProjectById(session.project);
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

      const systemPrompt = `You are working on session ${session.sessionId} for project "${session.project}".
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

      const messages = [];

      try {
        const result = query({
          prompt: systemPrompt,
          options,
          cwd: worktreePath,
        });

        for await (const message of result) {
          messages.push(message);

          // Display assistant messages to console
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

        // Append the complete message structure as JSON
        await deps.appendToSession(session.sessionId, {
          type: "agent_response",
          content: messages,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error(`Error processing session ${session.sessionId}:`, error);

        // Append error message as JSON
        await deps.appendToSession(session.sessionId, {
          type: "error",
          content: error.message,
          timestamp: Date.now()
        });
      }

      // Always set status to review (both success and error cases)
      await deps.updateSessionStatus(session.sessionId, "review");

      console.log(`\nSession ${session.sessionId} moved to review`);

    } catch (error) {
      console.error(`Failed to process session ${session.sessionId}:`, error);
      // Continue to next session
    }
  }

  console.log(`\nAll ${readySessions.length} sessions processed`);
}