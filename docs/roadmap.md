
# Roadmap

- [x] Project docs setup

## CLI implementation

- [x] implement `kanbatte new task`
- [x] implement db migrations using https://github.com/yuusoft-org/umzug-libsql

## Completed Features (Iteration 002)

- [x] Proper umzug-libsql integration
- [x] SQL-based migrations instead of JS
- [x] Comprehensive test suite
- [x] Migration rollback functionality
- [x] Test automation with npm scripts

## Completed Features (Iteration 003)

- [x] Implement `kanbatte update task` command for status changes
- [x] Add task status transitions (ready → in-progress → done)
- [x] Clean up console debug messages for production use

## Completed Features (Iteration 004)

- [x] Implement file-based task creation (`-f` option)
- [x] Implement comments system (`kanbatte new comment`)

## Next Priority

- [ ] Implement followups system (`kanbatte new followup`)
- [ ] Enhanced filtering and search options
- [ ] Task dependencies and relationships

