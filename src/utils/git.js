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
};

const getRepoName = (gitUrl) => {
  const match = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse repo URL: ${gitUrl}`);
  return match[1];
};

const ensureRepo = async (gitUrl, repoPath) => {
  let gitRepositoryExists = false;
  try {
    await access(join(repoPath, ".git"));
    gitRepositoryExists = true;
  } catch {
    gitRepositoryExists = false;
  }

  if (gitRepositoryExists) {
    try {
      console.log(`Repo exists, pulling latest changes from main...`);
      await execAsync("git switch main", { cwd: repoPath });
      await execAsync("git pull origin main", { cwd: repoPath });
    } catch (pullError) {
      console.warn(`Warning: Failed to pull updates for ${repoPath}. Continuing with local version.`, pullError);
    }
  } else {
    console.log(`Cloning ${gitUrl}...`);
    const parent = dirname(repoPath);
    await mkdir(parent, { recursive: true });
    await execAsync(`git clone ${gitUrl} ${basename(repoPath)}`, {
      cwd: parent,
    });
    console.log(`Cloned successfully`);
  }
};

const createWorktree = async (repoPath, worktreePath, taskId) => {
  try {
    await access(worktreePath);
    console.log(`Worktree exists at ${worktreePath}, reusing.`);
    return;
  } catch {}

  const branch = `task/${taskId.toLowerCase()}`;

  await execAsync("git worktree prune", { cwd: repoPath }).catch((e) =>
    console.warn("Could not prune worktrees, continuing...", e.message),
  );

  let branchExists = false;
  try {
    await execAsync(`git show-ref --verify refs/heads/${branch}`, { cwd: repoPath });
    branchExists = true;
  } catch {}

  if (branchExists) {
    console.log(`Branch '${branch}' already exists. Creating worktree from it.`);
    await execAsync(`git worktree add ${worktreePath} ${branch}`, {
      cwd: repoPath,
    });
  } else {
    console.log(`Creating new branch '${branch}' and worktree from main.`);
    await execAsync(`git worktree add -b ${branch} ${worktreePath} main`, {
      cwd: repoPath,
    });
  }

  console.log(`Worktree for branch '${branch}' is ready at ${worktreePath}`);
};