import { query } from "@anthropic-ai/claude-agent-sdk";
import { updateSession } from "../sessionCommands.js";
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
  const worktreePath = await setupWorktree(session.sessionId, libsqlDao);
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

  const result = query({
    prompt: systemPrompt,
    options,
    cwd: worktreePath,
  });

  let agentResponse = "";

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

  await updateSession(deps, {
    sessionId: session.sessionId,
    message: agentResponse.trim(),
  });

  await updateSession(deps, {
    sessionId: session.sessionId,
    status: "review",
  });

  console.log(`\nSession ${session.sessionId} moved to review`);
}
