import { createDiscordServiceWithConfig } from "./services/discordServiceWithConfig.js";
import { createUserCommandsWithConfig } from "./commands/user-with-config.js";
import { createBotCommandsWithConfig } from "./commands/bot-with-config.js";
import { createChannelCommandsWithConfig } from "./commands/channel-with-config.js";

export const setupDiscordCliWithConfig = (args) => {
  const { cmd, sessionService, discordLibsqlInfra, configService } = args;

  const discordService = createDiscordServiceWithConfig({
    discordLibsql: discordLibsqlInfra,
    configService,
  });

  const userCommands = createUserCommandsWithConfig({ configService });
  const botCommands = createBotCommandsWithConfig({
    discordService,
    sessionService,
    discordLibsqlInfra,
    configService,
  });
  const channelCommands = createChannelCommandsWithConfig({ configService });

  // Discord DB setup command
  const dbCmd = cmd.command("db").description("Database operations");

  dbCmd
    .command("setup")
    .description("Set up Discord database")
    .action(async () => {
      console.log("Setting up Discord database");
      discordLibsqlInfra.init();
      await discordLibsqlInfra.migrateDb();
      console.log("Discord database setup completed!");
    });

  // Discord user commands - NOW USES CONFIG FILE
  const userCmd = cmd
    .command("user")
    .description("Manage Discord user to Git author mappings");

  userCmd
    .command("add")
    .description("Bind a Discord user ID to a Git author in configuration")
    .requiredOption("-u, --user-id <userId>", "Discord user ID")
    .requiredOption("-n, --name <name>", "Git user name")
    .requiredOption("-e, --email <email>", "Git user email")
    .action(async (options) => {
      try {
        await userCommands.addUser(options);
        console.log(`✅ User binding added to configuration file`);
      } catch (error) {
        console.error(`❌ Failed to add user: ${error.message}`);
        process.exit(1);
      }
    });

  userCmd
    .command("list")
    .description("List all Discord user to Git author bindings from configuration")
    .action(async () => {
      await userCommands.listUsers();
    });

  // Discord channel commands - NOW USES CONFIG FILE
  const channelCmd = cmd
    .command("channel")
    .description("Manage Discord channel to project mappings");

  channelCmd
    .command("add")
    .description("Map a Discord channel to a project in configuration")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .requiredOption("-c, --channel <channelId>", "Discord channel ID")
    .requiredOption("-g, --guild <guildId>", "Discord guild/server ID")
    .action(async (options) => {
      try {
        await channelCommands.addChannel({
          projectId: options.project,
          channelId: options.channel,
          guildId: options.guild,
        });
        console.log(`✅ Channel mapping added to configuration file`);
      } catch (error) {
        console.error(`❌ Failed to add channel: ${error.message}`);
        process.exit(1);
      }
    });

  channelCmd
    .command("update")
    .description("Update a Discord channel mapping in configuration")
    .requiredOption("-c, --channel <channelId>", "Discord channel ID")
    .requiredOption("-g, --guild <guildId>", "Discord guild/server ID")
    .option("-p, --project <projectId>", "New project ID")
    .action(async (options) => {
      try {
        await channelCommands.updateChannel({
          channelId: options.channel,
          guildId: options.guild,
          projectId: options.project,
        });
        console.log(`✅ Channel mapping updated in configuration file`);
      } catch (error) {
        console.error(`❌ Failed to update channel: ${error.message}`);
        process.exit(1);
      }
    });

  // Discord bot commands - NOW USES CONFIG FILE FOR ROLES
  const botCmd = cmd.command("bot").description("Discord bot operations");

  botCmd
    .command("start")
    .description("Start the Discord bot")
    .action(() => {
      botCommands.startBot();
    });

  botCmd
    .command("allowed-roles")
    .description("Manage allowed Discord roles")
    .argument("[roles]", "Comma-separated list of role IDs to set")
    .requiredOption("-g, --guild <guildId>", "Discord guild/server ID")
    .action(async (roles, options) => {
      try {
        if (roles) {
          await botCommands.setAllowedRoles(roles, options.guild);
          console.log(`✅ Allowed roles updated in configuration file`);
        } else {
          // Show current allowed roles
          await botCommands.showAllowedRoles(options.guild);
        }
      } catch (error) {
        console.error(`❌ Failed to manage allowed roles: ${error.message}`);
        process.exit(1);
      }
    });

  // Discord server commands - NEW
  const serverCmd = cmd
    .command("server")
    .description("Manage Discord server configurations");

  serverCmd
    .command("add")
    .description("Add a Discord server to configuration")
    .requiredOption("-g, --guild <guildId>", "Discord guild/server ID")
    .requiredOption("-n, --name <name>", "Server name")
    .action(async (options) => {
      try {
        const server = {
          guildId: options.guild,
          name: options.name,
          channels: [],
          allowedRoles: [],
        };
        configService.addDiscordServer(server);
        console.log(`✅ Discord server '${options.name}' added to configuration`);
      } catch (error) {
        console.error(`❌ Failed to add server: ${error.message}`);
        process.exit(1);
      }
    });

  serverCmd
    .command("list")
    .description("List all Discord servers from configuration")
    .action(async () => {
      const servers = configService.getDiscordServers();
      if (servers.length === 0) {
        console.log("No Discord servers configured.");
        return;
      }

      console.log("Discord Servers:");
      for (const server of servers) {
        console.log(`\n• ${server.name} (Guild ID: ${server.guildId})`);

        if (server.channels && server.channels.length > 0) {
          console.log("  Channels:");
          for (const channel of server.channels) {
            console.log(`    - Project: ${channel.projectId}, Channel: ${channel.channelId}`);
          }
        }

        if (server.allowedRoles && server.allowedRoles.length > 0) {
          console.log(`  Allowed Roles: ${server.allowedRoles.join(", ")}`);
        }
      }
    });

  serverCmd
    .command("remove")
    .description("Remove a Discord server from configuration")
    .requiredOption("-g, --guild <guildId>", "Discord guild/server ID")
    .action(async (options) => {
      try {
        const server = configService.getDiscordServerByGuildId(options.guild);
        if (server) {
          configService.removeDiscordServer(options.guild);
          console.log(`✅ Discord server '${server.name}' removed from configuration`);
        } else {
          console.error(`❌ Server with guild ID '${options.guild}' not found`);
        }
      } catch (error) {
        console.error(`❌ Failed to remove server: ${error.message}`);
        process.exit(1);
      }
    });

  // Start command
  cmd
    .command("start")
    .description("Start the Discord bot")
    .action(() => {
      discordLibsqlInfra.init();
      botCommands.startBot();
    });
};