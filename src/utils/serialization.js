import { encode, decode } from "@msgpack/msgpack";
import crypto from "crypto";

export function serialize(data) {
  return encode(data);
}

export function deserialize(buffer) {
  return decode(buffer);
}

export function createEvent(type, taskId, data) {
  return {
    type,
    taskId,
    data,
    timestamp: Date.now(),
  };
}

export function generateId() {
  return crypto.randomBytes(8).toString("base64url");
}
