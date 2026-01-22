import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const createGitService = () => {
  const commit = async (payload) => {
    const { worktreePath, commitMessage, authorName, authorEmail } = payload;

    await execAsync(`git config user.name "${authorName}"`, { cwd: worktreePath });
    await execAsync(`git config user.email "${authorEmail}"`, { cwd: worktreePath });

    const { stdout } = await execAsync("git status --porcelain", {
      cwd: worktreePath,
    });

    if (!stdout.trim()) {
      return; // nothing to commit
    }

    await execAsync("git add .", { cwd: worktreePath });
    await execAsync(`git commit -m "${commitMessage}"`, {
      cwd: worktreePath,
    });
  };

  const push = async (payload) => {
    const { worktreePath, branchName } = payload;
    await execAsync(`git push origin ${branchName}`, {
      cwd: worktreePath,
    });
  };

  const createPR = async (payload) => {
    const { worktreePath, branchName, title, body } = payload;
    try {
      await execAsync(`gh pr view ${branchName}`, { cwd: worktreePath });
      return;
    } catch (error) {
      if (!error.stderr.includes("no pull requests found for branch")) {
        throw error;
      }
    }

    await execAsync(
      `gh pr create --base "main" --head "${branchName}" --title "${title}" --body "${body}"`,
      { cwd: worktreePath },
    );
  };

  return {
    commit,
    push,
    createPR,
  };
};