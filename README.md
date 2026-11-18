# Kangpos

Lightweight Rest API Client for VS Code — made with love. No setup required.

> Build requirement: **Node.js 20** (`nvm use 20`, pinned via `.nvmrc`)

## Features

- Send HTTP requests: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`
- REST API and **GraphQL** support
- **Collections** — save requests, organize in folders, drag & drop
- **Environments & Variables** — global env, environments, collection variables, `{{variable}}` syntax, dynamic variables (`{{$guid}}`, `{{$timestamp}}`, `{{$randomInt}}`, `{{$timestampMs}}`, `{{$randomHex8}}`)
- **Activity tab** — full request history grouped by time, reopen any past request
- **Session requests** — send without saving, then Save / Save As to a collection
- **Scriptless testing** — visual Assert library (Status Code, Header, Body JSON Path, Body Text, Response Time, Set Env Var)
- **Custom scripts** — post-response JavaScript sandbox with `kangpos.setEnvVar()`, `kangpos.assert()`, `response.json`, `console.log` — great for request chaining
- **Auth** — Basic, Bearer Token, API Key (header/query), OAuth 2.0 (client credentials & password grants auto-fetch token)
- **Body types** — JSON, Form Urlencoded, Form Data (multipart + file upload), XML, Raw, Binary file, GraphQL
- **Generate Code** — cURL, Node.js, JavaScript, Python, Go, PHP, C#
- **Copy as cURL**
- **Import** — Postman Collection v2.1, cURL command, Kangpos JSON
- **Export** — collection to Kangpos JSON
- **Run Collection** — sequential or parallel, with pass/fail report (view + save)
- **CLI** — run collections in terminal / CI: `kangpos-cli -c collection.json`
- **Proxy**, timeout, SSL verification settings
- **Local storage** — data saved in VS Code global storage, or in the workspace `.kangpos` folder (backup to git) via `kangpos.workspaceStorage`

## Getting Started

1. Click the Kangpos icon in the Activity Bar
2. Click **+** to create a New Request
3. Enter URL, pick method, hit **Send** (`Ctrl/Cmd + Enter` inside the request view)

## CLI

```bash
kangpos-cli -c collection.json [-e environments.json] [-n "Env Name"] [-d 500] [-p 4] [-o report.json] [--insecure]
```

- `-c` Kangpos collection JSON (export one from the extension)
- `-e` environment file (`environments.json` from `.kangpos` folder or a simple `{"variables":[{"name":"x","value":"1"}]}` file)
- `-p n` run n requests in parallel
- Exits non-zero if any request/test fails — perfect for CI

## Settings

| Setting | Default | Description |
|---|---|---|
| `kangpos.theme` | `blue` | UI accent (blue, red, green, purple, orange, pink, teal, dark, light) |
| `kangpos.requestTimeout` | `0` | Request timeout in ms (0 = none) |
| `kangpos.followRedirects` | `true` | Follow redirects |
| `kangpos.maxRedirects` | `10` | Max redirects |
| `kangpos.verifySsl` | `true` | Verify SSL certificates |
| `kangpos.proxy` | `` | HTTP proxy URL |
| `kangpos.workspaceStorage` | `false` | Save data in workspace `.kangpos` folder |
| `kangpos.saveActivity` | `true` | Keep request history |
| `kangpos.maxActivity` | `100` | Max history entries |
| `kangpos.reuseTab` | `true` | Reuse tab when opening the same request |

## Commands

Command Palette → type "Kangpos" to see all commands: New Request, New Collection, Import, Manage Environments, Set Active Environment, Re-run Last Request (`Ctrl/Cmd+Alt+R`), Run Collection, Export Collection, Copy as cURL, Generate Code, Clear Activity.

## License

MIT
