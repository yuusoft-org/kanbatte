import { processSession } from "../utils/agent.js";

export const agent = async (deps) => {
  const { sessionService } = deps;
  const readySessions = await sessionService.getSessionsByStatus({ status: "ready" });

  if (readySessions.length === 0) {
    console.log("No sessions with status 'ready' found");
    return;
  }

  console.log(`Found ${readySessions.length} ready sessions`);

  for (const session of readySessions) {
    try {
      await processSession(session, deps);
    } catch (error) {
      console.warn(`Failed to process session ${session.sessionId}:`, error);
    }
  }

  console.log(`\nAll ${readySessions.length} sessions processed`);
};

export const agentStart = async (deps) => {
  while (true) {
    await agent(deps);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};
