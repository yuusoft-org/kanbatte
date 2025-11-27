import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";

export const createAgentService = (deps) => {
  const { sessionService } = deps;

  const start = async () => {
    const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

    if (readySessions.length === 0) {
      console.log("No sessions with status 'ready' found");
      return;
    }

    console.log(`Found ${readySessions.length} ready sessions`);

    for (const session of readySessions) {
      console.log(`\nRunning agent for session: ${session.sessionId}`);
      console.log(`Messages count: ${session.messages.length}`);

      try {
        const project = await sessionService.getProjectById({ projectId: session.project });
        if (!project || !project.repository) {
          throw new Error(`No repository found for project ${session.project}`);
        }

        const worktreePath = await setupWorktree(session.sessionId, project.repository);
        console.log(`\nWorktree ready at: ${worktreePath}\n`);

        const messageContext = session.messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n");

        const userPrompt = `
Session conversation so far:
${messageContext}

Please continue working on this session for project "${session.project}". You can read files, write code, and make changes within this workspace.`;

        try {
          const result = query({
            prompt: userPrompt,
            options: {
              canUseTool: (toolName, inputData) => ({
                behavior: "allow",
                updatedInput: inputData,
              }),
              cwd: worktreePath,
            },
          });

          const assistantContent = [];
          for await (const message of result) {
            if (message.message?.content) {
              assistantContent.push(...message.message.content);
            }
            if (message.type === "assistant" && message.message?.content) {
              const textContent = message.message.content
                .filter((c) => c.type === "text")
                .map((c) => c.text)
                .join("");
              if (textContent) {
                console.log(textContent);
              }
            }
          }

          await sessionService.appendSessionMessages({
            sessionId: session.sessionId,
            messages: [{
              role: "assistant",
              content: assistantContent,
              timestamp: Date.now(),
            }],
          });
        } catch (error) {
          console.warn(`Error processing session ${session.sessionId}:`, error);
        }

        await sessionService.updateSessionStatus({
          sessionId: session.sessionId,
          status: "review",
        });

        console.log(`\nSession ${session.sessionId} moved to review`);
      } catch (error) {
        console.warn(`Failed to process session ${session.sessionId}:`, error);
      }
    }

    console.log(`\nAll ${readySessions.length} sessions processed`);
  };

  return {
    start,
  };
};