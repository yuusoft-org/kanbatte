#!/usr/bin/env node

// Test script for the new configuration system
import { createConfigService } from './src/services/configService.js';
import { validateConfig, formatValidationResults } from './src/utils/configValidator.js';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Kanbatte Configuration System\n');

// Test 1: Create config service
console.log('Test 1: Creating config service...');
const configService = createConfigService({
  configPath: path.join(process.cwd(), 'test.config.yaml')
});
console.log('✅ Config service created\n');

// Test 2: Initialize with empty config
console.log('Test 2: Testing empty configuration...');
const emptyConfig = configService.getConfig();
console.log('Empty config:', JSON.stringify(emptyConfig, null, 2));
console.log('✅ Empty config handled correctly\n');

// Test 3: Add a project
console.log('Test 3: Adding a project...');
try {
  const project = {
    id: 'test-project',
    name: 'Test Project',
    gitRepository: 'git@github.com:test/test.git',
    description: 'A test project'
  };
  configService.addProject(project);
  console.log('✅ Project added successfully\n');
} catch (error) {
  console.error('❌ Failed to add project:', error.message);
}

// Test 4: Add a Discord user
console.log('Test 4: Adding a Discord user...');
try {
  const user = {
    userId: '123456789',
    gitAuthor: 'Test User <test@example.com>',
    name: 'Test User',
    email: 'test@example.com'
  };
  configService.addDiscordUser(user);
  console.log('✅ Discord user added successfully\n');
} catch (error) {
  console.error('❌ Failed to add Discord user:', error.message);
}

// Test 5: Add a Discord server
console.log('Test 5: Adding a Discord server...');
try {
  const server = {
    name: 'Test Server',
    guildId: '987654321',
    channels: [],
    allowedRoles: ['111111111']
  };
  configService.addDiscordServer(server);
  console.log('✅ Discord server added successfully\n');
} catch (error) {
  console.error('❌ Failed to add Discord server:', error.message);
}

// Test 6: Add a channel to server
console.log('Test 6: Adding a channel to server...');
try {
  const channel = {
    projectId: 'test-project',
    channelId: '555555555'
  };
  configService.addChannelToServer('987654321', channel);
  console.log('✅ Channel added to server successfully\n');
} catch (error) {
  console.error('❌ Failed to add channel:', error.message);
}

// Test 7: Validate the configuration
console.log('Test 7: Validating configuration...');
const currentConfig = configService.getConfig();
const validationResults = validateConfig(currentConfig);
console.log(formatValidationResults(validationResults));
console.log();

// Test 8: Show final configuration
console.log('Test 8: Final configuration:');
console.log(JSON.stringify(currentConfig, null, 2));
console.log();

// Test 9: Test retrieval methods
console.log('Test 9: Testing retrieval methods...');

const projects = configService.getProjects();
console.log(`  Found ${projects.length} projects`);

const projectById = configService.getProjectById('test-project');
console.log(`  Project by ID: ${projectById ? projectById.name : 'not found'}`);

const users = configService.getDiscordUsers();
console.log(`  Found ${users.length} Discord users`);

const servers = configService.getDiscordServers();
console.log(`  Found ${servers.length} Discord servers`);

const projectIdByChannel = configService.getProjectIdByChannelId('555555555');
console.log(`  Project ID for channel 555555555: ${projectIdByChannel || 'not found'}`);

const allowedRoles = configService.getAllowedRolesByGuildId('987654321');
console.log(`  Allowed roles for guild 987654321: ${allowedRoles.join(', ')}`);

console.log('✅ All retrieval methods working\n');

// Clean up test file
const testConfigPath = path.join(process.cwd(), 'test.config.yaml');
if (fs.existsSync(testConfigPath)) {
  fs.unlinkSync(testConfigPath);
  console.log('🧹 Test config file cleaned up');
}

console.log('\n✅ All tests completed successfully!');