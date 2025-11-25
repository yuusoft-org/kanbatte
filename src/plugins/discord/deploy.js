import { REST, Routes } from "discord.js";
import * as sessionsSlashCommands from "./slash-commands/sessions";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

const rest = new REST().setToken(token);

const commands = {
  ...sessionsSlashCommands,
}

const commandsData = Object.values(commands).map(command => command.data.toJSON());

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandsData });
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();