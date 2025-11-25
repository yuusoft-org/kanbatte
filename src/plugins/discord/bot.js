// minimal-discord-bot.js
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import * as tasksSlashCommands from "./slash-commands/tasks";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error('Error: Missing DISCORD_BOT_TOKEN environment variable');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const commands = {
  ...tasksSlashCommands,
};

client.commands = new Collection(Object.entries(commands));

// Simple echo: reply with exactly what the user sent
// client.on(Events.MessageCreate, async (message) => {
//   // Ignore bot messages to avoid loops
//   if (message.author.bot) return;

//   await message.reply(message.content);
// });

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return; 
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});

client.login(token);
