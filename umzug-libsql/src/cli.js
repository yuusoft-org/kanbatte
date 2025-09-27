#!/usr/bin/env node
import { createLibSqlUmzug } from './umzug-libsql.js';

const { umzug } = createLibSqlUmzug({
  url: process.env.TURSO_DATABASE_URL || ':memory:',
  authToken: process.env.TURSO_AUTH_TOKEN,
  glob: process.env.UMZUG_GLOB || 'db/migrations/*.sql',
  confirmBeforeDown: process.env.UMZUG_CONFIRM_BEFORE_DOWN === 'true'
});

umzug.runAsCLI();
