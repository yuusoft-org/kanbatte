import { Collection } from "discord.js";
import * as sessionCommands from "./sessions.js";

// Consolidate all slash commands here
const allCommands = {
  ...sessionCommands.default,
  // Add more command modules here as they are created
  // Example: ...otherCommands.default,
};

// Create and export a Collection of commands for Discord.js
export const createCommandsCollection = () => {
  return new Collection(Object.entries(allCommands));
};

// Export individual command modules for external access if needed
export { sessionCommands };

// Export the raw commands object
export default allCommands;
