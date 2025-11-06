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
            let role = '🤖 Assistant';
            let timestamp = new Date(msg.timestamp).toISOString();
            let content = '';

            // Handle different message types
            if (msg.role === 'user') {
              role = '👤 User';
              content = msg.content || '';
            } else if (msg.role === 'assistant') {
              role = '🤖 Assistant';
              content = msg.content || '';
            } else if (msg.type === 'agent_response') {
              role = '🤖 Assistant';
              // Extract text from AI response
              if (Array.isArray(msg.content)) {
                const assistantMessages = msg.content.filter(m => m.type === 'assistant' && m.message?.content);
                content = assistantMessages
                  .flatMap(m => m.message.content.filter(c => c.type === 'text').map(c => c.text))
                  .join('\n\n');
              }
            } else if (msg.type === 'error') {
              role = '❌ Error';
              content = `Error: ${msg.content}`;
            } else {
              // Fallback for unknown types
              role = '📝 Message';
              content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2);
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
        const extractSentence = (content) => {
          if (!content) return '';

          let textContent = '';

          // Handle different message types
          if (typeof content === 'string') {
            textContent = content;
          } else if (typeof content === 'object') {
            // Handle AI response objects
            if (content.type === 'agent_response' && Array.isArray(content.content)) {
              // Extract text from assistant messages in the response
              const assistantMessages = content.content.filter(msg => msg.type === 'assistant' && msg.message?.content);
              textContent = assistantMessages
                .flatMap(msg => msg.message.content.filter(c => c.type === 'text').map(c => c.text))
                .join(' ');
            } else if (content.type === 'error') {
              textContent = `Error: ${content.content}`;
            } else if (content.content) {
              textContent = JSON.stringify(content.content);
            }
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
            firstMessage = extractSentence(session.messages[0].content);
            lastMessage = extractSentence(session.messages[session.messages.length - 1].content);
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
