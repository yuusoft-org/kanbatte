export const setupDiscordCli = (deps) => {
  const { cmd, discordService, discordLibsqlService } = deps;

  // Discord db setup command
  cmd
    .command("db")
    .argument("setup")
    .description("Set up Discord plugin database")
    .action(async () => {
      console.log("Setting up Discord plugin database...");
      await discordLibsqlService.init();
      console.log("Discord plugin database setup completed!");
    });

  // Discord channel command group
  const channelCmd = cmd.command("channel").description("Discord channel management");

  channelCmd
    .command("add")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId>", "Discord channel ID")
    .description("Add Discord channel for project")
    .action(async (options) => {
      const payload = { channelData: { channel: options.channel }, projectId: options.project };
      await discordService.addChannel(payload);
      console.log(`Channel ${payload.channelData.channel} added for project ${payload.projectId}`);
    });

  channelCmd
    .command("update")
    .requiredOption("-p, --project <projectId>", "Project ID")
    .option("-c, --channel <channelId>", "Discord channel ID")
    .description("Update Discord channel for project")
    .action(async (options) => {
      const payload = {
        validUpdates: { channel: options.channel },
        projectId: options.project,
      };
      await discordService.updateChannel(payload);
      console.log(`Channel ${payload.validUpdates.channel} updated for project ${payload.projectId}`);
    });

  // Discord start command
  cmd
    .command("start")
    .description("Start Discord event listener")
    .action(async () => {
      await discordService.startEventListener();
    });
};