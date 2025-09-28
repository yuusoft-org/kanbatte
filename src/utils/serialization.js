import { encode, decode } from "@msgpack/msgpack";

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
