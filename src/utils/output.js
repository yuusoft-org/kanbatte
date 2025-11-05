import Table from "cli-table3";

export const formatOutput = (data, format, type) => {
  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (format === "markdown") {
    if (type === "list" && Array.isArray(data)) {
      if (data.length > 0 && data[0].sessionId) {
        // Session list formatting
        console.log("| Session ID | Project | Status | Created |");
        console.log("|------------|---------|--------|----------|");
        data.forEach((session) => {
          const created = new Date(session.createdAt).toISOString().split('T')[0];
          console.log(
            `| ${session.sessionId} | ${session.project} | ${session.status} | ${created} |`,
          );
        });
      } else {
        // Task list formatting
        console.log("| Task ID | Title | Status | Description |");
        console.log("|---------|-------|--------|-------------|");
        data.forEach((task) => {
          const desc = (task.description || "").substring(0, 50);
          console.log(
            `| ${task.taskId} | ${task.title} | ${task.status} | ${desc} |`,
          );
        });
      }
    } else if (type === "read") {
      if (data.sessionId) {
        // Session formatting
        console.log(`# Session ${data.sessionId}\n`);
        console.log(`**Project:** ${data.project}\n`);
        console.log(`**Status:** ${data.status}\n`);
        console.log(`**Created:** ${new Date(data.createdAt).toISOString()}\n`);
        console.log(`**Updated:** ${new Date(data.updatedAt).toISOString()}\n\n`);

        if (data.messages && data.messages.length > 0) {
          console.log(`## Messages\n\n`);
          data.messages.forEach((msg) => {
            const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
            const timestamp = new Date(msg.timestamp).toISOString();
            console.log(`### ${role} (${timestamp})\n\n`);
            console.log(`${msg.content}\n\n`);
          });
        }
      } else {
        // Task formatting
        console.log(`# ${data.taskId}: ${data.title}\n`);
        console.log(`**Status:** ${data.status}\n`);
        console.log(`**Description:** ${data.description || "N/A"}\n`);
      }
    }
    return;
  }

  if (format === "table") {
    if (type === "list" && Array.isArray(data)) {
      if (data.length > 0 && data[0].sessionId) {
        // Session list table
        const table = new Table({
          head: ["Session ID", "Project", "Status", "Created"],
          colWidths: [15, 20, 15, 20],
        });
        data.forEach((session) => {
          const created = new Date(session.createdAt).toISOString().split('T')[0];
          table.push([
            session.sessionId,
            session.project,
            session.status,
            created,
          ]);
        });
        console.log(table.toString());
      } else {
        // Task list table
        const table = new Table({
          head: ["Task ID", "Title", "Status", "Description"],
          colWidths: [12, 30, 15, 50],
        });
        data.forEach((task) => {
          table.push([
            task.taskId,
            task.title,
            task.status,
            (task.description || "").substring(0, 47),
          ]);
        });
        console.log(table.toString());
      }
    } else if (type === "read") {
      const table = new Table();
      if (data.sessionId) {
        // Session table
        table.push(
          { "Session ID": data.sessionId },
          { Project: data.project },
          { Status: data.status },
          { Created: new Date(data.createdAt).toISOString() },
          { Updated: new Date(data.updatedAt).toISOString() },
        );

        if (data.messages && data.messages.length > 0) {
          table.push({ "Messages": `${data.messages.length} message(s)` });
        }
      } else {
        // Task table
        table.push(
          { "Task ID": data.taskId },
          { Title: data.title },
          { Status: data.status },
          { Description: data.description || "N/A" },
        );
      }
      console.log(table.toString());
    }
  }
};
