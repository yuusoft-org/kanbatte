import crypto from "crypto";

export function generateId() {
  return crypto.randomBytes(8).toString("base64url");
}
