
import assert from 'assert';
import { createLibSqlUmzug } from './umzug-libsql.js';

const { umzug, client } = createLibSqlUmzug();

await umzug.up();

await client.execute(`insert into users (id, email) values ('user1', 'user1@example.com');`)
const { rows } = await client.execute('select * from users;')

assert.equal(rows.length, 1)
assert.equal(rows[0].id, 'user1')

await umzug.down({ to: 0});

try {
  await client.execute(`insert into users (id, email) values ('user2', 'user2@example.com');`)
  throw new Error('should throw error')
} catch (e) {
  if (!e.message.endsWith('no such table: users')) {
    throw e
  }
}

console.log('tests passed');
