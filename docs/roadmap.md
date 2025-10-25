# Roadmap

- [X] Project docs setup
- [ ] [In Progress] Complete CLI features
- [ ] Connect to LLM & git worktrees
- [ ] [Low Priority] Connect to Discord
- [ ] Web UI

## Dev

- [ ] @han4wluc setup json schema validation
- [ ] @han4wluc setup unit test https://github.com/yuusoft-org/puty

## @aditya CLI implementation

- [X] implement `kanbatte new task`
- [X] implmeent db migrations using https://github.com/yuusoft-org/umzug-libsql
- [X] implement update:

```bash
kanbatte update task -i ${taskId} -s ${status}
kanbatte update task -i ${taskId} -t 'new title'
kanbatte update task -i ${taskId} --title 'new title'
kanbatte update task -i ${taskId} --description 'new description'
kanbatte update task -i ${taskId} -s ${status} -t 'new title' --description 'new description'
```

- [X] implement new comment

```bash
# Create a new comment
kanbatte new comment -i 'AI-001' -c 'This feature needs more testing before deployment'
```

- [X] implement new followup

```bash
# Create a new followup
kanbatte new followup -i 'AI-001' -c 'Scheduled code review for next sprint'
```

- [X] implement read (this will need to implmeent the view table)

```bash
kanbatte read AI-001
```

- [X] implement list

```bash
kanbatte list -p 'AI'
kanbatte list -p 'AI' -s ready,in-progress
```

Fixes for future -

- [ ] In update command, check whether a task exists with teh passed in taskId or not.
- [X] task id should be like `AI-1` `AI-2` ... `AI-10`

## LLM

- [X] setup a hello world agent sdk: https://docs.claude.com/en/api/agent-sdk/typescript (dont integrate with tasks for now)
  - you should be able to run test cli. that will just call claude code, and then console lot the response.
- [X] create a cli to:
  - take 1 task in status `ready`
  - call claude code with the title and description of the task.
  - get all response from claude code and create a comment for the task
  - update task status to `review`
- [ ] setup git work trees
  - take 1 task in status `ready`
  - git clone repo (get it from project's repository) if not already cloned
  - create a worktree with folder name of the tasks id
  - call claude code with the title and description of the task. with `cwd` inside the worktree
  - get all response from claude code and create a comment for the task
  - use llm to stage all git changes and push to git and create a PR (not 100% is to put this inside the prompt or keep it separate)
  - update task status to `review`
- [ ] setup projects. for now can just create a yaml file locally like this. and maybe we will store in db.
  - [ ] when creating a task. check first if project id exists

```yaml
- projectId: RC
  name: RouteVN Creator Client
  repository: git@github.com:yuusoft-org/routevn-creator-client.git
  description: |
    Client code for RouteVN Creator
- projectId: YA
  name: yahtml
  repository: git@github.com:yuusoft-org/yahtml.git
  description: |
    yahtml project
- projectId: RG
  name: Route Graphics
  repository: git@github.com:yuusoft-org/route-graphics.git
  description: |
    Route graphics lib
```

## 2025-10-17 update

- [X] remove logs.
- [X] cli result should support json or markdown/ascii format output
- [X] in new folder. running migrations. not finding migration files.

```js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Recreate __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Example: Import or read another file relative to this file
const relativePath = join(__dirname, '../data/config.json');

console.log('Current file:', __filename);
console.log('Current dir:', __dirname);
console.log('Relative path:', relativePath);
```

- [X] projects move to db instead of using yaml file



## 2025-10-25 update

Bugs:

- [ ] Comment content has extra new lines. needs to be removed.
- [ ] `bun run src/cli.js read JE-1`, gets stuck with table format. at comments.
- [ ] Agent when starting is starting in the repo path instead of in the worktree project path. Claude Code has an sdk to set the inital path. need to use that
- [ ] for git commit, git push. inject in the prompt. so when we pass the task description to the agent to work on , at the end we inject the prompt to tell it that at end of finishng the task do the git stuff

