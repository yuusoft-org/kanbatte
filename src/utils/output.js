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
            if (!msg.role || !msg.content) {
              throw new Error(`Invalid completion API message format: ${JSON.stringify(msg, null, 2)}. Expected format: {role: string, content: string | Array}`);
            }

            let role = '🤖 Assistant';
            let timestamp = new Date(msg.timestamp).toISOString();
            let content = '';

            // Only support standard completion API format
            if (msg.role === 'user') {
              role = '👤 User';
              if (typeof msg.content === 'string') {
                content = msg.content;
              } else {
                throw new Error(`User message content must be a string, got: ${typeof msg.content}`);
              }
            } else if (msg.role === 'assistant') {
              role = '🤖 Assistant';
              if (typeof msg.content === 'string') {
                content = msg.content;
              } else if (Array.isArray(msg.content)) {
                // Extract text from assistant messages with array content
                content = msg.content
                  .filter(c => c.type === 'text')
                  .map(c => c.text)
                  .join('\n\n');
              } else {
                throw new Error(`Assistant message content must be a string or array, got: ${typeof msg.content}`);
              }
            } else if (msg.role === 'system') {
              role = '⚙️ System';
              if (typeof msg.content === 'string') {
                content = msg.content;
              } else {
                throw new Error(`System message content must be a string, got: ${typeof msg.content}`);
              }
            } else {
              throw new Error(`Unknown role: ${msg.role}. Valid roles: user, assistant, system`);
            }

            console.log(`### ${role} (${timestamp})\n\n`);
            console.log(`${content}\n\n`);
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
        // Session list table with required columns
        const extractSentence = (message) => {
          if (!message) return '';

          let textContent = '';

          // Only support standard completion API format
          if (message.role && typeof message.content === 'string') {
            textContent = message.content;
          } else if (message.role === 'assistant' && Array.isArray(message.content)) {
            // Extract text from assistant messages with array content
            textContent = message.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join(' ');
          } else {
            throw new Error(`Invalid completion API message format: ${JSON.stringify(message, null, 2)}. Expected format: {role: string, content: string | Array}`);
          }

          if (!textContent) return '';

          const firstSentence = textContent.split(/[.!?]/)[0].trim();
          return firstSentence.length > 40 ? firstSentence.substring(0, 37) + '...' : firstSentence + (textContent.includes('.') ? '.' : '');
        };

        const table = new Table({
          head: ["Session ID", "Status", "First Message", "Last Message", "Start Date", "Last Update"],
          colWidths: [15, 12, 25, 25, 12, 12],
        });

        data.forEach((session) => {
          const startDate = new Date(session.createdAt).toISOString().split('T')[0];
          const lastUpdate = new Date(session.updatedAt).toISOString().split('T')[0];

          let firstMessage = '';
          let lastMessage = '';

          if (session.messages && session.messages.length > 0) {
            firstMessage = extractSentence(session.messages[0]);
            lastMessage = extractSentence(session.messages[session.messages.length - 1]);
          }

          table.push([
            session.sessionId,
            session.status,
            firstMessage,
            lastMessage,
            startDate,
            lastUpdate,
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
