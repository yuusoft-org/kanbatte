export const setAllowedRoleIds = async (deps, payload) => {
  const { discordLibsql } = deps;
  const { roleIds } = payload;
  await discordLibsql.set("allowedRoleIds", roleIds);
}

export const getAllowedRoleIds = async (deps) => {
  const { discordLibsql } = deps;
  const roleIds = await discordLibsql.get("allowedRoleIds") || [];
  return roleIds;
}