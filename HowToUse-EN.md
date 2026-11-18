# Kangpos — How To Use

> Bahasa Indonesia version: [HowToUse.md](HowToUse.md)

Complete guide for using the **Kangpos** extension (Lightweight REST API Client for VS Code).

---

## 1. Install

### Option A — Install VSIX (recommended)
```bash
code --install-extension kangpos-1.0.0.vsix
```
or via VS Code UI: `Extensions` → `...` icon (Views and More Actions) → **Install from VSIX...** → select `kangpos-1.0.0.vsix`.

### Option B — Development Mode
```bash
nvm use 20
npm install
```
Open the project folder in VS Code → press **F5** → an **Extension Development Host** window opens.

### Option C — Global CLI
```bash
npm link          # from the project folder
kangpos-cli --help
```

> Building/packaging requires **Node.js 20** (`nvm use 20`).

---

## 2. Getting Started

Once active, the Kangpos icon appears in the **Activity Bar** with 2 panels:
- **Collections** — list of collections, folders, and requests
- **Activity** — history of sent requests

### Create a Collection & Request
1. Click `+` in the Collections panel header (or Command Palette `Kangpos: New Collection`).
2. Click `+` again for **New Request** → the request editor opens.

### Request Editor
- **Method** (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) + **URL** on the top bar, **Send** button (or `Cmd/Ctrl+Enter`).
- Tabs: **Params · Body · Auth · Headers · Tests · Docs**
  - **Params**: query string automatically linked to the URL (`?key=value`).
  - **Body**: `none · json · form · formdata · xml · raw · binary · graphql`.
  - **Auth**: `none · basic · bearer · apikey · oauth2 (client_credentials & password)`.
  - **Headers**: free-form key/value pairs.
  - **Tests**: click-to-add assert builder.
  - **Docs**: free-form markdown notes per request.
- Response panel below: **Body / Headers / Tests**, with a **JSONPath** filter and JSON/XML highlighting, plus Save Response.

---

## 3. Variables & Environments

### Syntax
Use `{{name}}` in URLs, headers, body, etc:
```
https://{{host}}/posts/{{postId}}
```

### Built-in dynamic variables
| Variable | Value |
|---|---|
| `{{$guid}}` | UUID v4 |
| `{{$randomUuid}}` | Random UUID |
| `{{$timestamp}}` | Unix epoch seconds |
| `{{$timestampMs}}` | epoch milliseconds |
| `{{$randomInt}}` | random number 1–1000 |
| `{{$randomHex8}}` | random 8-char hex |

### Managing environments
- Command `Kangpos: Manage Environments` → environment panel: create env, add variables, **Set Active** (checkmark), delete.
- Variable resolution order: **collection vars → active env → global**.
- Setting collection variables: edit the collection data file directly (the `envVars` field on the collection).

---

## 4. Testing (Assertions)

### Builder
In the **Tests** tab → pick a type + action, fill in the value/path → **Add**:

| Type | Available actions |
|---|---|
| `status` | equals · not_equals · less · greater · less_equals · greater_equals |
| `header` | exists · not_exists · equals · contains · not_contains · starts_with |
| `body` (JSONPath) | exists · not_exists · equals · not_equals · contains · not_contains · starts_with · length_equals · length_greater · length_less · greater · less |
| `text` (raw body) | contains · not_contains · equals · starts_with · ends_with |
| `time` | less · greater · less_equals (in ms) |
| `env` | set — store a value from the response (JSONPath) into an env variable, for request chaining |

### Custom script
The **Tests** tab can also contain JS script. Available API:
```js
// Environment
kangpos.setEnvVar('postId', response.json.id)   // request chaining!
kangpos.getEnvVar('postId')

// Local variables for this run
kangpos.setVar('x', 10)
kangpos.getVar('x')

// Assertions
assert(response.status === 201, 'status 201')
assert(response.json.title, 'title exists')

// Response helpers
response.json        // parsed body
response.headers     // object
response.time        // ms

// Logging
console.log('debug', response.json)
```

### Request chaining
Values from a response can be used in the next request:
```js
// Request 1: POST /posts
kangpos.setEnvVar('newId', response.json.id)
```
```
// Request 2: GET /posts/{{newId}}
```
Env variables set via script are saved automatically (an `env` message is sent to the panel).

---

## 5. Run Collection

Click the **▶ Run** icon on a collection (or the `Kangpos: Run Collection` command):
- All requests run in sequence (including those inside folders).
- When finished, a **report** opens: pass/fail per request + total time.
- The active env applies to all requests.

---

## 6. Import / Export

### Import
Command `Kangpos: Import` → pick the source:
- **Postman Collection v2.1** (`.json`) — nested folders, json body, bearer are carried over
- **Kangpos JSON** — Kangpos export format
- **cURL** — or directly `Kangpos: Import cURL` then paste the curl command

### Export
Right-click a collection → **Export Collection** → choose the `.json` file location.

---

## 7. Codegen & Share

- Right-click a request → **Copy as cURL** — cURL command to the clipboard.
- Right-click a request → **Generate Code** — pick a language: `curl · fetch · axios · python · go · php · csharp` → result to the clipboard.

---

## 8. Activity (History)

- Every sent request is recorded automatically (grouped: Today / Yesterday / 7 days / Older).
- Click an entry → the request reopens in the editor.
- Command `Kangpos: Clear Activity` to clean up.
- History limit is controlled by the `kangpos.maxActivity` setting (default 100).

---

## 9. Keyboard & Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Alt + R` | Re-run last request |
| `Cmd/Ctrl + Enter` (in webview) | Send request |

Right-click menus in the tree also offer: New Request, New Folder, Rename, Duplicate, Delete, Run, Export, Copy as cURL, Generate Code.

---

## 10. Settings

| Setting | Default | Description |
|---|---|---|
| `kangpos.theme` | `blue` | UI accent color (`blue/red/green/purple/orange/pink/teal/dark/light`) |
| `kangpos.requestTimeout` | `0` | Request timeout in ms (0 = no timeout) |
| `kangpos.followRedirects` | `true` | Follow HTTP redirects automatically |
| `kangpos.maxRedirects` | `10` | Maximum redirects |
| `kangpos.verifySsl` | `true` | Verify SSL certificates |
| `kangpos.proxy` | `""` | Proxy, e.g. `http://127.0.0.1:8080` |
| `kangpos.workspaceStorage` | `false` | Store data in the workspace `.kangpos/` folder (git-backup friendly). Reload window after changing |
| `kangpos.saveActivity` | `true` | Record request history |
| `kangpos.maxActivity` | `100` | Max history entries |
| `kangpos.reuseTab` | `true` | Open requests in the same tab |

**Data location** (default): per-user VS Code global storage.

---

## 11. CLI — kangpos-cli

Run collections from the terminal (great for CI):

```bash
kangpos-cli -c collection.json
kangpos-cli -c collection.json -e environments.json -n "Dev" -o report.json
kangpos-cli -c collection.json -d 500        # 500ms delay between requests
kangpos-cli -c collection.json -p 4          # 4 parallel requests
kangpos-cli -c collection.json --insecure    # skip SSL verify
```

| Flag | Purpose |
|---|---|
| `-c, --collection <file>` | Collection file (required) |
| `-e, --environment <file>` | Environment file (`.kangpos/environments.json` or variables JSON) |
| `-n, --env-name <name>` | Select environment by name when the file contains multiple envs |
| `-d, --delay <ms>` | Delay between requests |
| `-o, --output <file>` | Write a JSON report |
| `-p, --parallel <n>` | Run n requests in parallel |
| `--insecure` | Disable SSL certificate verification |
| `-h, --help` | Show help |

Colorful terminal output (pass ✔ / fail ✘), **non-zero** exit code if anything fails.

---

## 12. Tips

- **Quick API verification**: create a request `GET https://jsonplaceholder.typicode.com/posts/1` → Send → expect status 200.
- Use `{{var}}` + separate dev/staging/prod envs so one collection works across servers.
- Set `kangpos.workspaceStorage: true` if you want collection data committed to your repo.
- Recommended first tests: `status equals 200` + `body contains id`.
