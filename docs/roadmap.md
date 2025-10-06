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

- [ ] implement list

```bash
kanbatte list -p 'AI'
kanbatte list -p 'AI' -s ready,in-progress
```

Fixes for future -

- [ ] In update command, check whether a task exists with teh passed in taskId or not.
- [ ] task id should be like `AI-1` `AI-2` ... `AI-10`

## LLM

- [ ] setup a hello world agent sdk: https://docs.claude.com/en/api/agent-sdk/typescript (dont integrate with tasks for now)
     - you should be able to run test cli. that will just call claude code, and then console lot the response.
- [ ] create a cli to:
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
- projectId: SP
  name: Spinoza
  repository: git@github.com:han4wluc/spinoza.git (optional)
  description: |
    Data collection library

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



