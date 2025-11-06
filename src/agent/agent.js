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

  const session = readySessions[0];
  console.log(`Running agent for session: ${session.sessionId}`);
  console.log(`Messages count: ${session.messages.length}\n`);

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

  const systemPrompt = `You are working on session ${session.sessionId}
Current working directory: ${worktreePath}
Session status: ${session.status}

Session conversation so far:
${messageContext}

Please continue working on this session. You can read files, write code, and make changes.`;

  const messages = [];

  try {
    const result = query({
      prompt: systemPrompt,
      options,
      cwd: worktreePath,
    });

    for await (const message of result) {
      // Include all message types, not just assistant
      if (message.type) {
        messages.push(message);

        if (message.type === "assistant") {
          const text = message.message?.content
            ?.filter((c) => c.type === "text")
            ?.map((c) => c.text)
            ?.join("") || "";
          console.log(text);
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
}
