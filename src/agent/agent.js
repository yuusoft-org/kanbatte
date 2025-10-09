import { query } from "@anthropic-ai/claude-agent-sdk";

export async function agent() {
  console.log("Starting test agent...\n");

  const result = query({
    prompt: "Say hello and tell me what you can help me with in one sentence.",
  });

  for await (const message of result) {
    if (message.type === "result") {
      console.log("Agent response:", message.result);
      console.log("Cost: $" + message.total_cost_usd);
      console.log("Duration:", message.duration_ms + "ms");
    }
  }

  console.log("\nTest completed!");
}

agent().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
