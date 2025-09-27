import { promises as fs } from 'fs';

export async function parseTaskFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    const titleLine = lines[0].trim();
    if (!titleLine.startsWith('#')) {
      throw new Error('File must start with # title line');
    }

    const titleContent = titleLine.substring(1).trim();
    const parts = titleContent.split(' - ');

    if (parts.length !== 2) {
      throw new Error('Title line must follow format: # ${projectId} - ${taskTitle}');
    }

    const [projectId, taskTitle] = parts.map(p => p.trim());

    if (!projectId || !taskTitle) {
      throw new Error('Both project ID and task title are required');
    }

    const description = lines.slice(2).join('\n').trim();

    return {
      projectId,
      title: taskTitle,
      description
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}