import { exec } from "child_process";
import { promisify } from "util";
import { access, mkdir } from "fs/promises";
import { join, dirname, basename } from "path";

const execAsync = promisify(exec);

export const setupWorktree = async (worktreeId, repository) => {
  if (!repository) throw new Error(`Repository URL is required`);

  const repoName = getRepoName(repository);
  const cwd = process.cwd();
  const repoPath = join(cwd, "repositories", repoName);
  const worktreePath = join(cwd, "worktrees", worktreeId);

  await ensureRepo(repository, repoPath);
  await createWorktree(repoPath, worktreePath, worktreeId);

  return worktreePath;
}

// Private helper functions
const getProjectPrefix = (taskId) => {
  const match = taskId.match(/^([A-Z]+)-\d+$/);
  if (!match) throw new Error(`Invalid task ID: ${taskId}`);
  return match[1];
}

const getRepoName = (gitUrl) => {
  const match = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse repo URL: ${gitUrl}`);
  return match[1];
}

const ensureRepo = async (gitUrl, repoPath) => {
  try {
    await access(join(repoPath, ".git"));
    console.log(`Repo exists, fetching latest...`);
    await execAsync("git fetch origin", { cwd: repoPath });
    console.log(`Updating main branch from origin...`);
    await execAsync("git fetch origin main:main", { cwd: repoPath });
  } catch {
    console.log(`Cloning ${gitUrl}...`);
    const parent = dirname(repoPath);
    await mkdir(parent, { recursive: true });
    await execAsync(`git clone ${gitUrl} ${basename(repoPath)}`, {
      cwd: parent,
    });
    console.log(`Cloned successfully`);
  }
}

const createWorktree = async (repoPath, worktreePath, taskId) => {
  try {
    await access(worktreePath);
    console.log(`Worktree exists at ${worktreePath}`);
    return;
  } catch {}

  const branch = `task/${taskId.toLowerCase()}`;

  // Clean broken worktree if exists
  try {
    const { stdout } = await execAsync("git worktree list --porcelain", {
      cwd: repoPath,
    });
    if (stdout.includes(worktreePath)) {
      await execAsync("git worktree prune", { cwd: repoPath });
    }
  } catch {}

  try {
    await execAsync(`git worktree add -b ${branch} ${worktreePath}`, {
      cwd: repoPath,
    });
    console.log(`Created worktree with branch ${branch}`);
  } catch {
    try {
      await execAsync(`git worktree add ${worktreePath} ${branch}`, {
        cwd: repoPath,
      });
      console.log(`Using existing branch ${branch}`);
    } catch {
      await execAsync(`git worktree add -b ${branch} ${worktreePath} origin/main`, {
        cwd: repoPath,
      });
      console.log(`Created worktree from origin/main`);
    }
  }
}
