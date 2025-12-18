import { REST, Routes } from "discord.js";
import * as sessionsSlashCommands from "./slash-commands/sessions.js";

export const deployDiscordCommands = async (options = {}) => {
  const token = options.token || process.env.DISCORD_BOT_TOKEN;
  const clientId = options.clientId || process.env.DISCORD_CLIENT_ID;
  const guildId = options.guildId || process.env.DISCORD_GUILD_ID;

  if (!token) {
    throw new Error("Missing DISCORD_BOT_TOKEN environment variable");
  }
  if (!clientId) {
    throw new Error("Missing DISCORD_CLIENT_ID environment variable");
  }
  if (!guildId) {
    throw new Error("Missing DISCORD_GUILD_ID environment variable");
  }

  const rest = new REST().setToken(token);

  const commands = {
    ...sessionsSlashCommands.default,
  }

  const commandsData = Object.values(commands).map(command => command.data.toJSON());

  try {
    console.log(`🔄 Started refreshing ${commandsData.length} application (/) commands.`);
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandsData });
    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    return data;
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error("❌ Error deploying Discord commands:", error);
    throw error;
  }
};