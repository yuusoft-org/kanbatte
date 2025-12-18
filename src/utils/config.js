import { readFileSync } from "fs";
import { load } from "js-yaml";

export const parseGitAuthor = (gitAuthor) => {
  if (!gitAuthor) return null;
  const match = gitAuthor.match(/(.+?)\s*<(.+)>/);
  if (!match) {
    console.warn(
      `Invalid gitAuthor format: "${gitAuthor}". Expected "Name <email@example.com>".`,
    );
    return null;
  }
  return { name: match[1].trim(), email: match[2].trim() };
};

export const loadConfig = (configPath) => {
  try {
    const fileContents = readFileSync(configPath, "utf8");
    const config = load(fileContents);

    // Parse gitAuthor for all discord users
    if (config.discord && config.discord.users) {
      config.discord.users = config.discord.users.map((user) => ({
        ...user,
        ...parseGitAuthor(user.gitAuthor),
      }));
    }

    return config;
  } catch (error) {
    // if (error.code === 'ENOENT') {
    //   throw new Error(`Config file not found at ${configPath}. Please create kanbatte.config.yaml.`);
    // }
    // throw new Error(`Error parsing config file ${configPath}: ${error.message}`);
    return {};
  }
};
