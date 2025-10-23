import { exec } from "child_process";
import { promisify } from "util";
import { query } from "@anthropic-ai/claude-agent-sdk";

const execAsync = promisify(exec);

async function generateMessage(worktreePath, type, taskId, taskTitle) {
  try {
    const diffCmd = type === "commit" ? "git diff --cached" : "git diff origin/main...HEAD";
    const { stdout: diff } = await execAsync(diffCmd, { cwd: worktreePath });

    if (!diff.trim()) {
      return type === "commit" ? taskTitle : `Implements ${taskTitle}`;
    }

    const prompt = type === "commit"
      ? `Write a simple commit message for these changes. Keep it minimal and clear. No AI mentions.\n\nChanges:\n${diff}\n\nReturn only the commit message, no additional text.`
      : `Write a brief PR description for these changes. Include what changed and why. Keep it simple.\n\nTask: ${taskTitle}\n\nChanges:\n${diff}\n\nReturn only the PR description, no additional text.`;

    const result = query({
      prompt,
      options: { canUseTool: () => ({ behavior: "deny" }) },
      cwd: worktreePath,
    });

    let messages = [];
    for await (const msg of result) {
      console.log(`Message type: ${msg.type}`);
      if (msg.type === "assistant") {
        const text = msg.message.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");
        messages.push(text);
        console.log(`Text chunk: ${text}`);
      }
    }

    const message = messages.join("").trim();
    console.log(`Full message (${type}): ${message}`);

    if (!message || message.length < 10) {
      return type === "commit" ? taskTitle : `Implements ${taskTitle}`;
    }

    return message;
  } catch (error) {
    console.warn(`Failed to generate ${type} message:`, error.message);
    return type === "commit" ? taskTitle : `Implements ${taskTitle}`;
  }
}

export async function commitAndPush(worktreePath, taskId, taskTitle) {
  await execAsync("git add .", { cwd: worktreePath });

  const { stdout: status } = await execAsync("git status --porcelain", {
    cwd: worktreePath,
  });

  if (!status.trim()) {
    console.log("No changes to commit");
    return null;
  }

  const message = await generateMessage(
    worktreePath,
    "commit",
    taskId,
    taskTitle,
  );
  const escaped = message.replace(/"/g, '\\"');

  await execAsync(`git commit -m "${escaped}"`, { cwd: worktreePath });
  console.log(`Committed: ${message}`);

  const branch = `task/${taskId.toLowerCase()}`;
  await execAsync(`git push -u origin ${branch}`, { cwd: worktreePath });
  console.log(`Pushed branch ${branch}`);

  return branch;
}

export async function createPR(worktreePath, taskId, taskTitle, description) {
  const branch = `task/${taskId.toLowerCase()}`;
  const prTitle = `${taskId}: ${taskTitle}`;
  const prBody = await generateMessage(worktreePath, "pr", taskId, taskTitle);

  const { stdout } = await execAsync(
    `gh pr create --title ${JSON.stringify(prTitle)} --body ${JSON.stringify(prBody)} --head ${branch}`,
    { cwd: worktreePath },
  );

  console.log(`PR created: ${stdout.trim()}`);
  return stdout.trim();
}
