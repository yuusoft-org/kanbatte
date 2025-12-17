import { join } from "path";
import { loadConfig } from "../utils/config.js";

export const createConfigService = () => {
  let _config = null;

  const init = (projectRoot) => {
    if (_config) return;
    const configPath = join(projectRoot, "kanbatte.config.yaml");
    _config = loadConfig(configPath);
  };

//   const checkInitialized = () => {
//     if (!_config) {
//       throw new Error("ConfigService not initialized. Call init() first.");
//     }
//   };

  const getProjects = () => {
    return _config.projects || [];
  };

  const getProjectById = (projectId) => {
    return (_config.projects || []).find(p => p.id === projectId);
  };

  const getDiscordUserByUserId = (userId) => {
    return (_config.discord?.users || []).find(u => u.userId === userId);
  };
  
  const getProjectConfigByChannelId = (channelId) => {
    if (!_config.discord || !_config.discord.servers) return null;

    for (const server of _config.discord.servers) {
      const channelConfig = (server.channels || []).find(c => c.channelId === channelId);
      if (channelConfig) {
        return channelConfig;
      }
    }
    return null;
  };

  const getAllowedRolesByGuildId = (guildId) => {
    if (!_config.discord || !_config.discord.servers) return [];
    const server = _config.discord.servers.find(s => s.guildId === guildId);
    return server ? server.allowedRoles || [] : [];
  };

   const getPrompt = (presetName) => {
    if (!_config || !_config.prompts) return null;
    return _config.prompts[presetName] || null;
  };

  const getPromptPresets = () => {
    if (!_config || !_config.prompts) return [];
    return Object.keys(_config.prompts).map((key) => ({ name: key, value: key }));
  };

  return {
    init,
    getProjects,
    getProjectById,
    getDiscordUserByUserId,
    getProjectConfigByChannelId,
    getAllowedRolesByGuildId,
    getPrompt,
    getPromptPresets,
  };
};