export const setAllowedRoleIds = async (deps, payload) => {
  const { discordStore } = deps;
  const { roleIds } = payload;
  await discordStore.set("allowedRoleIds", roleIds);
}

export const getAllowedRoleIds = async (deps) => {
  const { discordStore } = deps;
  const roleIds = await discordStore.get("allowedRoleIds") || [];
  return roleIds;
}