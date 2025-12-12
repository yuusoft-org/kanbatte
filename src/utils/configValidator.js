export const validateConfig = (config) => {
  const errors = [];
  const warnings = [];

  // Validate basic structure
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { isValid: false, errors, warnings };
  }

  // Validate projects
  if (config.projects) {
    if (!Array.isArray(config.projects)) {
      errors.push('Projects must be an array');
    } else {
      const projectIds = new Set();
      config.projects.forEach((project, index) => {
        if (!project.id) {
          errors.push(`Project at index ${index} is missing required field 'id'`);
        } else {
          if (projectIds.has(project.id)) {
            errors.push(`Duplicate project ID: ${project.id}`);
          }
          projectIds.add(project.id);

          // Validate project ID format (alphanumeric, dashes, underscores)
          if (!/^[a-zA-Z0-9_-]+$/.test(project.id)) {
            errors.push(`Invalid project ID format: ${project.id}. Must be alphanumeric with dashes or underscores only.`);
          }
        }

        if (!project.gitRepository && !project.name) {
          warnings.push(`Project ${project.id} has no name or repository defined`);
        }

        if (project.gitRepository && typeof project.gitRepository !== 'string') {
          errors.push(`Project ${project.id} has invalid gitRepository type (must be string)`);
        }
      });
    }
  }

  // Validate Discord configuration
  if (config.discord) {
    if (typeof config.discord !== 'object') {
      errors.push('Discord configuration must be an object');
    } else {
      // Validate users
      if (config.discord.users) {
        if (!Array.isArray(config.discord.users)) {
          errors.push('Discord users must be an array');
        } else {
          const userIds = new Set();
          config.discord.users.forEach((user, index) => {
            if (!user.userId) {
              errors.push(`Discord user at index ${index} is missing required field 'userId'`);
            } else {
              if (userIds.has(user.userId)) {
                errors.push(`Duplicate Discord user ID: ${user.userId}`);
              }
              userIds.add(user.userId);

              // Validate Discord user ID (should be numeric string)
              if (!/^\d+$/.test(user.userId)) {
                warnings.push(`Discord user ID ${user.userId} doesn't appear to be a valid Discord ID (should be numeric)`);
              }
            }

            if (!user.gitAuthor && (!user.name || !user.email)) {
              errors.push(`Discord user ${user.userId} must have either gitAuthor or both name and email`);
            }

            // Validate gitAuthor format if present
            if (user.gitAuthor && typeof user.gitAuthor === 'string') {
              const gitAuthorRegex = /^[^<>]+\s+<[^<>]+@[^<>]+>$/;
              if (!gitAuthorRegex.test(user.gitAuthor)) {
                warnings.push(`Discord user ${user.userId} has gitAuthor in unexpected format. Expected: "Name <email@example.com>"`);
              }
            }
          });
        }
      }

      // Validate servers
      if (config.discord.servers) {
        if (!Array.isArray(config.discord.servers)) {
          errors.push('Discord servers must be an array');
        } else {
          const guildIds = new Set();
          const allChannelIds = new Set();

          config.discord.servers.forEach((server, serverIndex) => {
            if (!server.guildId) {
              errors.push(`Discord server at index ${serverIndex} is missing required field 'guildId'`);
            } else {
              if (guildIds.has(server.guildId)) {
                errors.push(`Duplicate Discord server guild ID: ${server.guildId}`);
              }
              guildIds.add(server.guildId);

              // Validate Discord guild ID (should be numeric string)
              if (!/^\d+$/.test(server.guildId)) {
                warnings.push(`Discord guild ID ${server.guildId} doesn't appear to be a valid Discord ID (should be numeric)`);
              }
            }

            if (!server.name) {
              warnings.push(`Discord server ${server.guildId} has no name`);
            }

            // Validate channels
            if (server.channels) {
              if (!Array.isArray(server.channels)) {
                errors.push(`Channels for server ${server.name || server.guildId} must be an array`);
              } else {
                server.channels.forEach((channel, channelIndex) => {
                  if (!channel.projectId) {
                    errors.push(`Channel at index ${channelIndex} in server ${server.name || server.guildId} is missing required field 'projectId'`);
                  } else {
                    // Check if project exists
                    if (config.projects && !config.projects.some(p => p.id === channel.projectId)) {
                      errors.push(`Channel in server ${server.name || server.guildId} references non-existent project: ${channel.projectId}`);
                    }
                  }

                  if (!channel.channelId) {
                    errors.push(`Channel at index ${channelIndex} in server ${server.name || server.guildId} is missing required field 'channelId'`);
                  } else {
                    if (allChannelIds.has(channel.channelId)) {
                      warnings.push(`Duplicate channel ID across servers: ${channel.channelId}`);
                    }
                    allChannelIds.add(channel.channelId);

                    // Validate Discord channel ID (should be numeric string)
                    if (!/^\d+$/.test(channel.channelId)) {
                      warnings.push(`Discord channel ID ${channel.channelId} doesn't appear to be a valid Discord ID (should be numeric)`);
                    }
                  }
                });
              }
            }

            // Validate allowed roles
            if (server.allowedRoles) {
              if (!Array.isArray(server.allowedRoles)) {
                errors.push(`Allowed roles for server ${server.name || server.guildId} must be an array`);
              } else {
                server.allowedRoles.forEach((roleId, roleIndex) => {
                  if (typeof roleId !== 'string') {
                    errors.push(`Role ID at index ${roleIndex} in server ${server.name || server.guildId} must be a string`);
                  } else if (!/^\d+$/.test(roleId)) {
                    warnings.push(`Role ID ${roleId} in server ${server.name || server.guildId} doesn't appear to be a valid Discord ID (should be numeric)`);
                  }
                });
              }
            }
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const formatValidationResults = (results) => {
  const lines = [];

  if (results.isValid) {
    lines.push('✅ Configuration is valid');
  } else {
    lines.push('❌ Configuration has errors');
  }

  if (results.errors.length > 0) {
    lines.push('\nErrors:');
    results.errors.forEach(error => {
      lines.push(`  ❌ ${error}`);
    });
  }

  if (results.warnings.length > 0) {
    lines.push('\nWarnings:');
    results.warnings.forEach(warning => {
      lines.push(`  ⚠️  ${warning}`);
    });
  }

  return lines.join('\n');
};