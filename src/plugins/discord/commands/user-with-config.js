export const createUserCommandsWithConfig = (deps) => {
  const { configService } = deps;

  const addUser = async (options) => {
    const user = {
      userId: options.userId,
      name: options.name,
      email: options.email,
      gitAuthor: `${options.name} <${options.email}>`
    };

    configService.addDiscordUser(user);
    console.log(
      `Bound Discord user ID ${options.userId} to Git user ${options.name} <${options.email}>`,
    );
  };

  const listUsers = async () => {
    const users = configService.getDiscordUsers();
    if (users.length === 0) {
      console.log("No Discord user bindings found.");
      return;
    }

    console.log("Discord User ID Bindings:");
    for (const user of users) {
      if (user.gitAuthor) {
        console.log(`- ${user.userId}: ${user.gitAuthor}`);
      } else if (user.name && user.email) {
        console.log(`- ${user.userId}: ${user.name} <${user.email}>`);
      } else {
        console.log(`- ${user.userId}: (incomplete configuration)`);
      }
    }
  };

  return {
    addUser,
    listUsers,
  };
};