import { query } from "@anthropic-ai/claude-agent-sdk";
import * as commands from "../commands.js";
import { setupWorktree } from "../utils/git.js";

export async function agent(deps) {
  const { libsqlDao } = deps;

  const options = {
    canUseTool: (toolName, inputData) => {
      if (toolName === "Edit" || toolName === "Write") {
        return {
          behavior: "allow",
          updatedInput: inputData,
        };
      }

      return {
        behavior: "ask",
        updatedInput: inputData,
      };
    },
  };

  const readyTasks = await libsqlDao.getTasksByStatus("ready");

  if (readyTasks.length === 0) {
    console.log("No tasks with status 'ready' found");
    return;
  }

  const task = readyTasks[0];
  console.log(`Running agent for task: ${task.taskId}`);
  console.log(`Title: ${task.title}\n`);

  // Setup git worktree
  const worktreePath = await setupWorktree(task.taskId);
  console.log(`\nWorktree ready at: ${worktreePath}\n`);

  const systemPrompt = `You are working on task ${task.taskId}: ${task.title}
Current working directory: ${worktreePath}
Task status: ${task.status}

Work on implementing this task. You can read files, write code, and make changes.`;

  const result = query({
    prompt: `${systemPrompt}\n\nTask Description: ${task.description}`,
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
