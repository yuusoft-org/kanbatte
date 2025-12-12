import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export const createConfigService = (options = {}) => {
  const defaultConfigPath = options.configPath || path.join(process.cwd(), 'kanbatte.config.yaml');
  let cachedConfig = null;
  let configPath = defaultConfigPath;

  const readConfig = () => {
    try {
      if (!fs.existsSync(configPath)) {
        // Return default empty config if file doesn't exist
        return {
          projects: [],
          discord: {
            users: [],
            servers: []
          }
        };
      }
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContents) || {};

      // Ensure structure exists
      config.projects = config.projects || [];
      config.discord = config.discord || {};
      config.discord.users = config.discord?.users || [];
      config.discord.servers = config.discord?.servers || [];

      cachedConfig = config;
      return config;
    } catch (error) {
      console.error(`Error reading config from ${configPath}:`, error.message);
      throw new Error(`Failed to read configuration: ${error.message}`);
    }
  };

  const writeConfig = (config) => {
    try {
      const yamlStr = yaml.dump(config, { indent: 2, lineWidth: 120 });
      fs.writeFileSync(configPath, yamlStr, 'utf8');
      cachedConfig = config;
      return true;
    } catch (error) {
      console.error(`Error writing config to ${configPath}:`, error.message);
      throw new Error(`Failed to write configuration: ${error.message}`);
    }
  };

  const getConfig = () => {
    if (!cachedConfig) {
      cachedConfig = readConfig();
    }
    return cachedConfig;
  };

  const reloadConfig = () => {
    cachedConfig = null;
    return readConfig();
  };

  // Project related methods
  const getProjects = () => {
    const config = getConfig();
    return config.projects || [];
  };

  const getProjectById = (projectId) => {
    const projects = getProjects();
    return projects.find(p => p.id === projectId);
  };

  const addProject = (project) => {
    const config = getConfig();
    const existing = config.projects.find(p => p.id === project.id);
    if (existing) {
      throw new Error(`Project with ID '${project.id}' already exists`);
    }
    config.projects.push(project);
    writeConfig(config);
    return project;
  };

  const updateProject = (projectId, updates) => {
    const config = getConfig();
    const projectIndex = config.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      throw new Error(`Project with ID '${projectId}' not found`);
    }
    config.projects[projectIndex] = { ...config.projects[projectIndex], ...updates };
    writeConfig(config);
    return config.projects[projectIndex];
  };

  const removeProject = (projectId) => {
    const config = getConfig();
    const projectIndex = config.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      throw new Error(`Project with ID '${projectId}' not found`);
    }
    const removed = config.projects.splice(projectIndex, 1)[0];
    writeConfig(config);
    return removed;
  };

  // Discord user related methods
  const getDiscordUsers = () => {
    const config = getConfig();
    return config.discord?.users || [];
  };

  const getDiscordUserById = (userId) => {
    const users = getDiscordUsers();
    return users.find(u => u.userId === userId);
  };

  const addDiscordUser = (user) => {
    const config = getConfig();
    if (!config.discord) config.discord = {};
    if (!config.discord.users) config.discord.users = [];

    const existing = config.discord.users.find(u => u.userId === user.userId);
    if (existing) {
      throw new Error(`Discord user with ID '${user.userId}' already exists`);
    }
    config.discord.users.push(user);
    writeConfig(config);
    return user;
  };

  const updateDiscordUser = (userId, updates) => {
    const config = getConfig();
    if (!config.discord?.users) {
      throw new Error(`No Discord users configured`);
    }
    const userIndex = config.discord.users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
      throw new Error(`Discord user with ID '${userId}' not found`);
    }
    config.discord.users[userIndex] = { ...config.discord.users[userIndex], ...updates };
    writeConfig(config);
    return config.discord.users[userIndex];
  };

  const removeDiscordUser = (userId) => {
    const config = getConfig();
    if (!config.discord?.users) {
      throw new Error(`No Discord users configured`);
    }
    const userIndex = config.discord.users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
      throw new Error(`Discord user with ID '${userId}' not found`);
    }
    const removed = config.discord.users.splice(userIndex, 1)[0];
    writeConfig(config);
    return removed;
  };

  // Discord server related methods
  const getDiscordServers = () => {
    const config = getConfig();
    return config.discord?.servers || [];
  };

  const getDiscordServerByGuildId = (guildId) => {
    const servers = getDiscordServers();
    return servers.find(s => s.guildId === guildId);
  };

  const getDiscordServerByName = (name) => {
    const servers = getDiscordServers();
    return servers.find(s => s.name === name);
  };

  const addDiscordServer = (server) => {
    const config = getConfig();
    if (!config.discord) config.discord = {};
    if (!config.discord.servers) config.discord.servers = [];

    const existing = config.discord.servers.find(s => s.guildId === server.guildId);
    if (existing) {
      throw new Error(`Discord server with guild ID '${server.guildId}' already exists`);
    }
    config.discord.servers.push(server);
    writeConfig(config);
    return server;
  };

  const updateDiscordServer = (guildId, updates) => {
    const config = getConfig();
    if (!config.discord?.servers) {
      throw new Error(`No Discord servers configured`);
    }
    const serverIndex = config.discord.servers.findIndex(s => s.guildId === guildId);
    if (serverIndex === -1) {
      throw new Error(`Discord server with guild ID '${guildId}' not found`);
    }
    config.discord.servers[serverIndex] = { ...config.discord.servers[serverIndex], ...updates };
    writeConfig(config);
    return config.discord.servers[serverIndex];
  };

  const removeDiscordServer = (guildId) => {
    const config = getConfig();
    if (!config.discord?.servers) {
      throw new Error(`No Discord servers configured`);
    }
    const serverIndex = config.discord.servers.findIndex(s => s.guildId === guildId);
    if (serverIndex === -1) {
      throw new Error(`Discord server with guild ID '${guildId}' not found`);
    }
    const removed = config.discord.servers.splice(serverIndex, 1)[0];
    writeConfig(config);
    return removed;
  };

  // Channel management (within servers)
  const getChannelsByProjectId = (projectId) => {
    const servers = getDiscordServers();
    const channels = [];

    for (const server of servers) {
      if (server.channels) {
        const projectChannels = server.channels.filter(c => c.projectId === projectId);
        channels.push(...projectChannels.map(c => ({
          ...c,
          guildId: server.guildId,
          serverName: server.name
        })));
      }
    }

    return channels;
  };

  const getProjectIdByChannelId = (channelId) => {
    const servers = getDiscordServers();

    for (const server of servers) {
      if (server.channels) {
        const channel = server.channels.find(c => c.channelId === channelId);
        if (channel) {
          return channel.projectId;
        }
      }
    }

    return null;
  };

  const addChannelToServer = (guildId, channel) => {
    const config = getConfig();
    const server = config.discord?.servers?.find(s => s.guildId === guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found`);
    }

    if (!server.channels) server.channels = [];

    const existing = server.channels.find(c => c.channelId === channel.channelId);
    if (existing) {
      throw new Error(`Channel with ID '${channel.channelId}' already exists in server`);
    }

    server.channels.push(channel);
    writeConfig(config);
    return channel;
  };

  const updateChannelInServer = (guildId, channelId, updates) => {
    const config = getConfig();
    const server = config.discord?.servers?.find(s => s.guildId === guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found`);
    }

    if (!server.channels) {
      throw new Error(`No channels configured for server '${server.name}'`);
    }

    const channelIndex = server.channels.findIndex(c => c.channelId === channelId);
    if (channelIndex === -1) {
      throw new Error(`Channel with ID '${channelId}' not found in server`);
    }

    server.channels[channelIndex] = { ...server.channels[channelIndex], ...updates };
    writeConfig(config);
    return server.channels[channelIndex];
  };

  const removeChannelFromServer = (guildId, channelId) => {
    const config = getConfig();
    const server = config.discord?.servers?.find(s => s.guildId === guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found`);
    }

    if (!server.channels) {
      throw new Error(`No channels configured for server '${server.name}'`);
    }

    const channelIndex = server.channels.findIndex(c => c.channelId === channelId);
    if (channelIndex === -1) {
      throw new Error(`Channel with ID '${channelId}' not found in server`);
    }

    const removed = server.channels.splice(channelIndex, 1)[0];
    writeConfig(config);
    return removed;
  };

  // Allowed roles management
  const getAllowedRolesByGuildId = (guildId) => {
    const server = getDiscordServerByGuildId(guildId);
    return server?.allowedRoles || [];
  };

  const setAllowedRolesForServer = (guildId, roleIds) => {
    const config = getConfig();
    const server = config.discord?.servers?.find(s => s.guildId === guildId);
    if (!server) {
      throw new Error(`Discord server with guild ID '${guildId}' not found`);
    }

    server.allowedRoles = roleIds;
    writeConfig(config);
    return roleIds;
  };

  const setConfigPath = (newPath) => {
    configPath = newPath;
    cachedConfig = null;
  };

  const getConfigPath = () => configPath;

  return {
    // Core config methods
    getConfig,
    reloadConfig,
    writeConfig,
    setConfigPath,
    getConfigPath,

    // Project methods
    getProjects,
    getProjectById,
    addProject,
    updateProject,
    removeProject,

    // Discord user methods
    getDiscordUsers,
    getDiscordUserById,
    addDiscordUser,
    updateDiscordUser,
    removeDiscordUser,

    // Discord server methods
    getDiscordServers,
    getDiscordServerByGuildId,
    getDiscordServerByName,
    addDiscordServer,
    updateDiscordServer,
    removeDiscordServer,

    // Channel methods
    getChannelsByProjectId,
    getProjectIdByChannelId,
    addChannelToServer,
    updateChannelInServer,
    removeChannelFromServer,

    // Allowed roles methods
    getAllowedRolesByGuildId,
    setAllowedRolesForServer,
  };
};