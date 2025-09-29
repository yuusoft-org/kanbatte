
# Roadmap

- [x] Project docs setup
- [ ] Complete CLI features
- [ ] Connect to LLM & git worktrees
- [ ] Connect to Discord
- [ ] Web UI

## Dev

- [ ] @han4wluc setup json schema validation
- [ ] @han4wluc setup unit test https://github.com/yuusoft-org/puty

## CLI implementation

- [x] implement `kanbatte new task`
- [ ] implmeent db migrations using https://github.com/yuusoft-org/umzug-libsql
- [ ] implement update:
```bash
kanbatte update task -i ${taskId} -s ${status}
kanbatte update task -i ${taskId} -t 'new title'
kanbatte update task -i ${taskId} --title 'new title'
kanbatte update task -i ${taskId} --description 'new description'
kanbatte update task -i ${taskId} -s ${status} -t 'new title' --description 'new description'
```
- [ ] implement new comment
```bash
# Create a new comment
kanbatte new comment -i 'AI-001' -c 'This feature needs more testing before deployment'
```
- [ ] implement new followup
```bash
# Create a new followup
kanbatte new followup -i 'AI-001' -c 'Scheduled code review for next sprint'
```
- [ ] implement read (this will need to implmeent the view table)
```bash
kanbatte read AI-001
```
- [ ] implement list
```bash
kanbatte list -p 'AI'
kanbatte list -p 'AI' -s ready,in-progress
```


