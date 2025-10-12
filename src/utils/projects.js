import { readFileSync } from "fs";
import yaml from "js-yaml";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getProjects() {
  const projectsPath = join(__dirname, "../../projects.yaml");
  const content = readFileSync(projectsPath, "utf8");
  return yaml.load(content);
}

export function getProject(projectId) {
  const projects = getProjects();
  return projects.find((p) => p.projectId === projectId);
}
