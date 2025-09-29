import { encode, decode } from "@msgpack/msgpack";

export function serialize(data) {
  return encode(data);
}

export function deserialize(buffer) {
  return decode(buffer);
}
