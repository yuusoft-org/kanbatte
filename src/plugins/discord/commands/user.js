export const createUserCommands = (deps) => {
  const { discordService } = deps;

  const addUser = async (options) => {
    const payload = {
      userId: options.userId,
      name: options.name,
      email: options.email,
    };
    await discordService.addUserEmailRecord(payload);
    console.log(
      `✅ Bound Discord user ID ${options.userId} to Git user ${options.name} <${options.email}>`,
    );
  };

  const listUsers = async () => {
    const records = await discordService.listUserEmailRecords();
    if (records.length === 0) {
      console.log("ℹ️ No Discord user bindings found.");
      return;
    }
    console.log("👥 Discord User ID Bindings:");
    for (const record of records) {
      console.log(`  • ${record.userId}: ${record.name} <${record.email}>`);
    }
  };

  return {
    addUser,
    listUsers,
  };
};
