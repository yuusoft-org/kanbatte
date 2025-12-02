import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { isThreadChannel } from "../utils";
import { createMainInsiemeDao } from "../../../deps/mainDao";
import { createDiscordInsiemeDao } from "../deps/discordDao";
import { addSession, appendSessionMessages } from "../../../commands/session";

// export const ping = {
//   data: new SlashCommandBuilder()
//     .setName('ping')
//     .setDescription('Replies with Pong!'),

//   async execute(interaction) {
//     await interaction.reply('Pong!');
//   },
// };

const queueSession = {
  data: new SlashCommandBuilder()
    .setName("queue-session")
    .setDescription("Create a new session thread in the current channel")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Initial message for the session")
        .setRequired(true),
    ),

  async execute(interaction) {
    const isThread = isThreadChannel(interaction.channel);
    if (isThread) {
      await interaction.reply({
        content:
          "This command cannot be used in a thread channel. Please use it in a regular channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const insiemeDao = await createMainInsiemeDao();
    const discordInsiemeDao = await createDiscordInsiemeDao();
    const channelId = interaction.channel.id;

    const project = await discordInsiemeDao.getProjectIdByChannel({
      channelId,
    });

    const message = interaction.options.getString("message");

    const session = await addSession({ insiemeDao }, { project, message });

    // Not in a thread - create one
    const thread = await interaction.channel.threads.create({
      name: `${session.sessionId}`,
      autoArchiveDuration: 1440, // 24 hours
      reason: `Session: ${session.sessionId}`,
    });

    // Add the user who created the task to the thread
    await thread.members.add(interaction.user.id);

    // Send message to the new thread
    await thread.send(`🗨️ User: ${message}`);
    await discordInsiemeDao.addSessionThreadRecord({
      sessionId: session.sessionId,
      threadId: thread.id,
    });

    const reply = `Session ${session.sessionId} created: <#${thread.id}>`;
    console.log(reply);

    // Update the deferred reply
    await interaction.editReply({
      content: reply,
    });
  },
};

const setStatus = {
  data: new SlashCommandBuilder()
    .setName("set-status")
    .setDescription("Set the status of an existing session")
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("New status for the session")
        .setRequired(true)
        .addChoices(
          { name: "Ready", value: "ready" },
          { name: "In Progress", value: "in-progress" },
          { name: "Review", value: "review" },
          { name: "Done", value: "done" }
        ),
    ),

  async execute(interaction) {
    const isThread = isThreadChannel(interaction.channel);
    if (!isThread) {
      await interaction.reply({
        content: 'This command can only be used in a thread channel.',
      });
      return;
    }
    const status = interaction.options.getString("status");
    const discordInsiemeDao = await createDiscordInsiemeDao();
    const mainInsiemeDao = await createMainInsiemeDao();
    const sessionId = await discordInsiemeDao.getSessionIdByThread({
      threadId: interaction.channel.id,
    });
    if (!sessionId) {
      await interaction.reply({
        content: `No session found for this thread.`,
      });
      return;
    }
    await mainInsiemeDao.updateSessionStatus({ sessionId, status });

    await interaction.reply({
      content: `🔄 Session ${sessionId} status updating to: ${status}...`,
    });
  },
};

const requestCommit = {
  data: new SlashCommandBuilder()
    .setName("request-commit")
    .setDescription("Append request message to submit a commit for the current session thread")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Commit message")
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName("author")
        .setDescription("Git author (overrides bound user)")
        .setRequired(false),
    ),

  async execute(interaction) {
    const isThread = isThreadChannel(interaction.channel);
    if (!isThread) {
      await interaction.reply({
        content: 'This command can only be used in a thread channel.',
      });
      return;
    }

    const discordInsiemeDao = await createDiscordInsiemeDao();
    const insiemeDao = await createMainInsiemeDao();
    const sessionId = await discordInsiemeDao.getSessionIdByThread({ threadId: interaction.channel.id });
    
    const message = interaction.options.getString("message");
    const messagePrompt = message ? `Commit message is: "${message}".` : ``;

    const author = interaction.options.getUser("author");
    const authorInfo = author ? await discordInsiemeDao.getInfoByUserId({ userId: author.id }) : await discordInsiemeDao.getInfoByUserId({ userId: interaction.user.id });
    if(!authorInfo) {
      await interaction.reply(`Could not find author info for the specified user.`);
      return;
    }
    const authorPrompt = `Author is: ${authorInfo.userName} <${authorInfo.email}>.`;

    const prompt = `Save all changes, check new branch if current branch is main, submit a commit. ${messagePrompt} ${authorPrompt} Do not change git config. Do not push for now. Don't add any coauthors and dont mention claude or any AI. Keep commit message minimal and simple.
`.trim();
    await appendSessionMessages({ insiemeDao }, { sessionId, messages: `[{"role": "user","content": "${prompt}"}]` });

    await interaction.reply(`Your commit request has been added to session ${sessionId}.`);
  }
};

const requestNewPR = {
  data: new SlashCommandBuilder()
    .setName("request-new-pr")
    .setDescription("Append request message to create a new pull request for the current session thread"),
  async execute(interaction) {
    const isThread = isThreadChannel(interaction.channel);
    if (!isThread) {
      await interaction.reply({
        content: 'This command can only be used in a thread channel.',
      });
      return;
    }

    const discordInsiemeDao = await createDiscordInsiemeDao();
    const insiemeDao = await createMainInsiemeDao();
    const sessionId = await discordInsiemeDao.getSessionIdByThread({ threadId: interaction.channel.id });
    
    const prompt = `Create PR. don't add any coauthors and dont mention claude or any AI. keep PR content minimal and simple.`.trim();
    await appendSessionMessages({ insiemeDao }, { sessionId, messages: `[{"role": "user","content": "${prompt}"}]` });

    await interaction.reply(`Your PR request has been added to session ${sessionId}.`);
  }
};


export default {
  "queue-session": queueSession,
  "set-status": setStatus,
  "request-commit": requestCommit,
  "request-new-pr": requestNewPR,
};
