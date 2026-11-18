# Kangpos — How To Use

> English version: [HowToUse-EN.md](HowToUse-EN.md)

Panduan lengkap menggunakan extension **Kangpos** (Lightweight REST API Client for VS Code).

---

## 1. Install

### Opsi A — Install VSIX (rekomendasi)
```bash
code --install-extension kangpos-1.0.0.vsix
```
atau lewat VS Code UI: `Extensions` → ikon `...` (Views and More Actions) → **Install from VSIX...** → pilih file `kangpos-1.0.0.vsix`.

### Opsi B — Mode Development
```bash
nvm use 20
npm install
```
Buka folder project di VS Code → tekan **F5** → jendela **Extension Development Host** terbuka.

### Opsi C — CLI global
```bash
npm link          # dari folder project
kangpos-cli --help
```

> Build/packaging wajib **Node.js 20** (`nvm use 20`).

---

## 2. Memulai

Setelah aktif, di **Activity Bar** kiri muncul icon Kangpos dengan 2 panel:
- **Collections** — daftar koleksi, folder, dan request
- **Activity** — riwayat request yang pernah dikirim

### Buat Collection & Request
1. Klik `+` di header panel Collections (atau Command Palette `Kangpos: New Collection`).
2. Klik `+` lagi untuk **New Request** → editor request terbuka.

### Editor Request
- **Method** (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) + **URL** di bar atas, tombol **Send** (atau `Cmd/Ctrl+Enter`).
- Tab: **Params · Body · Auth · Headers · Tests · Docs**
  - **Params**: query string otomatis tersambung ke URL (`?key=value`).
  - **Body**: `none · json · form · formdata · xml · raw · binary · graphql`.
  - **Auth**: `none · basic · bearer · apikey · oauth2 (client_credentials & password)`.
  - **Headers**: key/value bebas.
  - **Tests**: builder assert klik-tambah.
  - **Docs**: catatan markdown bebas per request.
- Response panel di bawah: **Body / Headers / Tests**, ada filter **JSONPath** dan highlight JSON/XML, serta tombol Save Response.

---

## 3. Variabel & Environment

### Sintaks
Gunakan `{{nama}}` di URL, header, body, dll:
```
https://{{host}}/posts/{{postId}}
```

### Dynamic variables bawaan
| Variabel | Isi |
|---|---|
| `{{$guid}}` | UUID v4 |
| `{{$randomUuid}}` | UUID acak |
| `{{$timestamp}}` | Unix epoch detik |
| `{{$timestampMs}}` | epoch milidetik |
| `{{$randomInt}}` | angka acak 1–1000 |
| `{{$randomHex8}}` | hex acak 8 karakter |

### Mengelola environment
- Command `Kangpos: Manage Environments` → panel environment: buat env, tambah variable, **Set Active** (centang), hapus.
- Urutan resolusi variabel: **collection vars → env aktif → global**.
- Set variabel collection: langsung edit file data collection (field `envVars` pada collection).

---

## 4. Testing (Assertions)

### Builder
Tab **Tests** → pilih type + action, isikan value/path → **Add**:

| Type | Action yang tersedia |
|---|---|
| `status` | equals · not_equals · less · greater · less_equals · greater_equals |
| `header` | exists · not_exists · equals · contains · not_contains · starts_with |
| `body` (JSONPath) | exists · not_exists · equals · not_equals · contains · not_contains · starts_with · length_equals · length_greater · length_less · greater · less |
| `text` (body mentah) | contains · not_contains · equals · starts_with · ends_with |
| `time` | less · greater · less_equals (dalam ms) |
| `env` | set — simpan nilai dari response (JSONPath) ke variabel env, untuk request chaining |

### Custom script
Tab **Tests** juga bisa berisi script JS. API yang tersedia:
```js
// Environment
kangpos.setEnvVar('postId', response.json.id)   // request chaining!
kangpos.getEnvVar('postId')

// Variable lokal run ini
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
Nilai dari response bisa dipakai request berikutnya:
```js
// Request 1: POST /posts
kangpos.setEnvVar('newId', response.json.id)
```
```
// Request 2: GET /posts/{{newId}}
```
Variabel env yang diset via script otomatis tersimpan (pesan `env` dikirim ke panel).

---

## 5. Run Collection

Klik icon **▶ Run** pada collection (atau Command `Kangpos: Run Collection`):
- Semua request dieksekusi berurutan (termasuk dalam folder).
- Setelah selesai, **laporan** terbuka: pass/fail per request + total waktu.
- Env aktif dipakai untuk semua request.

---

## 6. Import / Export

### Import
Command `Kangpos: Import` → pilih sumber:
- **Postman Collection v2.1** (`.json`) — folder nested, body json, bearer ikut terbawa
- **Kangpos JSON** — hasil export Kangpos
- **cURL** — atau langsung `Kangpos: Import cURL` lalu paste perintah curl

### Export
Klik kanan collection → **Export Collection** → pilih lokasi file `.json`.

---

## 7. Codegen & Share

- Klik kanan request → **Copy as cURL** — cURL command ke clipboard.
- Klik kanan request → **Generate Code** — pilih bahasa: `curl · fetch · axios · python · go · php · csharp` → hasil ke clipboard.

---

## 8. Activity (Riwayat)

- Setiap request yang dikirim dicatat otomatis (grup: Today / Yesterday / 7 days / Older).
- Klik entri → request terbuka kembali di editor.
- Command `Kangpos: Clear Activity` untuk membersihkan.
- Batas riwayat diatur setting `kangpos.maxActivity` (default 100).

---

## 9. Keyboard & Shortcut

| Shortcut | Aksi |
|---|---|
| `Cmd/Ctrl + Alt + R` | Re-run request terakhir |
| `Cmd/Ctrl + Enter` (di webview) | Send request |

Klik kanan item di tree juga tersedia: New Request, New Folder, Rename, Duplicate, Delete, Run, Export, Copy as cURL, Generate Code.

---

## 10. Settings

| Setting | Default | Keterangan |
|---|---|---|
| `kangpos.theme` | `blue` | Warna aksen UI (`blue/red/green/purple/orange/pink/teal/dark/light`) |
| `kangpos.requestTimeout` | `0` | Timeout request ms (0 = tanpa timeout) |
| `kangpos.followRedirects` | `true` | Ikuti redirect otomatis |
| `kangpos.maxRedirects` | `10` | Maks redirect |
| `kangpos.verifySsl` | `true` | Verifikasi sertifikat SSL |
| `kangpos.proxy` | `""` | Proxy, contoh `http://127.0.0.1:8080` |
| `kangpos.workspaceStorage` | `false` | Data disimpan di `.kangpos/` workspace (bisa di-backup ke git). Reload window setelah diubah |
| `kangpos.saveActivity` | `true` | Catat riwayat request |
| `kangpos.maxActivity` | `100` | Maks entri riwayat |
| `kangpos.reuseTab` | `true` | Buka request di tab yang sama |

**Lokasi data** (default): VS Code global storage per-user.

---

## 11. CLI — kangpos-cli

Jalankan collection dari terminal (cocok untuk CI):

```bash
kangpos-cli -c collection.json
kangpos-cli -c collection.json -e environments.json -n "Dev" -o report.json
kangpos-cli -c collection.json -d 500        # delay 500ms antar request
kangpos-cli -c collection.json -p 4          # 4 request paralel
kangpos-cli -c collection.json --insecure    # skip SSL verify
```

| Flag | Fungsi |
|---|---|
| `-c, --collection <file>` | File collection (wajib) |
| `-e, --environment <file>` | File environment (`.kangpos/environments.json` atau JSON variables) |
| `-n, --env-name <name>` | Pilih environment by name jika file berisi banyak env |
| `-d, --delay <ms>` | Delay antar request |
| `-o, --output <file>` | Tulis laporan JSON |
| `-p, --parallel <n>` | Jalankan n request paralel |
| `--insecure` | Nonaktifkan verifikasi SSL |
| `-h, --help` | Bantuan |

Output terminal berwarna (pass ✔ / fail ✘), exit code **non-zero** jika ada yang gagal.

---

## 12. Tips

- **Verifikasi cepat API publik**: buat request `GET https://jsonplaceholder.typicode.com/posts/1` → Send → status 200.
- Gunakan `{{var}}` + env dev/staging/prod terpisah agar collection bisa dipakai lintas server.
- Set `kangpos.workspaceStorage: true` jika data collection ingin ikut di-commit ke repo.
- Test pertama yang disarankan: `status equals 200` + `body contains id`.
