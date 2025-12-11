import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { load } from "js-yaml";

const parseGitAuthor = (authorString) => {
  if (!authorString) return { name: null, email: null };
  const match = authorString.match(/^(.*)<(.*)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: authorString.trim(), email: null };
};

export const createConfigCommands = (deps) => {
  const { sessionService, discordService } = deps;

  const syncConfig = async (projectRoot) => {
    const configPath = join(projectRoot, "kanbatte.config.yaml");
    if (!existsSync(configPath)) {
      console.error(
        "Error: kanbatte.config.yaml not found in the project root.",
      );
      process.exit(1);
    }

    const configContent = readFileSync(configPath, "utf8");
    const config = load(configContent);

    console.log("Syncing projects...");
    if (config.projects && Array.isArray(config.projects)) {
      for (const project of config.projects) {
        if (!project.id || !project.gitRepository) {
          console.warn("Skipping invalid project entry:", project);
          continue;
        }

        const existingProject = await sessionService.getProjectById({
          projectId: project.id,
        });
        if (existingProject) {
          await sessionService.updateProject({
            projectId: project.id,
            validUpdates: {
              repository: project.gitRepository,
              name: project.name || project.id,
            },
          });
          console.log(`  - Updated project: ${project.id}`);
        } else {
          await sessionService.addProject({
            projectId: project.id,
            projectData: {
              projectId: project.id,
              name: project.name || project.id,
              repository: project.gitRepository,
              description: project.description || "",
            },
          });
          console.log(`  - Created project: ${project.id}`);
        }
      }
    }

    if (config.discord) {
      console.log("\nSyncing Discord settings...");

      if (config.discord.users && Array.isArray(config.discord.users)) {
        for (const user of config.discord.users) {
          if (!user.userId || !user.gitAuthor) {
            console.warn("Skipping invalid user entry:", user);
            continue;
          }
          const { name, email } = parseGitAuthor(user.gitAuthor);
          if (!name || !email) {
            console.warn(`Skipping invalid gitAuthor format: ${user.gitAuthor}`);
            continue;
          }
          await discordService.addUserEmailRecord({
            userId: user.userId.toString(),
            name,
            email,
          });
          console.log(`  - Synced user: ${user.userId} -> ${user.gitAuthor}`);
        }
      }

      if (config.discord.servers && Array.isArray(config.discord.servers)) {
        const existingChannels = await discordService.listProjects();
        const existingChannelMap = new Map(
          existingChannels.map((c) => [c.projectId, c]),
        );
        let allAllowedRoles = [];

        for (const server of config.discord.servers) {
          if (server.allowedRoles && Array.isArray(server.allowedRoles)) {
            allAllowedRoles.push(...server.allowedRoles);
          }

          if (server.channels && Array.isArray(server.channels)) {
            for (const channel of server.channels) {
              if (!channel.projectId || !channel.channelId) {
                console.warn("Skipping invalid channel entry:", channel);
                continue;
              }
              const payload = {
                projectId: channel.projectId,
                channelId: channel.channelId.toString(),
              };
              if (existingChannelMap.has(payload.projectId)) {
                await discordService.updateChannel({
                  projectId: payload.projectId,
                  validUpdates: { channel: payload.channelId },
                });
                console.log(
                  `  - Updated channel for project ${payload.projectId} to ${payload.channelId}`,
                );
              } else {
                await discordService.addChannel({
                  projectId: payload.projectId,
                  channelData: { channel: payload.channelId },
                });
                console.log(
                  `  - Added channel for project ${payload.projectId}: ${payload.channelId}`,
                );
              }
            }
          }
        }

        if (allAllowedRoles.length > 0) {
          const uniqueRoles = [...new Set(allAllowedRoles.map(String))];
          await discordService.setAllowedRoleIds({ roleIds: uniqueRoles });
          console.log(`  - Synced allowed roles: ${uniqueRoles.join(", ")}`);
        }
      }
    }

    console.log("\nConfig sync completed successfully!");
  };

  return { syncConfig };
};