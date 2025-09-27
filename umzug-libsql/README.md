
# umzug-libsql

[Umzug](https://github.com/sequelize/umzug) implementation with [LibSQL Client](https://github.com/tursodatabase/libsql-client-ts).

This package also exposes a CLI with sensible defaults for managing database migrations.

## Running via CLI

Configuration reference

| Environment Variable | Config Property | Default | Description |
|----------------------|-----------------|---------|-------------|
| TURSO_DATABASE_URL | url | :memory: | The database URL for LibSQL |
| TURSO_AUTH_TOKEN | authToken | undefined | Authentication token for the database |
| UMZUG_GLOB | glob | db/migrations/*.sql | Glob pattern for migration files |
| UMZUG_CONFIRM_BEFORE_DOWN | confirmBeforeDown | true | Whether to be asked for confirmation before running down migrations. With you're running multiple down migrations in a single command, it will execute all down migrations after confirmation |


### Run CLI using `npx`

```shell
npx umzug-libsql --help
```

By default, db url will be set to `:memory:`, you can customize it via environment variables

for example:

```shell
TURSO_DATABASE_URL=http://localhost:8080/ npx umzug-libsql
```

or you can specify path to your env file

```shell
npx --env .env umzug-libsql
```

### Run via custom file

you can also customize the config in a file

`cli.js`

```js
import { createLibSqlUmzug } from './db/umzug.js';
const { umzug } = createLibSqlUmzug({
  url: ':memory:',
  authToken: '...',
  glob: 'db/migrations/*.sql',
  confirmBeforeDown: true
});
umzug.runAsCLI();
```

```shell
node cli.js
```



## Use it from javascript code

Instead of running migrations from cli, you can also run it from javascript code. This is very useful for running migrations during tests.

For example in the code blow, you will get a fresh database with all tables but no data for each function

```js
import { createLibSqlUmzug } from "umzug-libsql";

const umzug = createLibSqlUmzug();

beforeEach(async () => {
  await umzug.down({
    to: 0,
  });
  await umzug.up();
});
```

## Custom umzug instance

If you want to create your own umzug instance you can do it like this:

```js

import { Umzug } from "umzug";
import { createClient } from '@libsql/client';
import { LibSqlStorage, createLibSqlResolver } from "umzug-libsql";

const client = createClient();

const storage = new LibSqlStorage(client);
const resolver = createLibSqlResolver(client, { confirmBeforeDown: false });

const umzug = new Umzug({
  migrations: {
    glob: "migrations/*.sql",
    resolve: resolver,
  },
  storage,
  logger: console,
});

await umzug.up();

```
