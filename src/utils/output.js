import Table from "cli-table3";

export const formatOutput = (data, format, type) => {
  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (format === "markdown") {
    if (type === "list" && Array.isArray(data)) {
      console.log("| Task ID | Title | Status | Description |");
      console.log("|---------|-------|--------|-------------|");
      data.forEach((task) => {
        const desc = (task.description || "").substring(0, 50);
        console.log(
          `| ${task.taskId} | ${task.title} | ${task.status} | ${desc} |`,
        );
      });
    } else if (type === "read") {
      console.log(`# ${data.taskId}: ${data.title}\n`);
      console.log(`**Status:** ${data.status}\n`);
      console.log(`**Description:** ${data.description || "N/A"}\n`);
      if (data.comments && data.comments.length > 0) {
        console.log(`## Comments\n`);
        data.comments.forEach((c) => console.log(`- ${c.content}`));
      }
      if (data.followups && data.followups.length > 0) {
        console.log(`\n## Followups\n`);
        data.followups.forEach((f) => console.log(`- ${f.content}`));
      }
    }
    return;
  }

  if (format === "table") {
    if (type === "list" && Array.isArray(data)) {
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
    } else if (type === "read") {
      const table = new Table();
      table.push(
        { "Task ID": data.taskId },
        { Title: data.title },
        { Status: data.status },
        { Description: data.description || "N/A" },
      );
      console.log(table.toString());

      if (data.comments && data.comments.length > 0) {
        console.log("\nComments:");
        const commentsTable = new Table({
          head: ["Comment ID", "Content"],
        });
        data.comments.forEach((c) =>
          commentsTable.push([c.commentId, c.content]),
        );
        console.log(commentsTable.toString());
      }

      if (data.followups && data.followups.length > 0) {
        console.log("\nFollowups:");
        const followupsTable = new Table({
          head: ["Followup ID", "Content"],
        });
        data.followups.forEach((f) =>
          followupsTable.push([f.followupId, f.content]),
        );
        console.log(followupsTable.toString());
      }
    }
  }
};
