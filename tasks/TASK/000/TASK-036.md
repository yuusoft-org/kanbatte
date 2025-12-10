---
title: discord unknown interaction error
status: todo
priority: high
assignee: 738NGX
---

# Description

the below error made the service crash.
we need to gracefully handle it



index.js:618:5)                                                                       │
      at handleErrors (/home/ubuntu/kanbatte/node_modules/@discordjs/rest/dist/index.j│
s:762:13)                                                                             │
                                                                                      │
613 |    * @param method - The method of the request that erred                       │
614 |    * @param url - The url of the request that erred                             │
615 |    * @param bodyData - The unparsed data for the request that errored           │
616 |    */                                                                           │
617 |   constructor(rawError, code, status, method, url, bodyData) {                  │
618 |     super(_DiscordAPIError.getMessage(rawError));                               │
          ^                                                                           │
error: Unknown interaction                                                            │
 requestBody: {                                                                       │
  files: [],                                                                          │
  json: [Object ...],                                                                 │
},                                                                                    │
   rawError: {                                                                        │
  message: "Unknown interaction",                                                     │
  code: 10062,                                                                        │
},                                                                                    │
       code: 10062,                                                                   │
     status: 404,                                                                     │
     method: "POST",                                                                  │
        url: "https://discord.com/api/v10/interactions/1448355772831633619/aW50ZXJhY3R│
......│
3Wk1SRVdtdnEzeVdHakVTenAzVUQxbA/callback?with_response=false",                        │
                                                                                      │
      at new DiscordAPIError (/home/ubuntu/kanbatte/node_modules/@discordjs/rest/dist/│
index.js:618:5)                                                                       │
      at handleErrors (/home/ubuntu/kanbatte/node_modules/@discordjs/rest/dist/index.j│
s:762:13)                                                                             │


