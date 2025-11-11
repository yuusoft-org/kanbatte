import { existsSync, rmSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

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

  // Add existing frontmatter (excluding template and tags if they exist)
  for (const line of frontmatterLines) {
    if (!line.startsWith('template:') && !line.startsWith('tags:')) {
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