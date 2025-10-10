import { query } from "@anthropic-ai/claude-agent-sdk";
import * as commands from "../commands.js";

export async function agent(deps) {
  const { libsqlDao } = deps;

  const readyTasks = await libsqlDao.getTasksByStatus("ready");

  if (readyTasks.length === 0) {
    console.log("No tasks with status 'ready' found");
    return;
  }

  const task = readyTasks[0];
  console.log(`Running agent for task: ${task.taskId}`);
  console.log(`Title: ${task.title}\n`);

  const prompt = `Analyze this task and provide a brief plan or approach. Do not implement anything, do not read files, just provide your analysis based on the task description.

Task: ${task.title}
Description: ${task.description}

Provide a brief response (2-3 sentences) with your analysis.`;

  const result = query({ prompt });
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

  await commands.addComment(deps, {
    taskId: task.taskId,
    content: agentResponse.trim(),
  });

  await commands.updateTask(deps, {
    taskId: task.taskId,
    status: "review",
  });

  console.log(`\nTask ${task.taskId} moved to review`);
}
