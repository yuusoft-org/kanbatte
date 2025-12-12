# Configuration Migration Guide

## Overview

Kanbatte has migrated from storing configuration in the database to using a YAML configuration file. This change makes it easier to manage projects, Discord users, channels, and roles without needing to use CLI commands.

## Migration Steps

### 1. Initialize Configuration File

Create a new configuration file from the example:

```bash
cp kanbatte.config.yaml.example kanbatte.config.yaml
```

Or initialize a minimal configuration:

```bash
kanbatte config init
```

### 2. Migrate Existing Database Configuration

If you have existing configuration in the database, you can migrate it automatically:

```bash
# Preview what will be migrated (dry run)
kanbatte config migrate --dry-run

# Perform the actual migration
kanbatte config migrate
```

**Note:** After migration, you'll need to:
1. Replace `DEFAULT_SERVER` with your actual Discord server name
2. Replace `REPLACE_WITH_GUILD_ID` with your actual Discord guild ID
3. Verify all channel and role IDs are correct
4. Group channels by their appropriate Discord servers if you have multiple servers

### 3. Validate Your Configuration

After setting up or migrating your configuration, validate it:

```bash
kanbatte config validate
```

### 4. View Current Configuration

To see your current configuration:

```bash
# Human-readable format
kanbatte config show

# JSON format
kanbatte config show --json
```

## Configuration File Structure

The `kanbatte.config.yaml` file has the following structure:

```yaml
# Project definitions
projects:
  - id: project-id          # Unique project identifier
    name: Project Name       # Human-readable name
    gitRepository: git@...   # Git repository URL
    description: ...         # Optional description

# Discord integration
discord:
  # User to Git author mappings
  users:
    - userId: "123456789"    # Discord user ID
      gitAuthor: Name <email@example.com>  # Git author format
      name: Name             # Optional: explicit name
      email: email@example.com  # Optional: explicit email

  # Discord server configurations
  servers:
    - name: Server Name      # Server display name
      guildId: "1234567890"  # Discord guild/server ID

      # Channel to project mappings
      channels:
        - projectId: project-id     # Project ID from above
          channelId: "9876543210"   # Discord channel ID

      # Allowed role IDs for bot interactions
      allowedRoles:
        - "1234567890"       # Role ID that can interact with bot
```

## CLI Commands

### Configuration Management

```bash
# Initialize configuration file
kanbatte config init [--file <path>] [--force]

# Validate configuration
kanbatte config validate [--file <path>]

# Show configuration
kanbatte config show [--file <path>] [--json]

# Reload configuration
kanbatte config reload

# Show config file path
kanbatte config path

# Migrate from database
kanbatte config migrate [--dry-run]
```

### Project Management (Now Uses Config File)

```bash
# Create a project (adds to config file)
kanbatte session project create -p <id> -n <name> -r <repository> [-d <description>]

# Update a project (updates config file)
kanbatte session project update -p <id> [-n <name>] [-r <repository>] [-d <description>]

# List projects (reads from config file)
kanbatte session project list
```

### Discord Configuration (Now Uses Config File)

```bash
# Add Discord server
kanbatte discord server add -g <guildId> -n <name>

# List Discord servers
kanbatte discord server list

# Remove Discord server
kanbatte discord server remove -g <guildId>

# Add Discord user binding
kanbatte discord user add -u <userId> -n <name> -e <email>

# List Discord users
kanbatte discord user list

# Add channel mapping
kanbatte discord channel add -p <projectId> -c <channelId> -g <guildId>

# Update channel mapping
kanbatte discord channel update -c <channelId> -g <guildId> [-p <projectId>]

# Set allowed roles for a server
kanbatte discord bot allowed-roles <role1,role2> -g <guildId>

# Show allowed roles for a server
kanbatte discord bot allowed-roles -g <guildId>
```

## Benefits of File-Based Configuration

1. **Version Control**: Configuration can be tracked in Git
2. **Easy Editing**: Edit configuration with any text editor
3. **Portability**: Share configuration across environments
4. **No CLI Required**: Manage settings without command-line access
5. **Validation**: Built-in validation ensures configuration correctness
6. **Flexibility**: Support for multiple Discord servers and complex mappings

## Troubleshooting

### Configuration Not Found

If you see "Configuration file not found", ensure:
1. The `kanbatte.config.yaml` file exists in your project root
2. You're running commands from the correct directory
3. Use `--file` option to specify a custom path if needed

### Validation Errors

If validation fails:
1. Check for duplicate IDs (project, user, or server IDs must be unique)
2. Ensure Discord IDs are numeric strings
3. Verify Git author format: `Name <email@example.com>`
4. Check that referenced projects exist when adding channels

### Migration Issues

If migration fails:
1. Ensure database is accessible and initialized
2. Check for duplicate entries that might conflict
3. Use `--dry-run` to preview changes before migration
4. Manually edit the config file after migration to fix server/guild IDs

## Future Extensions

The configuration file is designed to be extensible. Future versions may add:

- Custom system prompts per channel
- Prompt presets for common tasks
- Channel-specific AI behavior settings
- Additional integrations and plugins

## Rollback

If you need to rollback to database-based configuration:
1. Keep using the original CLI commands (without `-with-config` suffix in filenames)
2. The database tables are still present and functional
3. Migration doesn't delete existing database data

## Support

For issues or questions about the configuration system:
1. Check the example file: `kanbatte.config.yaml.example`
2. Run validation: `kanbatte config validate`
3. Review this guide and ensure all steps are followed
4. Report issues with configuration details (sanitized of sensitive data)