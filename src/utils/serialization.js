import { encode, decode } from '@msgpack/msgpack';

/**
 * MessagePack serialization utilities for efficient data storage
 */

export function serialize(data) {
  return encode(data);
}

export function deserialize(buffer) {
  return decode(buffer);
}

/**
 * Helper function to prepare data for database storage
 * Adds metadata like timestamps
 */
export function createEvent(type, taskId, data) {
  return {
    type,
    taskId,
    data,
    timestamp: Date.now()
  };
}

/**
 * Generate a simple UUID v4 using crypto.randomUUID if available,
 * otherwise fallback to a simple implementation
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Simple fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}