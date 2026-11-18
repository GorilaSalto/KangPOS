# Task Log — 2026-11-18: Build Kangpos 1.0.0 (Thunder Client clone)

## Workflow release (sejak 2026-11-18, v1.0.1)
Setiap commit+push = update versi + GitHub Release:
1. Commit perubahan
2. `npm version patch` (bump package.json + tag vX.Y.Z) → `git push && git push --tags`
3. `npm run vsix` → `kangpos-$npm_package_version.vsix` (output dinamis)
4. Buat GitHub Release via API pakai token dari `git credential fill` (gh CLI belum terinstall):
   `curl -X POST https://api.github.com/repos/GorilaSalto/KangPOS/releases` + upload asset
   `https://uploads.github.com/repos/GorilaSalto/KangPOS/releases/{id}/assets?name=...`
5. Repo: https://github.com/GorilaSalto/KangPOS — release contoh: https://github.com/GorilaSalto/KangPOS/releases/tag/v1.0.1

## Riwayat versi setelah 1.0.0

### v1.0.1 (2026-11-18) — Thunder Client style UI + release automation
- Refactor UI: `src/providers/sidebar.ts` webview (header ⚡ KANGPOS, tombol New Request, tab
  Activity/Collections/Env default Activity, filter pill, list aktivitas pill method + URL + time ago)
- Request panel gaya TC: baris method+URL+Send, toolbar (env + ikon save + Actions), tab
  `Params/Auth/Headers°/Body/Tests`, tabel "Query Parameters" (checkbox biru, key/value borderless,
  baris template `parameter|value`), response `Status/Size/Time` berwarna, tab
  `Response/Headers°/Cookies/Test Results`, body berline-number, filter kanan bawah
- Save via **Ctrl+S/Cmd+S** (+ ikon save); tombol Save/Save As terpisah dihapus
- Default headers request baru: `Accept: */*`, `User-Agent: KangPOS(@kangpos)`; auto
  `Content-Type: application/json` saat method POST (juga fallback di `http.ts`)
- Icon activity bar: bolt outline (feather zap)
- `npm run vsix` output dinamis `kangpos-$npm_package_version.vsix`; release GitHub + asset vsix
- Catatan: ikon activity bar abu-abu = tint VS Code saat panel tidak aktif (normal)

### v1.0.2 (2026-11-18) — autocomplete headers + fix fokus
- Autocomplete nama header: `HEADER_DEFS` (38 header umum + deskripsi), filter saat mengetik,
  panah ↑↓/Enter/Esc, klik item; input manual tetap bisa. Dropdown `.hdr-ac` position:fixed
- Fix fokus (revisi user): saat mengetik karakter pertama di baris template Params/Headers/Form,
  baris dibuat tapi fokus **tetap di input yang sedang diketik** (`focusAdded`), bukan pindah ke
  baris berikutnya. `focusTpl` dihapus
- Param baru via baris template langsung update URL (`serializeUrl`)
- Konfirmasi: tidak ada tombol Save As tersisa di kode — user perlu install vsix + Reload Window
  (panel lama masih memuat HTML versi lama)
- Smoke test: harness DOM shim di `$TMPDIR/kangpos-ui-test/harness.ts` (init, response, saved, error,
  tab headers, tab body, sidebar 3 tab) — ALL-OK; typecheck PASS

### v1.0.3 (2026-11-18) — update task log
- Riwayat v1.0.1 & v1.0.2 dicatat di task log; release v1.0.3 hanya dokumentasi

### v1.0.4 (2026-11-18) — Beautify JSON body
- Body → JSON: tombol **Beautify** kanan atas textarea (`#beautifyBtn`) → `JSON.stringify(parsed, null, 2)`
- Error inline `#beautifyMsg` jika JSON tidak valid; pesan hilang saat mengetik
- CSS `.kp-bodybar` / `.kp-inline-err`; tombol hanya muncul untuk body type JSON

### v1.0.5 (2026-11-18) — Editor JSON ber-highlight ala Thunder Client
- Body → JSON/XML/Text kini memakai editor kode: `<pre class="code-highlight">` + `<textarea id="bodyRaw">`
  transparan di atasnya (caret tetap terlihat, undo/selection native), plus gutter nomor baris `#bodyGutter`
- Highlight memakai ulang `highlightJson` / `highlightXml`; palet editor: key `#e5a06b`, string `#98c379`,
  number/bool/null `#c678dd` (scoped `.code-highlight .tok-*`, response body tidak berubah)
- Sinkron scroll (scrollTop/Left) textarea → highlight + gutter; Tab menyisipkan 2 spasi; tinggi 340px, no-wrap
- Selector body type diganti tab row sesuai screenshot: Json, Xml, Text, Form, Form-encode, Graphql, Binary, None
- Tombol **Beautify** → **Format** dan dipindah ke kiri bawah editor (`.kp-bodybar` justify flex-start)
- Judul section "Json Content" / "Xml Content" / "Text Content" (`.kp-sectitle`)
- Verifikasi: `npx tsc -p . --noEmit` PASS; harness DOM-shim 10 skenario OK (termasuk `requestUI body json editor`)


## Ringkasan
Membangun extension VSCode "kangpos" dari nol: REST client lengkap (collections, environments,
testing, codegen, import/export, run collection, CLI). Hasil akhir: `kangpos-1.0.0.vsix` (139.83 KB,
9 file) siap install. Semua test lolos.

## Task yang dikerjakan (urutan)

### 1. Setup project
- `package.json` manifest: viewsContainers `kangpos`, views `kangpos-collections` / `kangpos-activity`,
  20 commands, menus, keybinding `ctrl+alt+r` (re-run), configuration, `bin: kangpos-cli`
- `tsconfig.json`, `esbuild.mjs` (bundle extension + CLI terpisah dengan shebang banner)
- `.gitignore`, `.vscodeignore`, `media/kangpos.svg` (icon activity bar)
- Node engine: `>=20.0.0`

### 2. Core source files
- `src/types.ts` — model data: `KangposRequest` (method, 8 body type, auth 5 tipe, headers, tests, script, docs),
  `KangposFolder` (recursive), `KangposCollection`, `KangposEnv` (global id `'g'`), `ActivityEntry`
- `src/utils/utils.ts` — `deepClone`, `uid`, `parseCurl` (-X/-H/-d/-F/-u/-k + quote handling), `getJsonPath`
- `src/utils/http.ts` — HTTP engine: redirect (method-switch POST→GET), proxy agent, gzip/br, oauth2 token fetch,
  multipart, `bodyBase64` untuk binary response
- `src/utils/asserts.ts` — assert types: status, equals, not-equals, contains, not-contains, regex, exists,
  not-exists, env-var-set, response-time
- `src/utils/codegen.ts` — codegen 7 bahasa (curl, JS fetch, Node axios, Python requests, Go, PHP, C#)
- `src/data/store.ts` — Store singleton (`setStore`/`store`): collections/environments/activity ke
  global storage atau workspace `.kangpos/` (setting `kangpos.workspaceStorage`); `moveItem`,
  `duplicateItem`, `listFolders`, `locateInCollection`, `persistCollections`
- `src/data/importer.ts` — import Postman v2.1 (folder nested, json body, bearer), import cURL,
  import/export Kangpos JSON
- `src/data/runCollection.ts` — `sendResolvedRequest` (resolve `{{var}}` global + env aktif + collection vars +
  dynamic `$guid/$timestamp/$timestampMs/$randomInt/$randomHex8`), `runScript` (sandbox vm:
  `kangpos.setEnvVar/getEnvVar/setVar/getVar/assert`, `response.json`, `console.log`), `runCollection`,
  request chaining via env-set

### 3. Providers & UI
- `src/providers/collectionTree.ts` — CollectionTreeProvider + drag & drop + icon method SVG data-URI
- `src/providers/activityTree.ts` — grup Today / Yesterday / 7 days / Older
- `src/providers/requestPanel.ts` — RequestPanelManager: open/reuse tab, save/saveAs (input nama →
  pilih collection → pilih folder), re-run (`ctrl+alt+r`), openSaved, openActivity, importCurlFlow,
  copy-curl, generate-code, save-response
- `src/webview/requestUi.ts` — webview vanilla JS besar: tab Params/Body/Auth/Headers/Tests/Docs,
  tab response Body/Headers/Tests, JSON/XML highlight, JSONPath filter, assert builder, editor script
  custom, env selector, theming accent. Catatan: string template TS tanpa backtick/`${}`, regex pakai
  `\\`, JSON INIT di-escape `\u003c`
- `src/providers/envPanel.ts` — env manager (variable, aktifkan env, import/export)
- `src/providers/reportPanel.ts` — report run collection (pass/fail per request)
- `src/extension.ts` — activate(): 20 command terdaftar + wiring semua provider

### 4. CLI
- `src/cli/cli.ts` — `kangpos-cli`: `-c collection -e env -n nama -d data -o report -p proxy --insecure`
- `package.json` `"bin": {"kangpos-cli": "dist/cli.js"}`

### 5. Syarat Node 20 (permintaan user)
- `.nvmrc` berisi `20`
- `preinstall` script: exit(1) jika Node major ≠ 20 dengan pesan `[kangpos] Node 20 required. Run: nvm use 20`
- Semua perintah dijalankan dengan `source ~/.nvm/nvm.sh && nvm use 20` (shell session reset ke Node 14 tiap perintah)
- README ditambah catatan Node 20

### 6. Testing (semua lolos)
- **CLI E2E**: run collection 2 request ke jsonplaceholder.typicode.com → `2 passed, 0 failed`, report JSON tertulis
- **Unit-ish via bundle test** (`/var/.../opencode/kangpos-test/`): `parseCurl`, `interpolateVars`
  (dynamic vars), `getJsonPath`, import Postman + re-export/re-import Kangpos JSON
- **Request chaining**: assert env-set + script `setEnvVar`/`assert`/`console.log` → env var tersimpan
- **Webview**: syntax check `new Function` + simulasi runtime penuh via vm + DOM shim (semua tab,
  8 body type, 5 auth type, pesan response/error/saved/envs) — ALL OK
- **E2E vscode stub** (`kangpos-test/e2e.js`, `stub/node_modules/vscode/index.js`):
  - Aktivasi: 20 commands ✓
  - Send request nyata → response 200 ✓
  - Save ke collection (input nama → pilih collection → Collection Root) → pesan `saved` + muncul
    `request:Get Post` di tree ✓
  - Activity groups `Today(1)` ✓
  - Re-run → 200 lagi ✓
  - import-curl flow + env panel render ✓

### 7. Debugging E2E (masalah yang pernah muncul)
- Gejala: setelah kirim `save`, pesan `saved` tidak muncul & tree kosong
- Root cause: **race condition di test harness**, bukan bug aplikasi — handler terdaftar sebagai
  `msg => void this.onMessage(...)` sehingga `await h(m)` tidak menunggu promise saveAs selesai
- Solusi: harness diberi helper `waitFor(predicate, timeout, label)` polling per 50ms
- Sampingan: ada percobaan instrumentasi via `dbgsrc` di /tmp yang gagal (esbuild tidak bisa resolve
  `https-proxy-agent` dari luar project) → solusi: backup `src`, instrument di tempat, rebuild, restore;
  saat restore `src` sempat terhapus lalu di-copy kembali dari backup — typecheck final PASS

### 8. Packaging
- vsce resmi gagal di Node 14 (undici butuh Node baru) → dengan Node 20: `npm run vsix`
  (`npm run package && npx --yes @vscode/vsce package --no-dependencies --allow-missing-repository`)
- Perbaikan: `vscode-vsce-2.15.0.tgz` sampah ikut ke-pack → dihapus, package ulang
- Hasil akhir: `kangpos-1.0.0.vsix` — 9 file, 139.83 KB, bersih

## Hasil akhir
- `kangpos-1.0.0.vsix` siap install: `code --install-extension kangpos-1.0.0.vsix`
- Dev: buka project → `npm install` → F5
- CLI global: `npm link` → `kangpos-cli -c collection.json`
- Typecheck `npx tsc -p . --noEmit` PASS; dist final: `dist/extension.js` (205 KB) + `dist/cli.js` (78.9 KB)

## Artefak test (di luar project, bisa dihapus)
`/var/folders/l9/4xxr6w5s1nzgkmwnzrpn70jr0000gn/T/opencode/kangpos-test/` —
`collection.json`, `report.json`, `shim.js`, `e2e.js`, `stub/`, `src-backup/`, `extension-dbg.js`, `kangpos.vsix`
