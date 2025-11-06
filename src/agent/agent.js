import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";

export async function agent(deps) {
  const { libsqlDao } = deps;

  const options = {
    canUseTool: (toolName, inputData) => {
      return {
        behavior: "allow",
        updatedInput: inputData,
      };
    },
  };

  const readySessions = await libsqlDao.getSessionsByStatus("ready");

  if (readySessions.length === 0) {
    console.log("No sessions with status 'ready' found");
    return;
  }

  const session = readySessions[0];
  console.log(`Running agent for session: ${session.sessionId}`);
  console.log(`Messages count: ${session.messages.length}\n`);

  // Setup git worktree using session project
  const worktreePath = await setupWorktree(session.sessionId, libsqlDao, session.project);
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

  let agentResponse = "";

  try {
    const result = query({
      prompt: systemPrompt,
      options,
      cwd: worktreePath,
    });

    for await (const message of result) {
      if (message.type === "assistant") {
        const text = message.message.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");
        agentResponse += text + "\n";
        console.log(text);
      }
    }

    await deps.libsqlDao.updateSession({
      sessionId: session.sessionId,
      message: agentResponse.trim(),
    });

  } catch (error) {
    console.error(`Error processing session ${session.sessionId}:`, error);
    agentResponse = `Agent encountered an error: ${error.message}. Session marked for review.`;

    await deps.libsqlDao.updateSession({
      sessionId: session.sessionId,
      message: agentResponse,
    });
  }

  // Always set status to review (both success and error cases)
  await deps.libsqlDao.updateSession({
    sessionId: session.sessionId,
    status: "review",
  });

  console.log(`\nSession ${session.sessionId} moved to review`);
}
