import { existsSync, rmSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, readFileSync } from "fs";
import { join, basename } from "path";
import yaml from "js-yaml";

export function removeDirectory(dirPath) {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}

export function copyDirectory(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export function copyDirectoryOverwrite(src, dest) {
  // Ensure destination exists
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryOverwrite(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath); // This will overwrite existing files
    }
  }
}

export function processTaskFile(srcPath, destPath) {
  const content = readFileSync(srcPath, 'utf8');

  // Split content into frontmatter and body
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.warn(`No frontmatter found in ${srcPath}`);
    return;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Parse existing frontmatter
  const frontmatterLines = frontmatter.split('\n');
  const updatedLines = [];

  // Process existing frontmatter and transform status/priority
  for (const line of frontmatterLines) {
    if (line.startsWith('template:') || line.startsWith('tags:')) {
      // Skip these, we'll add them fresh
      continue;
    } else if (line.startsWith('status:')) {
      // Transform status to capitalize first letter
      const status = line.replace('status:', '').trim();
      const upperCaseStatus = status.charAt(0).toUpperCase() + status.slice(1);
      updatedLines.push(`status: ${upperCaseStatus}`);
    } else if (line.startsWith('priority:')) {
      // Transform priority to capitalize first letter
      const priority = line.replace('priority:', '').trim();
      const upperCasePriority = priority.charAt(0).toUpperCase() + priority.slice(1);
      updatedLines.push(`priority: ${upperCasePriority}`);
    } else {
      // Keep other lines as is
      updatedLines.push(line);
    }
  }

  // Add required frontmatter
  updatedLines.push('template: task');
  updatedLines.push('tags: tasks');

  // Reconstruct content
  const updatedContent = `---\n${updatedLines.join('\n')}\n---${body}`;

  writeFileSync(destPath, updatedContent);
}

export function processAllTaskFiles(tasksDir, destTasksDir) {
  if (!existsSync(destTasksDir)) {
    mkdirSync(destTasksDir, { recursive: true });
  }

  // Recursively find all markdown files in tasks directory
  function findMarkdownFiles(dir, fileList = []) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        findMarkdownFiles(fullPath, fileList);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const markdownFiles = findMarkdownFiles(tasksDir);

  for (const srcPath of markdownFiles) {
    const fileName = srcPath.split('/').pop(); // Get just the filename
    const destPath = join(destTasksDir, fileName);
    processTaskFile(srcPath, destPath);
  }
}

function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  try {
    return yaml.load(frontmatterMatch[1]);
  } catch (error) {
    console.warn(`Failed to parse frontmatter: ${error.message}`);
    return null;
  }
}

function extractTaskId(filePath) {
  const fileName = basename(filePath, '.md');
  return fileName; // Get the filename without extension (e.g., TASK-001)
}

function sortTasks(tasks) {
  const priorityMap = {
    high: 3,
    medium: 2,
    low: 1
  };

  return [...tasks].sort((a, b) => {
    const prioA = priorityMap[a.data.priority] || 0;
    const prioB = priorityMap[b.data.priority] || 0;

    if (prioB !== prioA) {
      return prioB - prioA; // descending order by priority
    } else {
      return a.id.localeCompare(b.id); // ascending order by id
    }
  });
}


export function generateTasksData(tasksDir, destDataDir) {
  if (!existsSync(tasksDir)) {
    console.log("⚠ No tasks directory found, skipping tasks data generation");
    return;
  }

  if (!existsSync(destDataDir)) {
    mkdirSync(destDataDir, { recursive: true });
  }

  // Find all markdown files in tasks directory
  function findMarkdownFiles(dir, fileList = []) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        findMarkdownFiles(fullPath, fileList);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const markdownFiles = findMarkdownFiles(tasksDir);
  const tasks = [];

  for (const filePath of markdownFiles) {
    const content = readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(content);

    if (frontmatter) {
      const taskId = extractTaskId(filePath);
      const fileName = basename(filePath, '.md');

      // Transform status and priority to capitalize first letter (for consistency with processTaskFile)
      const status = frontmatter.status;
      const priority = frontmatter.priority;
      const upperCaseStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
      const upperCasePriority = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : priority;

      
      tasks.push({
        id: taskId,
        filename: fileName,
        data: {
          title: frontmatter.title,
          status: upperCaseStatus,
          priority: upperCasePriority
        }
      });
    }
  }

  // Separate todo and done tasks
  const todoTasks = sortTasks(tasks.filter(task => task.data.status === 'Todo'));
  const doneTasks = sortTasks(tasks.filter(task => task.data.status === 'Done'));

  // Create the data structure
  const tasksData = {
    todo: todoTasks,
    done: doneTasks,
    meta: {
      total: tasks.length,
      todo: todoTasks.length,
      done: doneTasks.length
    }
  };

  // Write to tasks.yaml
  const tasksYamlPath = join(destDataDir, 'tasks.yaml');
  const yamlContent = yaml.dump(tasksData, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });

  writeFileSync(tasksYamlPath, yamlContent);
}