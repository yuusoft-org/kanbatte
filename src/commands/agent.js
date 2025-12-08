import { query } from "@anthropic-ai/claude-agent-sdk";
import { setupWorktree } from "../utils/git.js";

export const agent = async (deps) => {
  const { sessionService } = deps;
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
      const project = await sessionService.getProjectById({ projectId: session.project });
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
            model: "opus",
            settingSources: ['project'],
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

      // Always set status to review (both success and error cases)
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

// Object to track which threads/channels are currently running
const runningThreads = {};

export const agentStart = async (deps) => {
  const { sessionService } = deps;

  while (true) {
    // Step 1: Get all ready sessions
    const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

    if (readySessions.length === 0) {
      console.log("No sessions with status 'ready' found");
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    console.log(`Found ${readySessions.length} ready sessions`);

    // Step 2: Group sessions by thread/channel
    const sessionsByThread = {};
    for (const session of readySessions) {
      // Use sessionId prefix as thread/channel identifier (e.g., "thread-1", "channel-A")
      // For now, using projectId as the thread identifier
      const threadId = session.project || 'default';

      if (!sessionsByThread[threadId]) {
        sessionsByThread[threadId] = [];
      }
      sessionsByThread[threadId].push(session);
    }

    // Step 3: Process each thread/channel
    const promises = [];

    for (const [threadId, sessions] of Object.entries(sessionsByThread)) {
      // Check if this thread is already running
      if (runningThreads[threadId]) {
        console.log(`Thread ${threadId} is already running, skipping...`);
        continue;
      }

      // Mark thread as running and process sessions
      runningThreads[threadId] = true;

      // Process this thread's sessions in parallel with other threads
      const threadPromise = (async () => {
        try {
          // Process sessions serially within this thread
          for (const session of sessions) {
            console.log(`\nRunning agent for session: ${session.sessionId} (thread: ${threadId})`);
            await processSession(session, deps);
          }
        } finally {
          // Always mark thread as not running when done
          delete runningThreads[threadId];
          console.log(`Thread ${threadId} completed`);
        }
      })();

      promises.push(threadPromise);
    }

    // Wait for all threads to complete processing their current batch
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    // Wait 5 seconds before next run
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Extract session processing logic into separate function
async function processSession(session, deps) {
  const { sessionService } = deps;
  console.log(`Messages count: ${session.messages.length}`);

  try {
    await sessionService.updateSessionStatus({
      sessionId: session.sessionId,
      status: "in-progress"
    });

    // Get project repository
    const project = await sessionService.getProjectById({ projectId: session.project });
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
          model: "opus",
          settingSources: ['project'],
          canUseTool: (toolName, inputData) => {
            return {
              behavior: "allow",
              updatedInput: inputData,
            };
          },
          cwd: worktreePath,
        },
      });

      for await (const message of result) {
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

    // Always set status to review (both success and error cases)
    await sessionService.updateSessionStatus({
      sessionId: session.sessionId,
      status: "review"
    });

    console.log(`\nSession ${session.sessionId} moved to review`);

  } catch (error) {
    console.warn(`Failed to process session ${session.sessionId}:`, error);
  }
}
