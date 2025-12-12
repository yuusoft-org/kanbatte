import fs from 'fs';
import path from 'path';
import { validateConfig, formatValidationResults } from '../utils/configValidator.js';

export const createConfigCommands = (deps) => {
  const { configService } = deps;

  const validateConfigFile = async (options) => {
    const configPath = options.file || configService.getConfigPath();

    if (!fs.existsSync(configPath)) {
      console.error(`Configuration file not found: ${configPath}`);
      console.log('\nTo create a new configuration file:');
      console.log(`1. Copy the example: cp kanbatte.config.yaml.example ${configPath}`);
      console.log('2. Edit the file with your settings');
      return;
    }

    try {
      // Load and validate config
      if (options.file) {
        configService.setConfigPath(options.file);
      }
      const config = configService.getConfig();
      const results = validateConfig(config);

      console.log(formatValidationResults(results));

      if (!results.isValid) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to validate configuration:', error.message);
      process.exit(1);
    }
  };

  const showConfig = async (options) => {
    const configPath = options.file || configService.getConfigPath();

    if (!fs.existsSync(configPath)) {
      console.error(`Configuration file not found: ${configPath}`);
      return;
    }

    try {
      if (options.file) {
        configService.setConfigPath(options.file);
      }
      const config = configService.getConfig();

      if (options.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(`Configuration from: ${configPath}\n`);

        // Show projects
        if (config.projects && config.projects.length > 0) {
          console.log('📦 Projects:');
          config.projects.forEach(project => {
            console.log(`  • ${project.id}`);
            if (project.name) console.log(`    Name: ${project.name}`);
            if (project.gitRepository) console.log(`    Repository: ${project.gitRepository}`);
            if (project.description) console.log(`    Description: ${project.description}`);
          });
          console.log();
        } else {
          console.log('📦 No projects configured\n');
        }

        // Show Discord configuration
        if (config.discord) {
          if (config.discord.users && config.discord.users.length > 0) {
            console.log('👤 Discord Users:');
            config.discord.users.forEach(user => {
              console.log(`  • User ID: ${user.userId}`);
              if (user.gitAuthor) console.log(`    Git Author: ${user.gitAuthor}`);
              if (user.name) console.log(`    Name: ${user.name}`);
              if (user.email) console.log(`    Email: ${user.email}`);
            });
            console.log();
          }

          if (config.discord.servers && config.discord.servers.length > 0) {
            console.log('🖥️  Discord Servers:');
            config.discord.servers.forEach(server => {
              console.log(`  • ${server.name || 'Unnamed'} (Guild ID: ${server.guildId})`);

              if (server.channels && server.channels.length > 0) {
                console.log('    Channels:');
                server.channels.forEach(channel => {
                  console.log(`      - Project: ${channel.projectId}, Channel ID: ${channel.channelId}`);
                });
              }

              if (server.allowedRoles && server.allowedRoles.length > 0) {
                console.log(`    Allowed Roles: ${server.allowedRoles.join(', ')}`);
              }
            });
            console.log();
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }
  };

  const initConfig = async (options) => {
    const targetPath = options.file || path.join(process.cwd(), 'kanbatte.config.yaml');
    const examplePath = path.join(process.cwd(), 'kanbatte.config.yaml.example');

    if (fs.existsSync(targetPath) && !options.force) {
      console.error(`Configuration file already exists: ${targetPath}`);
      console.log('Use --force to overwrite');
      return;
    }

    if (fs.existsSync(examplePath)) {
      // Copy example file
      try {
        const content = fs.readFileSync(examplePath, 'utf8');
        fs.writeFileSync(targetPath, content, 'utf8');
        console.log(`✅ Configuration file created: ${targetPath}`);
        console.log('Please edit the file to add your settings');
      } catch (error) {
        console.error('❌ Failed to create configuration file:', error.message);
        process.exit(1);
      }
    } else {
      // Create minimal config
      const minimalConfig = {
        projects: [],
        discord: {
          users: [],
          servers: []
        }
      };

      try {
        const yaml = require('js-yaml');
        const content = yaml.dump(minimalConfig, { indent: 2 });
        fs.writeFileSync(targetPath, content, 'utf8');
        console.log(`✅ Minimal configuration file created: ${targetPath}`);
        console.log('Please edit the file to add your settings');
      } catch (error) {
        console.error('❌ Failed to create configuration file:', error.message);
        process.exit(1);
      }
    }
  };

  const reloadConfig = async () => {
    try {
      const config = configService.reloadConfig();
      const results = validateConfig(config);

      console.log('🔄 Configuration reloaded');
      console.log(formatValidationResults(results));

      if (!results.isValid) {
        console.log('\n⚠️  Configuration has errors but was loaded');
      }
    } catch (error) {
      console.error('❌ Failed to reload configuration:', error.message);
      process.exit(1);
    }
  };

  const getConfigPath = async () => {
    console.log(configService.getConfigPath());
  };

  // Migration helper from database to config file
  const migrateFromDatabase = async (options) => {
    const { sessionService, discordService } = deps;

    if (!sessionService || !discordService) {
      console.error('Migration requires both sessionService and discordService');
      return;
    }

    try {
      console.log('🔄 Starting migration from database to config file...\n');

      // Get existing data from database
      const projects = await sessionService.listProjects();
      const discordUsers = await discordService.listUserEmailRecords();
      const discordProjects = await discordService.listProjects();

      // Build config structure
      const config = configService.getConfig();

      // Migrate projects
      if (projects.length > 0) {
        console.log(`📦 Migrating ${projects.length} projects...`);
        projects.forEach(project => {
          const existingProject = config.projects.find(p => p.id === project.projectId);
          if (!existingProject) {
            config.projects.push({
              id: project.projectId,
              name: project.name,
              gitRepository: project.repository,
              description: project.description
            });
            console.log(`  ✓ Migrated project: ${project.projectId}`);
          } else {
            console.log(`  ⚠️  Project already exists in config: ${project.projectId}`);
          }
        });
      }

      // Migrate Discord users
      if (discordUsers.length > 0) {
        console.log(`\n👤 Migrating ${discordUsers.length} Discord users...`);
        if (!config.discord) config.discord = {};
        if (!config.discord.users) config.discord.users = [];

        discordUsers.forEach(user => {
          const existingUser = config.discord.users.find(u => u.userId === user.userId);
          if (!existingUser) {
            config.discord.users.push({
              userId: user.userId,
              gitAuthor: `${user.name} <${user.email}>`,
              name: user.name,
              email: user.email
            });
            console.log(`  ✓ Migrated user: ${user.userId} (${user.name})`);
          } else {
            console.log(`  ⚠️  User already exists in config: ${user.userId}`);
          }
        });
      }

      // Migrate Discord channels (need to be grouped by server)
      if (discordProjects.length > 0) {
        console.log(`\n📢 Found ${discordProjects.length} Discord channel mappings`);
        console.log('  ⚠️  Note: Channel mappings need to be manually grouped by Discord server');
        console.log('  Please edit the config file and add appropriate server configurations');

        if (!config.discord) config.discord = {};
        if (!config.discord.servers) config.discord.servers = [];

        // Create a default server entry if none exists
        if (config.discord.servers.length === 0) {
          config.discord.servers.push({
            name: 'DEFAULT_SERVER',
            guildId: 'REPLACE_WITH_GUILD_ID',
            channels: [],
            allowedRoles: []
          });
        }

        discordProjects.forEach(project => {
          if (project.channel) {
            console.log(`  Channel ${project.channel} -> Project ${project.projectId}`);
            // Add to the first server as an example
            if (!config.discord.servers[0].channels) {
              config.discord.servers[0].channels = [];
            }
            const existingChannel = config.discord.servers[0].channels.find(
              c => c.channelId === project.channel
            );
            if (!existingChannel) {
              config.discord.servers[0].channels.push({
                projectId: project.projectId,
                channelId: project.channel
              });
            }
          }
        });
      }

      // Get allowed roles
      const allowedRoles = await discordService.getAllowedRoleIds();
      if (allowedRoles.length > 0) {
        console.log(`\n🔐 Found ${allowedRoles.length} allowed role IDs`);
        console.log('  ⚠️  Note: Role IDs need to be assigned to appropriate Discord servers');

        if (config.discord.servers.length > 0) {
          config.discord.servers[0].allowedRoles = allowedRoles;
        }
      }

      // Save config
      if (options.dryRun) {
        console.log('\n🔍 Dry run - Configuration preview:');
        console.log(JSON.stringify(config, null, 2));
      } else {
        configService.writeConfig(config);
        console.log('\n✅ Migration complete!');
        console.log(`Configuration saved to: ${configService.getConfigPath()}`);
        console.log('\n⚠️  Important: Please review and edit the configuration file:');
        console.log('  1. Replace DEFAULT_SERVER with actual Discord server name');
        console.log('  2. Replace REPLACE_WITH_GUILD_ID with actual Discord guild ID');
        console.log('  3. Verify all channel and role IDs are correct');
        console.log('  4. Group channels by their appropriate Discord servers if needed');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  };

  return {
    validateConfigFile,
    showConfig,
    initConfig,
    reloadConfig,
    getConfigPath,
    migrateFromDatabase,
  };
};