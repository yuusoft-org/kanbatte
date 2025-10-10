import { query } from "@anthropic-ai/claude-agent-sdk";

export async function agent() {
  console.log("Starting claude agent...\n");

  const result = query({
    prompt: "Say hello and tell me what you can help me with in one sentence.",
  });
  console.log(result);

  for await (const message of result) {
    if (message.type === "assistant") {
      const text = message.message.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
      console.log("Agent:", text);
    } else if (message.type === "result") {
      console.log("\nCost: $" + message.total_cost_usd);
      console.log("Duration:", message.duration_ms + "ms");
    }
  }

  console.log("\nTest completed!");
}
