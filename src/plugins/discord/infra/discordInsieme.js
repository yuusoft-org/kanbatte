import { createRepository } from "insieme";

export const createDiscordInsieme = (deps) => {
  const { discordLibsqlInfra } = deps;

  const isInitialized = async () => {
    try {
      const initEvent = await discordLibsqlInfra.getEvents("init");
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
          const eventsForPartition = await discordLibsqlInfra.getEvents(p);
          allEvents.push(...eventsForPartition);
        }

        return allEvents;
      },
      appendEvent: async (event) => {
        await discordLibsqlInfra.appendEvent(event);
      },
      get: async (key) => {
        return await discordLibsqlInfra.get(key);
      },
      set: async (key, value) => {
        await discordLibsqlInfra.set(key, value);
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