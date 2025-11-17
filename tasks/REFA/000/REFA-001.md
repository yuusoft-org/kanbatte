---
title: Consistent Refactor
status: done
priority: high
---

# Description

There are many "inconsistent code" issues in the current project.

1. **Inconsistent import statement styles**
   Problem: Mixed use of multiple import styles

```js
// Style 1: Named imports
import { readFile } from "fs/promises";

// Style 2: Default imports
import yaml from "js-yaml";

// Style 3: Namespace imports
import * as YAML from "js-yaml";
```

Example locations:
src/utils/buildSite.js:3 - import yaml from "js-yaml"

**Guideline: Prefer named imports, then default imports. Namespace imports should not be used.**

2. **Inconsistent function declaration styles**

```js
Problem: Mixed use of multiple function declaration methods
// Style 1: Function declaration
export function createTask() {}

// Style 2: Arrow function assignment
export const addSession = async () => {}
```

Example locations:
src/commands/session.js - Heavy use of arrow function form
src/commands/task.js - Uses traditional function declarations
src/utils/git.js - Mixed use of both styles

**Guideline: Use arrow functions consistently**

3. **Inconsistent error handling**
   Problem: Inconsistent error handling methods

```js
// Style 1: throw new Error
throw new Error("Task file not found");

// Style 2: console.error + return null
console.error("Error: Task title is required");
return null;
```

Example locations:
src/commands/task.js:28-35 - Uses console.error + return null
src/commands/session.js:4-15 - Uses throw new Error

**Guideline: Use throw new Error consistently**

4. **Inconsistent code organization structure**

Problem: Inconsistent function arrangement order within files
src/utils/output.js - Main functions first, helper functions last
src/commands/session.js - No clear organization logic

Unified code organization: Arrange in order of public functions → private functions → helper utilities

5. **Inconsistent Shebang usage**
   Problem: Only some files include shebang
// With shebang
#!/usr/bin/env bun  // src/cli.js, src/utils/tasks.js

Unified Shebang usage: Only keep shebang in executable files

Need to check all the above issues in the project. The problem locations are not limited to the examples provided. Must be checked thoroughly.
