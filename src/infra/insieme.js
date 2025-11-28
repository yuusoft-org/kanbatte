import { createRepository } from "insieme";
import { serialize, deserialize } from "../utils/serialization.js";

export const createInsieme = (deps) => {
  const { libsqlInfra } = deps;

  const isInitialized = async () => {
    try {
      const initEvent = await libsqlInfra.getEvents("init");
      return initEvent.length > 0;
    } catch (e) {
      return false;
    }
  };

  const createAdapter = () => {
    return {
      getEvents: async (payload = {}) => {
        const { partition } = payload;
        if (!partition) return [];

        let allEvents = [];
        for (const p of partition) {
          const eventsForPartition = await libsqlInfra.getEvents(p);
          allEvents.push(...eventsForPartition);
        }

        return allEvents.map((event) => ({
          ...event,
          payload: deserialize(event.payload),
        }));
      },
      appendEvent: async (event) => {
        const eventWithSerializedPayload = {
          ...event,
          payload: serialize(event.payload),
        };
        await libsqlInfra.appendEvent(eventWithSerializedPayload);
      },
      get: async (key) => {
        const data = await libsqlInfra.get(key);
        return data ? deserialize(data) : null;
      },
      set: async (key, value) => {
        await libsqlInfra.set(key, serialize(value));
      },
    };
  };

  const store = createAdapter();

  const repository = createRepository({
    originStore: store,
    usingCachedEvents: false,
  });

  const init = async () => {
    if (await isInitialized()) {
      return;
    }
    await repository.init({
      initialState: { events: { items: {}, tree: {} } },
      partition: "init",
    });
  };

  return {
    repository,
    init,
  };
};