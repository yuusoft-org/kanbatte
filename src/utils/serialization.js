import { encode, decode } from "@msgpack/msgpack";

export const serialize = (data) => {
  return encode(data);
};

export const deserialize = (buffer) => {
  return decode(buffer);
};
