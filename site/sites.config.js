
export default {
  screenshots: {
    ignore: [
      "tasks/**",
    ]
  },
  functions: {
    extractTaskId: (url) => {
      const parts = url.split('/');
      return parts[parts.length - 2];
    },
    sortTasks: (list) => {
      const priorityMap = {
        high: 3,
        medium: 2,
        low: 1
      };
      const res = [...list].sort((a, b) => {
        const prioA = priorityMap[a.data.priority] || 0;
        const prioB = priorityMap[b.data.priority] || 0;
        if (prioB !== prioA) {
          return prioB - prioA; // descending order by priority
        } else {
          const idA = a.url;
          const idB = b.url;
          return idA.localeCompare(idB); // ascending order by id
        }
      });
      return res;
    },
    upperCaseFirst: (str) => {
      if (!str || str.length === 0) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    log: (any) => {
      console.log(any);
      return any;
    }
  }
}
