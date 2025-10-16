import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function commitAndPush(worktreePath, taskId, taskTitle) {
  // Stage all changes
  await execAsync("git add .", { cwd: worktreePath });

  // Check if there are changes to commit
  const { stdout: status } = await execAsync("git status --porcelain", {
    cwd: worktreePath,
  });

  if (!status.trim()) {
    console.log("No changes to commit");
    return null;
  }

  // Commit with task info
  const message = `${taskId}: ${taskTitle}`;
  await execAsync(`git commit -m "${message}"`, { cwd: worktreePath });
  console.log(`Committed: ${message}`);

  // Push branch
  const branch = `task/${taskId.toLowerCase()}`;
  await execAsync(`git push -u origin ${branch}`, { cwd: worktreePath });
  console.log(`Pushed branch ${branch}`);

  return branch;
}

export async function createPR(worktreePath, taskId, taskTitle, description) {
  const branch = `task/${taskId.toLowerCase()}`;
  const prTitle = `${taskId}: ${taskTitle}`;
  const prBody = description || taskTitle;

  try {
    const { stdout } = await execAsync(
      `gh pr create --title "${prTitle}" --body "${prBody}" --head ${branch}`,
      { cwd: worktreePath },
    );
    console.log(`PR created: ${stdout.trim()}`);
    return stdout.trim();
  } catch (error) {
    console.error(`Failed to create PR: ${error.message}`);
    throw error;
  }
}
