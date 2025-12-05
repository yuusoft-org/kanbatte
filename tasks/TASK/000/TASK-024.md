---
title: Refactor all dependencies
status: done
priority: high
---

# Description

## Context
- current depdencies is very messy, we need to clean it up

## Solution
- use the adapter/infra and service/dao structure

infra:

- libsql (this is the lowest level storage lib, this is also used for views)
  - has multiple tables
  - sessions and discord use different tables
- fs (file system, used for tasks. for testing we will replace it with memfs)
- insieme (is a wrapper around libsql, is used for supporting conflict free writes)
- discord api (maybe?)

service:

- tasks
  - deps:
    - fs

- sessions & projects
  - deps:
    - insieme (kanbatte)
      - deps:
        - libsql
    - libsql (sessions view, projects view)

- discord
  - deps:
    - insieme (discord)
      - deps:
         - libsql
    - libsql (discord threads view, last offset) 

there should be 3 different deps




```js

const createFs = () => {
  return {
    ... // just follow the node fs API, which is also same as memfs
  }
}

const taskDeps = {
  fs,
}



const createSessionService = (libsql) => {
  return {
    getViewBySessionId: () => {...},
  }
}

// mostly just rename insiemeDao to sessionService
// rename this one into sessionService.getViewBySessionId
// const session = await insiemeDao.getViewBySessionId({ sessionId });


const sessionDeps = { // includes session projects
  sessionService
}



// follow similar parttern as sessions
const discordDeps = {
  discordService
}


```




libsql initialization:

this one is a bit weird. beacuse we're doing creation and initialization at the same time.
libsql init will migrate all the database tables
```js
    const insiemeDao = await createMainInsiemeDao();
```

a more correct way is to:

```js
const libsql = createLibsqlClient(...) 
const insieme = createInsieme(libsql) // just temp names. improve it for real code
const sessionService = createSessionService(libsql, insieme);

// this one can be initiatied in the cli  action
await libsql.init(...)
```

so we separate the create and init. init will do the db migrations. if libsql is called without init, it will throw error.




