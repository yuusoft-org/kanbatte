

export const addTask = async (deps, payload) => {
  const { libsqlDao } = deps;
  console.log('running commands.addTask', payload);
  libsqlDao.addEventLog(payload);
  // call DAO here
}

