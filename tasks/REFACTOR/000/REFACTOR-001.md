---
title: Refactor Service Initialization for Lazy Loading
status: todo
priority: high
labels: [refactor, architecture]
---

# Description

The application currently initializes all services, including the `ConfigService` and database connections, at startup in `src/cli.js`. This  initialization causes two major problems:

1.  **CI/CD Failures:** Commands that do not depend on `kanbatte.config.yaml` (e.g., `kanbatte task create`) fail in environments where the file is absent, such as CI/CD pipelines or new user setups.
2.  **Unnecessary Overhead:** Services and database connections are instantiated even for simple commands that don't use them, adding unnecessary startup latency.

This task is to refactor the dependency management to a lazy-loading model, where services are only created when they are explicitly required by a command.

# Proposed Solution

We will introduce a `DependencyBuilder` class, inspired by the modern .NET service builder pattern. This builder will be responsible for instantiating and managing the lifecycle of all services.

1.  A single `DependencyBuilder.js` file will be created in `src/deps/`.
2.  This builder will have methods like `getConfigService()`, `getLibsqlInfra()`, `getSessionService()`, etc.
3.  The builder will cache service instances (act as a singleton factory) to avoid re-creating them on subsequent requests within the same process.
4.  `src/cli.js` will be refactored to remove all upfront service creation.
5.  Instead, each command's `.action()` handler will request the specific services it needs from the builder instance. This make sures that services are only created when needed

# Pros

-   **Robustness:** Commands will no longer fail due to missing configurations they don't use. `kanbatte task` commands will work out-of-the-box in any repo.
-   **Performance:** Faster startup time for simple commands that don't require database or configuration access.
-   **Maintainability:** Centralizes all dependency creation logic into a single, manageable file. `cli.js` becomes cleaner and focuses solely on command definitions.
-   **Clarity:** Makes the dependencies of each command explicit within its action handler.

# Cons

-   **Increased Abstraction:** Introduces a new layer (`DependencyBuilder`) which adds a small amount of complexity to the overall architecture.

# Acceptance Criteria

-   `kanbatte task create` and `kanbatte task list` must execute successfully without a `kanbatte.config.yaml` file present.
-   `kanbatte session list` must fail gracefully with a clear error message if the config file is missing, but work correctly if it is present.
-   All other commands must continue to function as expected.
-   The CI/CD pipeline should no longer fail due to missing configuration on `task` related steps.