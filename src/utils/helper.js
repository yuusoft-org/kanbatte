import crypto from "crypto";

export const generateId = () => {
  return crypto.randomBytes(8).toString("base64url");
};
