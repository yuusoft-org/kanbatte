import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  rmSync,
} from "fs";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const validateConfig = (config) => {
  if (!config || typeof config !== "object") {
    throw new Error("Config must be an object");
  }

  if (!Array.isArray(config.workspaces)) {
    throw new Error("Config must have a 'workspaces' array");
  }

  for (const workspace of config.workspaces) {
    if (!workspace.name || typeof workspace.name !== "string") {
      throw new Error("Each workspace must have a 'name' string");
    }

    if (!Array.isArray(workspace.projects)) {
      throw new Error(
        `Workspace '${workspace.name}' must have a 'projects' array`,
      );
    }

    for (const project of workspace.projects) {
      if (!project.name || typeof project.name !== "string") {
        throw new Error(
          `Each project in workspace '${workspace.name}' must have a 'name' string`,
        );
      }

      if (!project.url || typeof project.url !== "string") {
        throw new Error(
          `Project '${project.name}' in workspace '${workspace.name}' must have a 'url' string`,
        );
      }
    }
  }
};

export const writeConfigJson = (fs, aggregateDir, config) => {
  if (!fs.existsSync(aggregateDir)) {
    fs.mkdirSync(aggregateDir, { recursive: true });
  }
  const configJsonPath = join(aggregateDir, "kanbatte.config.json");
  fs.writeFileSync(configJsonPath, JSON.stringify(config, null, 2));
};

export const buildAggregateSpa = async (aggregateDir) => {
  const siteAggregateDir = join(__dirname, "../../site-aggregate");
  const staticDir = join(siteAggregateDir, "static");

  // Ensure aggregate output directory exists
  if (!existsSync(aggregateDir)) {
    mkdirSync(aggregateDir, { recursive: true });
  }

  // Ensure public directory exists for JS output
  const publicDir = join(aggregateDir, "public");
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  console.log("Building aggregate SPA...");

  // Build the JS bundle using a Node script in the site-aggregate directory
  // TODO: currently using child process, resolve this later
  const buildScript = `
    const { build } = require('@rettangoli/fe/cli');
    build({
      dirs: ['./fe/pages'],
      outfile: './_build/main.js',
      setup: './fe/setup.js',
      development: false
    }).catch(err => { console.error(err); process.exit(1); });
  `;

  execSync(
    `node -e "${buildScript.replace(/"/g, '\\"').replace(/\n/g, " ")}"`,
    {
      cwd: siteAggregateDir,
      stdio: "inherit",
    },
  );

  // Copy built JS to aggregate public directory
  const builtJs = join(siteAggregateDir, "_build", "main.js");
  if (existsSync(builtJs)) {
    cpSync(builtJs, join(publicDir, "main.js"));
  }

  // Copy static files (index.html)
  const indexHtmlSrc = join(staticDir, "index.html");
  if (existsSync(indexHtmlSrc)) {
    cpSync(indexHtmlSrc, join(aggregateDir, "index.html"));
  }

  // Clean up build artifacts
  const tempDir = join(siteAggregateDir, ".temp");
  const buildDir = join(siteAggregateDir, "_build");
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (existsSync(buildDir)) {
    rmSync(buildDir, { recursive: true, force: true });
  }

  console.log(`  -> Aggregate SPA built to ${aggregateDir}`);
};
