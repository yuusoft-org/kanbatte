import { exec } from "child_process";
import { promisify } from "util";
import { access, mkdir } from "fs/promises";
import { join, dirname, basename } from "path";
import { getProject } from "./projects.js";

const execAsync = promisify(exec);

function getProjectPrefix(taskId) {
  const match = taskId.match(/^([A-Z]+)-\d+$/);
  if (!match) throw new Error(`Invalid task ID: ${taskId}`);
  return match[1];
}

function getRepoName(gitUrl) {
  const match = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse repo URL: ${gitUrl}`);
  return match[1];
}

async function ensureRepo(gitUrl, repoPath) {
  try {
    await access(join(repoPath, ".git"));
    console.log(`Repo exists, fetching latest...`);
    await execAsync("git fetch origin", { cwd: repoPath });
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

async function createWorktree(repoPath, worktreePath, taskId) {
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

export async function setupWorktree(taskId) {
  const prefix = getProjectPrefix(taskId);
  const project = getProject(prefix);

  if (!project) throw new Error(`Project ${prefix} not found`);
  if (!project.repository)
    throw new Error(`No repository for project ${prefix}`);

  const repoName = getRepoName(project.repository);
  const cwd = process.cwd();
  const repoPath = join(cwd, "repositories", repoName);
  const worktreePath = join(cwd, "worktrees", taskId);

  await ensureRepo(project.repository, repoPath);
  await createWorktree(repoPath, worktreePath, taskId);

  return worktreePath;
}
