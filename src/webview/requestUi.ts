import { KangposRequest } from '../types';

export interface RequestUiMeta {
  requestId?: string;
  collectionId?: string;
  collectionName?: string;
  saved: boolean;
  envs: { id: string; name: string; type: string }[];
  activeEnvId: string;
}

export interface RequestUiInit {
  model: KangposRequest;
  meta: RequestUiMeta;
  accent: string;
  autoSend: boolean;
}

const THEME_COLORS: Record<string, string> = {
  blue: '#29b6f6',
  red: '#ef5350',
  green: '#66bb6a',
  purple: '#ab47bc',
  orange: '#ff7043',
  pink: '#ec407a',
  teal: '#26a69a',
  dark: '#90a4ae',
  light: '#1976d2'
};

export function accentColor(theme: string): string {
  return THEME_COLORS[theme] || THEME_COLORS.blue;
}

export function getRequestHtml(init: RequestUiInit): string {
  const json = JSON.stringify(init).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
:root { --accent: ${init.accent}; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 10px 14px 40px;
  color: var(--vscode-editor-foreground, #cccccc);
  background: var(--vscode-editor-background, #1e1e1e);
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 13px;
}
input, select, textarea {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #cccccc);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 2px;
  padding: 4px 8px;
  font-size: 12px;
  outline: none;
}
input:focus, select:focus, textarea:focus { border-color: var(--accent); }
textarea { font-family: var(--vscode-editor-font-family, monospace); width: 100%; resize: vertical; line-height: 1.5; }
button {
  background: var(--vscode-button-secondaryBackground, #3a3d41);
  color: var(--vscode-button-secondaryForeground, #ffffff);
  border: none;
  border-radius: 3px;
  height: 24px;
  padding: 0 10px;
  cursor: pointer;
  font-size: 12px;
}
button:hover { background: var(--vscode-button-secondaryHoverBackground, #45494e); }
button.primary { background: var(--accent); color: #fff; }
button.primary:hover { filter: brightness(1.1); background: var(--accent); }
button:disabled { opacity: 0.6; cursor: default; }
.kp-reqbar { display: flex; gap: 6px; margin-bottom: 10px; }
.kp-reqbar #urlInput { flex: 1; height: 28px; }
#methodSelect {
  width: 108px; height: 28px; font-weight: 700; font-size: 12px; color: #fff; letter-spacing: 0.4px;
  border: none; border-radius: 3px; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  padding: 0 24px 0 14px;
  background-color: #2980b9;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath fill='%23ffffff' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 10px 6px;
}
#sendBtn { height: 28px; min-width: 86px; font-weight: 600; font-size: 13px; padding: 0 20px; }
.kp-toolbar { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; }
.kp-toolbar select { height: 24px; }
#actionSelect { max-width: 140px; }
.iconbtn { width: 24px; height: 24px; padding: 0; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 4px; cursor: pointer; color: var(--vscode-editor-foreground, #ccc); opacity: 0.8; }
.iconbtn:hover { background: rgba(128,128,128,0.22); opacity: 1; }
.iconbtn svg { width: 15px; height: 15px; }
.kp-spacer { flex: 1; }
.kp-tabs { display: flex; gap: 18px; border-bottom: 1px solid rgba(128,128,128,0.25); margin-bottom: 12px; }
.kp-tab { padding: 7px 1px; cursor: pointer; font-size: 12.5px; color: var(--vscode-descriptionForeground, #999); border-bottom: 2px solid transparent; user-select: none; }
.kp-tab:hover { color: var(--vscode-editor-foreground); }
.kp-tab.active { border-bottom-color: var(--accent); color: var(--vscode-editor-foreground); }
.kp-count { font-size: 10px; color: var(--vscode-descriptionForeground, #999); margin-left: 3px; vertical-align: super; }
.kp-tabpanel { margin-bottom: 12px; }
.kp-sectitle { font-size: 13px; margin: 2px 0 6px; color: var(--vscode-editor-foreground, #ddd); }
.ptable { max-width: 780px; }
.prow { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(128,128,128,0.16); padding: 2px 0; }
.prow input.row-name { flex: 2; background: transparent; border: none; padding: 4px 6px; height: 24px; }
.prow input.row-value { flex: 3; background: transparent; border: none; padding: 4px 6px; height: 24px; color: var(--vscode-descriptionForeground, #b4b4b4); }
.prow input:focus { border: none; }
.row-check { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; flex: none; }
.row-check.ghost { visibility: hidden; }
.prow.off input.row-name, .prow.off input.row-value { opacity: 0.45; }
.hdr-ac { position: fixed; z-index: 500; min-width: 250px; max-width: 360px; background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--vscode-editorWidget-border, #454545); border-radius: 3px; box-shadow: 0 2px 10px rgba(0,0,0,0.45); padding: 2px; max-height: 230px; overflow-y: auto; }
.hdr-ac-item { padding: 3px 10px; font-size: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; border-radius: 2px; }
.hdr-ac-item .hn { color: var(--vscode-editor-foreground, #ccc); white-space: nowrap; }
.hdr-ac-item .hd { color: var(--vscode-descriptionForeground, #888); font-size: 11px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hdr-ac-item.active { background: var(--vscode-list-activeSelectionBackground, #094771); }
.hdr-ac-item.active .hn { color: var(--vscode-list-activeSelectionForeground, #fff); }
.hdr-ac-item.active .hd { color: var(--vscode-list-activeSelectionForeground, #fff); opacity: 0.7; }
.row-del { background: transparent; color: var(--vscode-descriptionForeground, #999); font-size: 14px; padding: 0 6px; width: 22px; height: 22px; opacity: 0; flex: none; }
.prow:hover .row-del { opacity: 1; }
.row-del:hover { color: #e74c3c; background: transparent; }
.row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.row input.row-name, .row input.row-value { background: var(--vscode-input-background, #3c3c3c); border: 1px solid var(--vscode-input-border, #3c3c3c); }
.kp-hint { color: var(--vscode-descriptionForeground, #888); font-size: 12px; margin: 6px 0; }
.kp-bodytabs { display: flex; flex-wrap: wrap; gap: 18px; border-bottom: 1px solid rgba(128,128,128,0.18); margin: 2px 0 12px; }
.kp-bodytab { padding: 6px 1px; font-size: 12.5px; color: var(--vscode-descriptionForeground, #999); cursor: pointer; border-bottom: 2px solid transparent; user-select: none; }
.kp-bodytab:hover { color: var(--vscode-editor-foreground, #ccc); }
.kp-bodytab.active { color: var(--vscode-editor-foreground, #fff); border-bottom-color: var(--accent); }
.code-editor { display: flex; border: 1px solid rgba(128,128,128,0.28); border-radius: 4px; height: 340px; overflow: hidden; background: var(--vscode-input-background, #2b2b2b); margin: 6px 0 4px; }
.code-gutter { flex: none; padding: 8px 8px 8px 10px; text-align: right; color: #636d83; font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 20px; white-space: pre; overflow: hidden; user-select: none; }
.code-main { position: relative; flex: 1; min-width: 0; }
.code-highlight, #bodyRaw { position: absolute; top: 0; left: 0; width: 100%; height: 100%; margin: 0; border: 0; padding: 8px 12px 8px 8px; font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 20px; white-space: pre; tab-size: 2; border-radius: 0; }
.code-highlight { overflow: auto; pointer-events: none; color: var(--vscode-editor-foreground, #ccc); }
.code-highlight::-webkit-scrollbar { display: none; }
#bodyRaw { overflow: auto; resize: none; background: transparent; color: transparent; caret-color: var(--vscode-editor-foreground, #d4d4d4); }
#bodyRaw:focus { border: 0; outline: none; }
.code-highlight .tok-key { color: #e5a06b; }
.code-highlight .tok-str { color: #98c379; }
.code-highlight .tok-num { color: #c678dd; }
.code-highlight .tok-bool, .code-highlight .tok-null { color: #c678dd; }
.code-highlight .tok-tag { color: #98c379; }
.code-highlight .tok-attr { color: #e5a06b; }
.code-highlight .tok-comment { color: #7f848e; }
.kp-bodybar { display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin: 6px 0 2px; min-height: 22px; }
.kp-bodybar button { height: 22px; font-size: 11px; padding: 0 10px; }
.kp-inline-err { color: #e74c3c; font-size: 11px; }
.kp-btnrow { margin-top: 8px; display: flex; gap: 8px; }
.kp-label { font-size: 11px; color: var(--vscode-descriptionForeground, #999); margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 0.4px; }
.kp-grid { display: grid; grid-template-columns: 130px 1fr; gap: 6px; align-items: center; max-width: 720px; }
.kp-error { background: #5f2120; border: 1px solid #e74c3c; color: #f5c6cb; padding: 10px 14px; border-radius: 3px; margin: 10px 0; white-space: pre-wrap; font-size: 12px; }
.kp-resp { border-top: 1px solid rgba(128,128,128,0.25); margin-top: 14px; padding-top: 8px; }
.kp-resp-meta { display: flex; gap: 4px 16px; align-items: baseline; margin-bottom: 6px; font-size: 12px; flex-wrap: wrap; }
.rlabel { color: var(--vscode-descriptionForeground, #999); }
.rval-ok { color: #27ae60; font-weight: 600; }
.rval-warn { color: #f39c12; font-weight: 600; }
.rval-err { color: #e74c3c; font-weight: 600; }
.rval-size { color: var(--accent, #29b6f6); }
.rval-time { color: #f39c12; }
.kp-resp-tabs { display: flex; gap: 16px; border-bottom: 1px solid rgba(128,128,128,0.25); margin-bottom: 4px; }
.kp-rtab { padding: 6px 1px; cursor: pointer; font-size: 12.5px; color: var(--vscode-descriptionForeground, #999); border-bottom: 2px solid transparent; user-select: none; }
.kp-rtab:hover { color: var(--vscode-editor-foreground); }
.kp-rtab.active { color: var(--vscode-editor-foreground); border-bottom-color: var(--accent); }
.resp-code { padding: 10px 0 4px; font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; line-height: 1.55; overflow: auto; max-height: 48vh; }
.cl { display: flex; }
.cl .ln { flex: none; width: 42px; padding-right: 16px; text-align: right; color: #636d83; user-select: none; }
.cl .lc { flex: 1; min-width: 0; white-space: pre-wrap; word-break: break-word; }
.resp-filterrow { display: flex; justify-content: flex-end; padding-top: 6px; }
.resp-filterrow input { width: 220px; border-radius: 12px; padding: 3px 12px; font-size: 12px; height: 22px; }
.tok-key { color: #e06c75; }
.tok-str { color: #d19a66; }
.tok-num { color: #c8ccd4; }
.tok-bool { color: #569cd6; }
.tok-null { color: #569cd6; }
.tok-tag { color: #569cd6; }
.tok-attr { color: #9cdcfe; }
.tok-comment { color: #6a9955; }
.tok-plain { color: var(--vscode-editor-foreground, #ccc); }
.muted { color: var(--vscode-descriptionForeground, #888); }
.resp-headers { width: 100%; border-collapse: collapse; font-size: 12px; max-width: 900px; }
.resp-headers td { padding: 3px 10px; border-bottom: 1px solid rgba(128,128,128,0.15); vertical-align: top; }
.resp-headers td:first-child { color: var(--vscode-descriptionForeground, #999); white-space: nowrap; width: 220px; }
.test-line { display: flex; gap: 8px; align-items: baseline; padding: 4px 2px; font-size: 12px; border-bottom: 1px solid rgba(128,128,128,0.12); }
.test-icon { font-weight: 700; }
.test-pass { color: #27ae60; }
.test-fail { color: #e74c3c; }
.test-name { font-weight: 600; }
.test-msg { color: var(--vscode-descriptionForeground, #999); }
.resp-img { max-width: 100%; max-height: 50vh; border-radius: 3px; }
select.kp-select-sm { padding: 3px 4px; }
.kp-script-box { margin-top: 14px; border-top: 1px dashed var(--vscode-panel-border, #444); padding-top: 10px; }
.kp-chk { display: flex; gap: 6px; align-items: center; font-size: 12px; cursor: pointer; }
</style>
</head>
<body>
<div id="app"></div>
<script>
var INIT = ${json};
var vscode = acquireVsCodeApi();
var model = INIT.model;
var meta = INIT.meta;
var activeTab = 'params';
var respTab = 'body';
var response = null;
var testsResult = null;
var sending = false;
var filterText = '';
var errorText = '';
var paramRows = [];
var METHOD_COLORS = { GET: '#27ae60', POST: '#f39c12', PUT: '#2980b9', PATCH: '#8e44ad', DELETE: '#e74c3c', HEAD: '#7f8c8d', OPTIONS: '#16a085' };
var METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
var SAVE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>';

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function safeDecode(s) { try { return decodeURIComponent(String(s).replace(/\\+/g, ' ')); } catch (e) { return s; } }
function escPlain(l) { return esc(l); }

function ensureModel() {
  if (!model.body) model.body = { type: 'none', raw: '', form: [], formdata: [], graphql: { query: '', variables: '' }, binaryName: '', binaryData: '', binaryPath: '' };
  if (!model.body.form) model.body.form = [];
  if (!model.body.formdata) model.body.formdata = [];
  if (!model.body.graphql) model.body.graphql = { query: '', variables: '' };
  if (!model.headers) model.headers = [];
  if (!model.auth) model.auth = { type: 'none', basic: { username: '', password: '' }, bearer: { token: '' }, apikey: { key: '', value: '', in: 'header' }, oauth2: { grantType: 'client_credentials', tokenUrl: '', clientId: '', clientSecret: '', scope: '', username: '', password: '', accessToken: '', refreshToken: '' } };
  if (!model.auth.basic) model.auth.basic = { username: '', password: '' };
  if (!model.auth.bearer) model.auth.bearer = { token: '' };
  if (!model.auth.apikey) model.auth.apikey = { key: '', value: '', in: 'header' };
  if (!model.auth.oauth2) model.auth.oauth2 = { grantType: 'client_credentials', tokenUrl: '', clientId: '', clientSecret: '', scope: '', username: '', password: '', accessToken: '', refreshToken: '' };
  if (!model.tests) model.tests = [];
  if (!model.script) model.script = '';
  if (!model.docs) model.docs = '';
  if (!model.name) model.name = '';
  if (!model.method) model.method = 'GET';
  if (!model.url) model.url = '';
}

function parseUrlQuery(url) {
  var out = [];
  var qIdx = url.indexOf('?');
  if (qIdx === -1) return out;
  var query = url.slice(qIdx + 1);
  var hashIdx = query.indexOf('#');
  if (hashIdx > -1) query = query.slice(0, hashIdx);
  if (!query) return out;
  query.split('&').forEach(function (pair) {
    if (pair === '') return;
    var eq = pair.indexOf('=');
    var name = eq > -1 ? pair.slice(0, eq) : pair;
    var value = eq > -1 ? pair.slice(eq + 1) : '';
    out.push({ name: safeDecode(name), value: safeDecode(value), disabled: false });
  });
  return out;
}

function serializeUrl(base, rows) {
  var hashIdx = base.indexOf('#');
  var basePart = hashIdx > -1 ? base.slice(0, hashIdx) : base;
  var hash = hashIdx > -1 ? base.slice(hashIdx) : '';
  var qIdx = basePart.indexOf('?');
  if (qIdx > -1) basePart = basePart.slice(0, qIdx);
  var pairs = [];
  rows.forEach(function (p) {
    if (p.disabled) return;
    if (p.name === '' && p.value === '') return;
    pairs.push(encodeURIComponent(p.name) + '=' + encodeURIComponent(p.value));
  });
  return basePart + (pairs.length ? '?' + pairs.join('&') : '') + hash;
}

function activeHeaders() {
  return (model.headers || []).filter(function (h) { return !h.disabled && h.name; });
}

function buildSkeleton() {
  $('#app').innerHTML =
    '<div class="kp-reqbar">' +
      '<select id="methodSelect"></select>' +
      '<input id="urlInput" placeholder="Enter request URL e.g. https://api.example.com/v1/users">' +
      '<button id="sendBtn" class="primary">Send</button>' +
    '</div>' +
    '<div class="kp-toolbar">' +
      '<select id="envSelect" title="Environment"></select>' +
      '<span class="kp-spacer"></span>' +
      '<button id="saveIconBtn" class="iconbtn" title="Save (Ctrl+S)">' + SAVE_ICON + '</button>' +
      '<select id="actionSelect" title="Actions">' +
        '<option value="">Actions</option>' +
        '<option value="curl">Copy as cURL</option>' +
        '<option value="codegen">Generate Code</option>' +
        '<option value="save-resp">Save Response</option>' +
      '</select>' +
    '</div>' +
    '<div class="kp-tabs" id="tabBar"></div>' +
    '<div class="kp-tabpanel" id="tabPanel"></div>' +
    '<div id="errorBox" class="kp-error" style="display:none"></div>' +
    '<div id="respSection" class="kp-resp" style="display:none"></div>';
}

function bindSkeleton() {
  $('#urlInput').addEventListener('input', function (e) {
    model.url = e.target.value;
    if (activeTab === 'params') { paramRows = parseUrlQuery(model.url); renderTabPanel(); }
    updateTabCounts();
  });
  $('#methodSelect').addEventListener('change', function (e) {
    model.method = e.target.value;
    e.target.style.backgroundColor = METHOD_COLORS[model.method] || '#7f8c8d';
    if (model.method === 'POST' && !(model.headers || []).some(function (h) { return (h.name || '').toLowerCase() === 'content-type'; })) {
      model.headers.push({ name: 'Content-Type', value: 'application/json', disabled: false });
      if (activeTab === 'headers') renderTabPanel();
      updateTabCounts();
    }
  });
  $('#sendBtn').addEventListener('click', function () { send(); });
  $('#saveIconBtn').addEventListener('click', function () { save(); });
  $('#actionSelect').addEventListener('change', function (e) {
    var action = e.target.value;
    e.target.value = '';
    if (action === 'curl') vscode.postMessage({ command: 'copy-curl', model: model });
    else if (action === 'codegen') vscode.postMessage({ command: 'codegen', model: model });
    else if (action === 'save-resp') {
      if (!response) { showError('No response to save. Send the request first.'); return; }
      vscode.postMessage({ command: 'save-response', base64: response.base64, name: model.name || 'response' });
    }
  });
  $('#envSelect').addEventListener('change', function (e) {
    if (e.target.value === '__manage') {
      e.target.value = meta.activeEnvId;
      vscode.postMessage({ command: 'manage-envs' });
      return;
    }
    vscode.postMessage({ command: 'set-env', envId: e.target.value });
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      save();
    }
  });
}

function save() {
  if (meta.saved) vscode.postMessage({ command: 'save', model: model });
  else vscode.postMessage({ command: 'save-as', model: model });
}

function renderMethod() {
  var sel = $('#methodSelect');
  sel.innerHTML = METHODS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
  sel.value = METHODS.indexOf(model.method) > -1 ? model.method : 'GET';
  sel.style.backgroundColor = METHOD_COLORS[sel.value] || '#7f8c8d';
}

function renderEnvSelect() {
  var sel = $('#envSelect');
  var html = '';
  meta.envs.forEach(function (env) {
    var label = env.type === 'g' ? 'Global' : env.name;
    html += '<option value="' + esc(env.id) + '">' + esc(label) + '</option>';
  });
  html += '<option value="__manage">Manage Environments</option>';
  sel.innerHTML = html;
  sel.value = meta.activeEnvId;
  if (sel.value !== meta.activeEnvId) sel.value = 'g';
}

function tabDefs() {
  return [
    ['params', 'Params', 0],
    ['auth', 'Auth', 0],
    ['headers', 'Headers', activeHeaders().length],
    ['body', 'Body', 0],
    ['tests', 'Tests', (model.tests || []).filter(function (t) { return !t.disabled; }).length],
    ['docs', 'Docs', 0]
  ];
}

function updateTabCounts() {
  var bar = $('#tabBar');
  if (!bar) return;
  bar.innerHTML = tabDefs().map(function (t) {
    var count = t[2] > 0 ? '<span class="kp-count">' + t[2] + '</span>' : '';
    return '<div class="kp-tab' + (activeTab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + count + '</div>';
  }).join('');
  $all('.kp-tab').forEach(function (el) {
    el.addEventListener('click', function () {
      activeTab = el.getAttribute('data-tab');
      if (activeTab === 'params') paramRows = parseUrlQuery(model.url);
      updateTabCounts();
      renderTabPanel();
    });
  });
}

function rowHtml(prefix, i, nameValue, valueHtml, checked, phName) {
  return '<div class="prow' + (checked === false ? ' off' : '') + '" data-i="' + i + '">' +
    (checked === null ? '' : '<input type="checkbox" class="row-check" data-act="check"' + (checked ? ' checked' : '') + '>') +
    '<input class="row-name" data-act="name" value="' + esc(nameValue) + '" placeholder="' + (phName || 'Name') + '">' +
    valueHtml +
    '<button class="row-del" data-act="del" title="Remove">&times;</button>' +
  '</div>';
}

function tplRowHtml(withCheck, phName, phValue, valueHtml) {
  return '<div class="prow tpl">' +
    (withCheck ? '<input type="checkbox" class="row-check ghost" tabindex="-1">' : '') +
    '<input class="row-name" data-tpl="name" placeholder="' + phName + '">' +
    valueHtml +
    '<span class="row-del"></span>' +
  '</div>';
}

function focusAdded(field, idx) {
  var row = $('#tabPanel .prow[data-i="' + idx + '"]');
  if (row) {
    var el = row.querySelector('[data-act="' + field + '"]');
    if (el) { el.focus(); setCaretEnd(el); }
  }
}

function setCaretEnd(inp) {
  try {
    var len = inp.value.length;
    inp.setSelectionRange(len, len);
  } catch (e) {}
}

var HEADER_DEFS = [
  ['Accept', 'Content types the client accepts'],
  ['Accept-Encoding', 'Compression encodings'],
  ['Accept-Language', 'Preferred languages'],
  ['Authorization', 'Credentials (Bearer, Basic)'],
  ['Cache-Control', 'Caching directives'],
  ['Connection', 'Connection control'],
  ['Content-Disposition', 'Filename / multipart info'],
  ['Content-Length', 'Body size in bytes'],
  ['Content-Type', 'Media type of the body'],
  ['Cookie', 'Cookies sent to the server'],
  ['Date', 'Request / response date'],
  ['ETag', 'Entity tag'],
  ['Expires', 'Expiration date'],
  ['Host', 'Target host and port'],
  ['If-Modified-Since', 'Conditional GET'],
  ['If-None-Match', 'Conditional ETag'],
  ['Location', 'Redirect target'],
  ['Origin', 'Origin of the request'],
  ['Pragma', 'Legacy cache directive'],
  ['Referer', 'Referrer URL'],
  ['Retry-After', 'Seconds to retry'],
  ['Server', 'Server software'],
  ['Set-Cookie', 'Cookie from the server'],
  ['User-Agent', 'Client application'],
  ['WWW-Authenticate', 'Auth challenge'],
  ['X-API-Key', 'API key'],
  ['X-Auth-Token', 'Auth token'],
  ['X-Correlation-Id', 'Correlation id'],
  ['X-CSRF-Token', 'CSRF token'],
  ['X-Forwarded-For', 'Original client IP'],
  ['X-Forwarded-Proto', 'Original protocol'],
  ['X-HTTP-Method-Override', 'Method override'],
  ['X-Request-Id', 'Request id'],
  ['X-Requested-With', 'Ajax marker'],
  ['Access-Control-Allow-Origin', 'CORS: allowed origin'],
  ['Access-Control-Allow-Headers', 'CORS: allowed headers'],
  ['Access-Control-Allow-Methods', 'CORS: allowed methods'],
  ['Access-Control-Max-Age', 'CORS: max cache age']
];

var acEl = null;
var acState = null;

function closeAc() {
  if (acEl) { acEl.remove(); acEl = null; }
  acState = null;
}

function openAc(input, apply) {
  var q = String(input.value || '').trim().toLowerCase();
  var starts = [], includes = [];
  HEADER_DEFS.forEach(function (d) {
    var n = d[0].toLowerCase();
    if (q && n.indexOf(q) === 0) starts.push(d);
    else if (q && n.indexOf(q) > -1) includes.push(d);
  });
  var items = q ? starts.concat(includes) : HEADER_DEFS.slice(0, 8);
  items = items.slice(0, 8);
  if (items.length === 0) { closeAc(); return; }
  acState = { input: input, apply: apply, items: items, sel: 0 };
  if (!acEl || !document.body.contains(acEl)) {
    if (acEl) acEl.remove();
    acEl = document.createElement('div');
    acEl.className = 'hdr-ac';
    document.body.appendChild(acEl);
  }
  acEl.innerHTML = items.map(function (d, i) {
    return '<div class="hdr-ac-item' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' +
      '<span class="hn">' + esc(d[0]) + '</span><span class="hd">' + esc(d[1]) + '</span></div>';
  }).join('');
  var r = input.getBoundingClientRect();
  var left = r.left;
  if (left + 320 > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 328);
  acEl.style.left = left + 'px';
  acEl.style.top = (r.bottom + 2) + 'px';
  Array.prototype.slice.call(acEl.querySelectorAll('.hdr-ac-item')).forEach(function (el) {
    el.addEventListener('mousedown', function (e) {
      e.preventDefault();
      chooseAc(parseInt(el.getAttribute('data-i'), 10));
    });
  });
}

function chooseAc(i) {
  if (!acState) { closeAc(); return; }
  var d = acState.items[i];
  var apply = acState.apply;
  if (d && apply) apply(d[0]);
  closeAc();
}

function moveAc(dir) {
  if (!acState || !acEl) return;
  acState.sel = (acState.sel + dir + acState.items.length) % acState.items.length;
  Array.prototype.slice.call(acEl.querySelectorAll('.hdr-ac-item')).forEach(function (el, i) {
    el.classList.toggle('active', i === acState.sel);
    if (i === acState.sel && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  });
}

function acKeydown(e) {
  if (!acState || !acEl) return false;
  if (e.key === 'ArrowDown') { e.preventDefault(); moveAc(1); return true; }
  if (e.key === 'ArrowUp') { e.preventDefault(); moveAc(-1); return true; }
  if (e.key === 'Enter') { e.preventDefault(); chooseAc(acState.sel); return true; }
  if (e.key === 'Escape') { e.preventDefault(); closeAc(); return true; }
  return false;
}

function attachHeaderAc(input, idx) {
  function apply(name) {
    model.headers[idx].name = name;
    input.value = name;
    setCaretEnd(input);
    updateTabCounts();
  }
  input.addEventListener('focus', function () { openAc(input, apply); });
  input.addEventListener('input', function () {
    model.headers[idx].name = input.value;
    updateTabCounts();
    openAc(input, apply);
  });
  input.addEventListener('keydown', function (e) {
    if (acKeydown(e)) e.stopPropagation();
  });
  input.addEventListener('blur', function () { setTimeout(closeAc, 130); });
}

function attachHeaderAcTpl(input) {
  function tplApply(name) {
    model.headers.push({ name: name, value: '', disabled: false });
    updateTabCounts();
    renderTabPanel();
    focusAdded('name', model.headers.length - 1);
  }
  input.addEventListener('focus', function () { openAc(input, tplApply); });
  input.addEventListener('keydown', function (e) {
    if (acKeydown(e)) e.stopPropagation();
  });
  input.addEventListener('blur', function () { setTimeout(closeAc, 130); });
}

function renderTabPanel() {
  var panel = $('#tabPanel');
  if (activeTab === 'params') {
    var html = '<div class="kp-sectitle">Query Parameters</div><div class="ptable">';
    html += paramRows.map(function (p, i) {
      return rowHtml('param', i, p.name, '<input class="row-value" data-act="value" value="' + esc(p.value) + '" placeholder="Value">', !p.disabled, 'name');
    }).join('');
    html += tplRowHtml(true, 'parameter', 'value', '<input class="row-value" data-tpl="value" placeholder="value">');
    html += '</div>';
    panel.innerHTML = html;
    $all('#tabPanel .prow[data-i]').forEach(function (row) {
      var i = parseInt(row.getAttribute('data-i'), 10);
      row.querySelector('[data-act="check"]').addEventListener('change', function (e) {
        paramRows[i].disabled = !e.target.checked;
        row.classList.toggle('off', !e.target.checked);
        model.url = serializeUrl(model.url, paramRows);
        $('#urlInput').value = model.url;
      });
      row.querySelectorAll('[data-act="name"], [data-act="value"]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          paramRows[i].name = row.querySelector('[data-act="name"]').value;
          paramRows[i].value = row.querySelector('[data-act="value"]').value;
          model.url = serializeUrl(model.url, paramRows);
          $('#urlInput').value = model.url;
        });
      });
      row.querySelector('[data-act="del"]').addEventListener('click', function () {
        paramRows.splice(i, 1);
        model.url = serializeUrl(model.url, paramRows);
        $('#urlInput').value = model.url;
        renderTabPanel();
      });
    });
    var tpl = $('#tabPanel .prow.tpl');
    if (tpl) {
      var tplName = tpl.querySelector('[data-tpl="name"]');
      var tplValue = tpl.querySelector('[data-tpl="value"]');
      tplName.addEventListener('input', function (e) {
        var v = e.target.value;
        if (v === '') return;
        paramRows.push({ name: v, value: '', disabled: false });
        var idx = paramRows.length - 1;
        model.url = serializeUrl(model.url, paramRows);
        renderTabPanel();
        focusAdded('name', idx);
        $('#urlInput').value = model.url;
      });
      tplValue.addEventListener('input', function (e) {
        var v = e.target.value;
        if (v === '') return;
        paramRows.push({ name: '', value: v, disabled: false });
        var idx = paramRows.length - 1;
        model.url = serializeUrl(model.url, paramRows);
        renderTabPanel();
        focusAdded('value', idx);
        $('#urlInput').value = model.url;
      });
    }
    return;
  }

  if (activeTab === 'body') {
    var body = model.body;
    var bodyTabs = [['json', 'Json'], ['xml', 'Xml'], ['raw', 'Text'], ['formdata', 'Form'], ['form', 'Form-encode'], ['graphql', 'Graphql'], ['binary', 'Binary'], ['none', 'None']];
    var html = '<div class="kp-bodytabs">' + bodyTabs.map(function (t) {
      return '<div class="kp-bodytab' + (body.type === t[0] ? ' active' : '') + '" data-btype="' + t[0] + '">' + t[1] + '</div>';
    }).join('') + '</div><div id="bodyEditor"></div>';
    panel.innerHTML = html;
    $all('.kp-bodytab').forEach(function (el) {
      el.addEventListener('click', function () {
        body.type = el.getAttribute('data-btype');
        renderTabPanel();
      });
    });
    renderBodyEditor($('#bodyEditor'));
    return;
  }

  if (activeTab === 'auth') {
    var auth = model.auth;
    var typesA = [['none', 'No Auth'], ['basic', 'Basic Auth'], ['bearer', 'Bearer Token'], ['apikey', 'API Key'], ['oauth2', 'OAuth 2.0']];
    var html = '<div class="row"><select id="authType" class="kp-select-sm">';
    typesA.forEach(function (t) { html += '<option value="' + t[0] + '"' + (auth.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; });
    html += '</select></div><div id="authEditor"></div>';
    panel.innerHTML = html;
    $('#authType').addEventListener('change', function (e) {
      auth.type = e.target.value;
      renderTabPanel();
    });
    renderAuthEditor($('#authEditor'));
    return;
  }

  if (activeTab === 'headers') {
    var html = '<div class="kp-sectitle">Headers</div><div class="ptable">';
    model.headers.forEach(function (h, i) {
      html += rowHtml('header', i, h.name, '<input class="row-value" data-act="value" value="' + esc(h.value) + '" placeholder="Value">', !h.disabled, 'name');
    });
    html += tplRowHtml(true, 'header', 'value', '<input class="row-value" data-tpl="value" placeholder="value">');
    html += '</div>';
    panel.innerHTML = html;
    $all('#tabPanel .prow[data-i]').forEach(function (row) {
      var i = parseInt(row.getAttribute('data-i'), 10);
      row.querySelector('[data-act="check"]').addEventListener('change', function (e) {
        model.headers[i].disabled = !e.target.checked;
        row.classList.toggle('off', !e.target.checked);
        updateTabCounts();
      });
      attachHeaderAc(row.querySelector('[data-act="name"]'), i);
      row.querySelector('[data-act="value"]').addEventListener('input', function (e) {
        model.headers[i].value = e.target.value;
      });
      row.querySelector('[data-act="del"]').addEventListener('click', function () {
        model.headers.splice(i, 1);
        updateTabCounts();
        renderTabPanel();
      });
    });
    var tpl = $('#tabPanel .prow.tpl');
    if (tpl) {
      var tplName = tpl.querySelector('[data-tpl="name"]');
      var tplValue = tpl.querySelector('[data-tpl="value"]');
      attachHeaderAcTpl(tplName);
      tplName.addEventListener('input', function (e) {
        var v = e.target.value;
        if (v === '') return;
        model.headers.push({ name: v, value: '', disabled: false });
        updateTabCounts();
        renderTabPanel();
        focusAdded('name', model.headers.length - 1);
      });
      tplValue.addEventListener('input', function (e) {
        var v = e.target.value;
        if (v === '') return;
        model.headers.push({ name: '', value: v, disabled: false });
        updateTabCounts();
        renderTabPanel();
        focusAdded('value', model.headers.length - 1);
      });
    }
    return;
  }

  if (activeTab === 'tests') {
    var html = '';
    if (model.tests.length === 0) {
      html = '<div class="kp-hint">No asserts. Add an assert to test the response without any code.</div>';
    }
    model.tests.forEach(function (rule, i) {
      html += '<div class="row" data-i="' + i + '">' +
        '<input type="checkbox" class="row-check" data-act="check"' + (!rule.disabled ? ' checked' : '') + '>' +
        '<select data-act="target" class="kp-select-sm" style="flex:2">' + assertTargetOptions(rule.type) + '</select>' +
        '<span id="assertFields" style="display:contents"></span>' +
        '<button class="row-del" data-act="del">&times;</button>' +
      '</div>';
    });
    html += '<div class="kp-btnrow"><button id="addAssert">+ Add Assert</button></div>';
    html += '<div class="kp-script-box">' +
      '<label class="kp-chk"><input type="checkbox" id="scriptChk"' + (model.script ? ' checked' : '') + '> Custom Script (JavaScript)</label>' +
      '<div id="scriptWrap" style="display:' + (model.script ? 'block' : 'none') + ';margin-top:8px">' +
        '<div class="kp-hint">Runs after the response. Available: response (status, headers, body, json, time), env, kangpos.setEnvVar(name, value), kangpos.assert(cond, msg), console.log. Use it for request chaining.</div>' +
        '<textarea id="scriptArea" rows="9" spellcheck="false"></textarea>' +
      '</div>' +
    '</div>';
    panel.innerHTML = html;
    $('#scriptChk').addEventListener('change', function (e) {
      $('#scriptWrap').style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) model.script = '';
      else $('#scriptArea').value = model.script;
    });
    $('#scriptArea').value = model.script;
    $('#scriptArea').addEventListener('input', function (e) { model.script = e.target.value; });
    $all('#tabPanel .row').forEach(function (row) {
      var i = parseInt(row.getAttribute('data-i'), 10);
      var rule = model.tests[i];
      row.querySelector('[data-act="check"]').addEventListener('change', function (e) {
        rule.disabled = !e.target.checked;
        updateTabCounts();
      });
      var targetSel = row.querySelector('[data-act="target"]');
      targetSel.value = rule.type;
      targetSel.addEventListener('change', function (e) {
        rule.type = e.target.value;
        rule.action = defaultActionFor(rule.type);
        renderTabPanel();
      });
      row.querySelector('[data-act="del"]').addEventListener('click', function () {
        model.tests.splice(i, 1);
        updateTabCounts();
        renderTabPanel();
      });
      renderAssertFields(row, rule, i);
    });
    var addBtn = $('#addAssert');
    if (addBtn) addBtn.addEventListener('click', function () {
      model.tests.push({ id: String(Date.now()) + Math.random().toString(36).slice(2), type: 'status', action: 'equals', path: '', value: '', varName: '' });
      updateTabCounts();
      renderTabPanel();
    });
    return;
  }

  if (activeTab === 'docs') {
    panel.innerHTML = '<div class="kp-hint">Request documentation. Supports plain text / markdown.</div>' +
      '<textarea id="docsArea" rows="8" spellcheck="false"></textarea>';
    $('#docsArea').value = model.docs;
    $('#docsArea').addEventListener('input', function (e) { model.docs = e.target.value; });
    return;
  }
}

function assertTargetOptions(current) {
  var opts = [['status', 'Status Code'], ['header', 'Header'], ['body', 'Body (JSON Path)'], ['text', 'Body Text'], ['time', 'Response Time'], ['env', 'Set Env Var']];
  return opts.map(function (o) { return '<option value="' + o[0] + '"' + (current === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
}

function defaultActionFor(type) {
  var map = { status: 'equals', header: 'exists', body: 'equals', text: 'contains', time: 'less', env: 'set' };
  return map[type] || 'equals';
}

function actionOptionsFor(type, current) {
  var map = {
    status: [['equals', 'Equals'], ['not_equals', 'Not Equals'], ['less', 'Less Than'], ['greater', 'Greater Than'], ['less_equals', 'Less or Equal'], ['greater_equals', 'Greater or Equal']],
    header: [['exists', 'Exists'], ['not_exists', 'Not Exists'], ['equals', 'Equals'], ['contains', 'Contains'], ['not_contains', 'Not Contains'], ['starts_with', 'Starts With']],
    body: [['equals', 'Equals'], ['not_equals', 'Not Equals'], ['exists', 'Exists'], ['not_exists', 'Not Exists'], ['contains', 'Contains'], ['not_contains', 'Not Contains'], ['starts_with', 'Starts With'], ['length_equals', 'Length Equals'], ['length_greater', 'Length Greater'], ['length_less', 'Length Less'], ['greater', 'Greater Than'], ['less', 'Less Than']],
    text: [['contains', 'Contains'], ['not_contains', 'Not Contains'], ['equals', 'Equals'], ['starts_with', 'Starts With'], ['ends_with', 'Ends With']],
    time: [['less', 'Less Than (ms)'], ['greater', 'Greater Than (ms)'], ['less_equals', 'Less or Equal (ms)']],
    env: [['set', 'Set From JSON Path']]
  };
  var list = map[type] || [];
  return list.map(function (o) { return '<option value="' + o[0] + '"' + (current === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
}

function renderAssertFields(row, rule, i) {
  var container = row.querySelector('#assertFields');
  var html = '';
  var actionSel = '<select data-act="action" class="kp-select-sm" style="flex:2">' + actionOptionsFor(rule.type, rule.action) + '</select>';
  if (rule.type === 'status' || rule.type === 'time') {
    html = actionSel + '<input data-act="value" value="' + esc(rule.value) + '" placeholder="Value" style="flex:3;font-family:var(--vscode-editor-font-family,monospace)">';
  } else if (rule.type === 'header') {
    html = actionSel + '<input data-act="path" value="' + esc(rule.path) + '" placeholder="Header Name" style="flex:2;font-family:var(--vscode-editor-font-family,monospace)">' +
      '<input data-act="value" value="' + esc(rule.value) + '" placeholder="Value" style="flex:2;font-family:var(--vscode-editor-font-family,monospace)">';
  } else if (rule.type === 'body') {
    html = actionSel + '<input data-act="path" value="' + esc(rule.path) + '" placeholder="Path e.g. data.id" style="flex:2;font-family:var(--vscode-editor-font-family,monospace)">' +
      '<input data-act="value" value="' + esc(rule.value) + '" placeholder="Value" style="flex:2;font-family:var(--vscode-editor-font-family,monospace)">';
  } else if (rule.type === 'text') {
    html = actionSel + '<input data-act="value" value="' + esc(rule.value) + '" placeholder="Text" style="flex:4;font-family:var(--vscode-editor-font-family,monospace)">';
  } else if (rule.type === 'env') {
    html = actionSel + '<input data-act="path" value="' + esc(rule.path) + '" placeholder="JSON Path e.g. token" style="flex:2;font-family:var(--vscode-editor-font-family,monospace)">' +
      '<input data-act="varName" value="' + esc(rule.varName) + '" placeholder="Var Name" style="flex:2;font-family:var(--vscode-editor-font-family,monospace)">';
  }
  container.outerHTML = '<span id="assertFields" style="display:contents">' + html + '</span>';
  var re = row.querySelector('#assertFields');
  var actionSelEl = re.querySelector('[data-act="action"]');
  if (actionSelEl) actionSelEl.addEventListener('change', function (e) { rule.action = e.target.value; });
  var pathEl = re.querySelector('[data-act="path"]');
  if (pathEl) pathEl.addEventListener('input', function (e) { rule.path = e.target.value; });
  var valueEl = re.querySelector('[data-act="value"]');
  if (valueEl) valueEl.addEventListener('input', function (e) { rule.value = e.target.value; });
  var varEl = re.querySelector('[data-act="varName"]');
  if (varEl) varEl.addEventListener('input', function (e) { rule.varName = e.target.value; });
}

function renderBodyEditor(container) {
  var body = model.body;
  var html = '';
  if (body.type === 'none') {
    html = '<div class="kp-hint">This request does not have a body.</div>';
  } else if (body.type === 'json' || body.type === 'xml' || body.type === 'raw') {
    var isJson = body.type === 'json';
    var title = body.type === 'json' ? 'Json Content' : body.type === 'xml' ? 'Xml Content' : 'Text Content';
    html = '<div class="kp-sectitle">' + title + '</div>' +
      '<div class="code-editor">' +
        '<div class="code-gutter" id="bodyGutter"></div>' +
        '<div class="code-main">' +
          '<pre class="code-highlight" id="bodyHighlight" aria-hidden="true"></pre>' +
          '<textarea id="bodyRaw" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>' +
        '</div>' +
      '</div>' +
      '<div class="kp-bodybar">' +
        (isJson ? '<button id="beautifyBtn" title="Format JSON">Format</button>' : '') +
        '<span id="beautifyMsg" class="kp-inline-err"></span>' +
      '</div>' +
      '<div class="kp-hint">Tip: use variables like ' + esc('{{base_url}}') + ' or dynamic ' + esc('{{$guid}}') + ', ' + esc('{{$timestamp}}') + ', ' + esc('{{$randomInt}}') + '</div>';
  } else if (body.type === 'graphql') {
    html = '<div class="kp-label">Query</div><textarea id="gqlQuery" rows="8" spellcheck="false"></textarea>' +
      '<div class="kp-label">Variables (JSON)</div><textarea id="gqlVars" rows="4" spellcheck="false"></textarea>';
  } else if (body.type === 'form') {
    html = '<div class="kp-sectitle">Form Urlencoded</div><div class="ptable">';
    body.form.forEach(function (f, i) {
      html += rowHtml('form', i, f.name, '<input class="row-value" data-act="value" value="' + esc(f.value) + '" placeholder="Value">', null, 'name');
    });
    html += tplRowHtml(false, 'name', 'value', '<input class="row-value" data-tpl="value" placeholder="value">');
    html += '</div>';
  } else if (body.type === 'formdata') {
    html = '<div class="kp-sectitle">Form Data (multipart)</div><div class="ptable">';
    body.formdata.forEach(function (f, i) {
      var valueHtml;
      if (f.type === 'file') {
        valueHtml = '<button class="row-value" data-act="pickfile" style="flex:3;text-align:left;height:24px">' + esc(f.fileName || 'Select File') + '</button>' +
          '<input type="file" style="display:none" data-act="fileinput">';
      } else {
        valueHtml = '<input class="row-value" data-act="value" value="' + esc(f.value) + '" placeholder="Value">';
      }
      html += '<div class="prow" data-i="' + i + '">' +
        '<input class="row-name" data-act="name" value="' + esc(f.name) + '" placeholder="name">' +
        '<select class="kp-select-sm" data-act="fdtype" style="flex:none"><option value="text"' + (f.type !== 'file' ? ' selected' : '') + '>Text</option><option value="file"' + (f.type === 'file' ? ' selected' : '') + '>File</option></select>' +
        valueHtml +
        '<button class="row-del" data-act="del" title="Remove">&times;</button>' +
      '</div>';
    });
    html += tplRowHtml(false, 'name', 'value', '<input class="row-value" data-tpl="value" placeholder="value">');
    html += '</div>';
  } else if (body.type === 'binary') {
    html = '<div class="row"><button id="binPick" style="flex:none">' + esc(body.binaryName || 'Select File') + '</button>' +
      '<input type="file" id="binInput" style="display:none"></div>';
  }
  container.innerHTML = html;

  var rawEl = container.querySelector('#bodyRaw');
  if (rawEl) {
    rawEl.value = body.raw;
    var beautifyMsg = container.querySelector('#beautifyMsg');
    var highlightEl = container.querySelector('#bodyHighlight');
    var gutterEl = container.querySelector('#bodyGutter');
    var sync = function () {
      if (highlightEl) {
        highlightEl.scrollTop = rawEl.scrollTop;
        highlightEl.scrollLeft = rawEl.scrollLeft;
      }
      if (gutterEl) gutterEl.scrollTop = rawEl.scrollTop;
    };
    var paint = function () {
      var text = rawEl.value;
      var inner;
      if (body.type === 'json') inner = highlightJson(text);
      else if (body.type === 'xml') inner = highlightXml(text);
      else inner = esc(text);
      if (highlightEl) highlightEl.innerHTML = inner + '\\n';
      if (gutterEl) {
        var count = text.split('\\n').length;
        var nums = '';
        for (var n = 1; n <= count; n++) nums += n + '\\n';
        gutterEl.textContent = nums;
      }
      sync();
    };
    rawEl.addEventListener('input', function () {
      body.raw = rawEl.value;
      if (beautifyMsg) beautifyMsg.textContent = '';
      paint();
    });
    rawEl.addEventListener('scroll', sync);
    rawEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      var start = rawEl.selectionStart;
      var end = rawEl.selectionEnd;
      rawEl.value = rawEl.value.slice(0, start) + '  ' + rawEl.value.slice(end);
      rawEl.selectionStart = rawEl.selectionEnd = start + 2;
      body.raw = rawEl.value;
      paint();
    });
    var beautifyBtn = container.querySelector('#beautifyBtn');
    if (beautifyBtn) beautifyBtn.addEventListener('click', function () {
      var text = rawEl.value;
      if (!text.trim()) {
        if (beautifyMsg) beautifyMsg.textContent = 'Nothing to format';
        return;
      }
      try {
        var parsed = JSON.parse(text);
        body.raw = JSON.stringify(parsed, null, 2);
        rawEl.value = body.raw;
        if (beautifyMsg) beautifyMsg.textContent = '';
        paint();
      } catch (err) {
        if (beautifyMsg) beautifyMsg.textContent = 'Invalid JSON: ' + (err && err.message ? err.message : 'parse error');
      }
    });
    paint();
  }
  var gq = container.querySelector('#gqlQuery');
  if (gq) {
    gq.value = body.graphql.query;
    gq.addEventListener('input', function (e) { body.graphql.query = e.target.value; });
  }
  var gv = container.querySelector('#gqlVars');
  if (gv) {
    gv.value = body.graphql.variables;
    gv.addEventListener('input', function (e) { body.graphql.variables = e.target.value; });
  }
  $all('#tabPanel .prow[data-i]').forEach(function (row) {
    var i = parseInt(row.getAttribute('data-i'), 10);
    var nameEl = row.querySelector('[data-act="name"]');
    if (nameEl) nameEl.addEventListener('input', function (e) {
      if (body.type === 'form') body.form[i].name = e.target.value;
      else body.formdata[i].name = e.target.value;
    });
    var valueEl = row.querySelector('[data-act="value"]');
    if (valueEl) valueEl.addEventListener('input', function (e) {
      if (body.type === 'form') body.form[i].value = e.target.value;
      else body.formdata[i].value = e.target.value;
    });
    var fdType = row.querySelector('[data-act="fdtype"]');
    if (fdType) fdType.addEventListener('change', function (e) {
      body.formdata[i].type = e.target.value === 'file' ? 'file' : 'text';
      renderTabPanel();
    });
    var pickBtn = row.querySelector('[data-act="pickfile"]');
    if (pickBtn) {
      var fileInput = row.querySelector('[data-act="fileinput"]');
      pickBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var file = fileInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var result = String(reader.result || '');
          var commaIdx = result.indexOf(',');
          body.formdata[i].fileName = file.name;
          body.formdata[i].base64 = commaIdx > -1 ? result.slice(commaIdx + 1) : result;
          renderTabPanel();
        };
        reader.readAsDataURL(file);
      });
    }
    var delBtn = row.querySelector('[data-act="del"]');
    if (delBtn) delBtn.addEventListener('click', function () {
      if (body.type === 'form') body.form.splice(i, 1);
      else body.formdata.splice(i, 1);
      renderTabPanel();
    });
  });
  var tpl = container.querySelector('.prow.tpl');
  if (tpl) {
    var tplName = tpl.querySelector('[data-tpl="name"]');
    var tplValue = tpl.querySelector('[data-tpl="value"]');
    if (tplName) tplName.addEventListener('input', function (e) {
      var v = e.target.value;
      if (v === '') return;
      var idx;
      if (body.type === 'form') { body.form.push({ name: v, value: '' }); idx = body.form.length - 1; }
      else { body.formdata.push({ name: v, value: '', type: 'text' }); idx = body.formdata.length - 1; }
      renderTabPanel();
      focusAdded('name', idx);
    });
    if (tplValue) tplValue.addEventListener('input', function (e) {
      var v = e.target.value;
      if (v === '') return;
      var idx;
      if (body.type === 'form') { body.form.push({ name: '', value: v }); idx = body.form.length - 1; }
      else { body.formdata.push({ name: '', value: v, type: 'text' }); idx = body.formdata.length - 1; }
      renderTabPanel();
      focusAdded('value', idx);
    });
  }
  var binPick = container.querySelector('#binPick');
  if (binPick) {
    var binInput = container.querySelector('#binInput');
    binPick.addEventListener('click', function () { binInput.click(); });
    binInput.addEventListener('change', function () {
      var file = binInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var commaIdx = result.indexOf(',');
        body.binaryName = file.name;
        body.binaryData = commaIdx > -1 ? result.slice(commaIdx + 1) : result;
        renderTabPanel();
      };
      reader.readAsDataURL(file);
    });
  }
}

function renderAuthEditor(container) {
  var auth = model.auth;
  var html = '';
  if (auth.type === 'none') {
    html = '<div class="kp-hint">No authorization configured.</div>';
  } else if (auth.type === 'basic') {
    html = '<div class="kp-grid">' +
      '<div class="kp-label">Username</div><input id="auUser" value="' + esc(auth.basic.username) + '">' +
      '<div class="kp-label">Password</div><input id="auPass" type="password" value="' + esc(auth.basic.password) + '">' +
    '</div>';
  } else if (auth.type === 'bearer') {
    html = '<div class="kp-grid"><div class="kp-label">Token</div><input id="auToken" value="' + esc(auth.bearer.token) + '" placeholder="Bearer token"></div>';
  } else if (auth.type === 'apikey') {
    html = '<div class="kp-grid">' +
      '<div class="kp-label">Key</div><input id="akKey" value="' + esc(auth.apikey.key) + '" placeholder="e.g. X-API-Key">' +
      '<div class="kp-label">Value</div><input id="akValue" value="' + esc(auth.apikey.value) + '">' +
      '<div class="kp-label">Add to</div><select id="akIn" class="kp-select-sm"><option value="header"' + (auth.apikey.in === 'header' ? ' selected' : '') + '>Header</option><option value="query"' + (auth.apikey.in === 'query' ? ' selected' : '') + '>Query Param</option></select>' +
    '</div>';
  } else if (auth.type === 'oauth2') {
    var grants = [['client_credentials', 'Client Credentials'], ['password', 'Password Credentials'], ['authorization_code', 'Authorization Code']];
    html = '<div class="kp-grid">' +
      '<div class="kp-label">Grant Type</div><select id="o2Grant" class="kp-select-sm">' +
      grants.map(function (g) { return '<option value="' + g[0] + '"' + (auth.oauth2.grantType === g[0] ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select>' +
      '<div class="kp-label">Access Token URL</div><input id="o2TokenUrl" value="' + esc(auth.oauth2.tokenUrl) + '">' +
      '<div class="kp-label">Client ID</div><input id="o2ClientId" value="' + esc(auth.oauth2.clientId) + '">' +
      '<div class="kp-label">Client Secret</div><input id="o2ClientSecret" type="password" value="' + esc(auth.oauth2.clientSecret) + '">' +
      '<div class="kp-label">Scope</div><input id="o2Scope" value="' + esc(auth.oauth2.scope) + '">' +
      '<div class="kp-label">Username</div><input id="o2User" value="' + esc(auth.oauth2.username) + '">' +
      '<div class="kp-label">Password</div><input id="o2Pass" type="password" value="' + esc(auth.oauth2.password) + '">' +
      '<div class="kp-label">Access Token (optional)</div><input id="o2AccessToken" value="' + esc(auth.oauth2.accessToken) + '" placeholder="Leave empty to fetch automatically">' +
    '</div>' +
    '<div class="kp-hint">Client Credentials & Password grants fetch the token automatically on send. For Authorization Code, paste the access token above.</div>';
  }
  container.innerHTML = html;
  var map = {
    auUser: function (v) { auth.basic.username = v; },
    auPass: function (v) { auth.basic.password = v; },
    auToken: function (v) { auth.bearer.token = v; },
    akKey: function (v) { auth.apikey.key = v; },
    akValue: function (v) { auth.apikey.value = v; },
    o2TokenUrl: function (v) { auth.oauth2.tokenUrl = v; },
    o2ClientId: function (v) { auth.oauth2.clientId = v; },
    o2ClientSecret: function (v) { auth.oauth2.clientSecret = v; },
    o2Scope: function (v) { auth.oauth2.scope = v; },
    o2User: function (v) { auth.oauth2.username = v; },
    o2Pass: function (v) { auth.oauth2.password = v; },
    o2AccessToken: function (v) { auth.oauth2.accessToken = v; }
  };
  Object.keys(map).forEach(function (id) {
    var el = container.querySelector('#' + id);
    if (el) el.addEventListener('input', function (e) { map[id](e.target.value); });
  });
  var akIn = container.querySelector('#akIn');
  if (akIn) akIn.addEventListener('change', function (e) { auth.apikey.in = e.target.value; });
  var grant = container.querySelector('#o2Grant');
  if (grant) grant.addEventListener('change', function (e) { auth.oauth2.grantType = e.target.value; });
}

function looksJson(text) {
  var t = String(text).trim();
  if (!(t.charAt(0) === '{' || t.charAt(0) === '[')) return false;
  try { JSON.parse(t); return true; } catch (e) { return false; }
}

function jsonPathGet(obj, path) {
  if (!path) return { found: true, value: obj };
  var p = String(path).trim();
  if (p.charAt(0) === '$') p = p.slice(1);
  if (p.charAt(0) === '.') p = p.slice(1);
  if (!p) return { found: true, value: obj };
  var tokens = [];
  p.split('.').forEach(function (seg) {
    var re = /([^\\[\\]]*)\\[(-?\\d+)\\]/g;
    var m;
    var consumed = 0;
    while ((m = re.exec(seg)) !== null) {
      if (m[1]) tokens.push(m[1]);
      tokens.push(m[2]);
      consumed = m.index + m[0].length;
    }
    if (consumed < seg.length) {
      var rest = seg.slice(consumed);
      if (rest) tokens.push(rest);
    }
  });
  var current = obj;
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (current === null || current === undefined) return { found: false, value: undefined };
    if (token === 'length' && (current instanceof Array)) { current = current.length; continue; }
    if (current instanceof Array && /^-?\\d+$/.test(token)) {
      var idx = parseInt(token, 10);
      if (idx < 0) idx = current.length + idx;
      if (idx >= current.length || idx < 0) return { found: false, value: undefined };
      current = current[idx];
      continue;
    }
    if (typeof current !== 'object') return { found: false, value: undefined };
    current = current[token];
  }
  return { found: current !== undefined, value: current };
}

function highlightJson(str) {
  var s = esc(str);
  return s.replace(/(&quot;(\\\\u[a-fA-F0-9]{4}|\\\\[^u]|[^\\\\&])*&quot;(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)/g, function (m) {
    var cls = 'num';
    if (m.indexOf('&quot;') === 0) cls = /:$/.test(m) ? 'key' : 'str';
    else if (m === 'true' || m === 'false') cls = 'bool';
    else if (m === 'null') cls = 'null';
    return '<span class="tok-' + cls + '">' + m + '</span>';
  });
}

function highlightXml(str) {
  var s = esc(str);
  s = s.replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>');
  s = s.replace(/(&lt;\\/?)((?:[\\w:.\\-]+))(?:((?:[^&]|&(?!lt;))*?)(\\/?&gt;))?/g, function (m, open, tag, rest, close) {
    var out = open + '<span class="tok-tag">' + tag + '</span>';
    if (rest !== undefined) {
      out += rest.replace(/([\\w:.\\-]+)=(&quot;[\\s\\S]*?&quot;)/g, '<span class="tok-attr">$1</span>=<span class="tok-str">$2</span>');
      if (close) out += close;
    }
    return out;
  });
  return s;
}

function prettyXml(text) {
  var xml = String(text).replace(/(>)\\s*(<)(\\/*)/g, '$1\\n$2$3');
  var formatted = '';
  var pad = 0;
  xml.split('\\n').forEach(function (line) {
    line = line.trim();
    if (!line) return;
    var close = /^<\\//.test(line);
    var selfClose = /\\/>$/.test(line) || /^<\\?/.test(line) || /^<!/.test(line);
    if (close) pad = Math.max(0, pad - 1);
    var indent = '';
    for (var i = 0; i < pad; i++) indent += '  ';
    formatted += indent + line + '\\n';
    if (!close && !selfClose && /^<[\\w:.\\-]/.test(line) && !/<\\/[\\w:.\\-]+>$/.test(line)) pad = pad + 1;
  });
  return formatted.trim();
}

function statusClass(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 300 && status < 400) return 'warn';
  return 'err';
}

function showError(message) {
  errorText = message;
  var box = $('#errorBox');
  if (box) {
    box.textContent = message;
    box.style.display = message ? 'block' : 'none';
  }
}

function rtabHtml(id, label, count) {
  return '<div class="kp-rtab' + (respTab === id ? ' active' : '') + '" data-rtab="' + id + '">' + label +
    (count > 0 ? '<span class="kp-count">' + count + '</span>' : '') + '</div>';
}

function renderResponse() {
  var section = $('#respSection');
  if (!response && !testsResult) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  var html = '';
  if (response) {
    var cls = statusClass(response.status);
    html += '<div class="kp-resp-meta">' +
      '<span><span class="rlabel">Status:</span> <span class="rval-' + cls + '">' + response.status + (response.statusText ? ' ' + esc(response.statusText) : '') + '</span></span>' +
      '<span><span class="rlabel">Size:</span> <span class="rval-size">' + formatSize(response.size) + '</span></span>' +
      '<span><span class="rlabel">Time:</span> <span class="rval-time">' + formatTime(response.timeMs) + '</span></span>' +
      '<span class="kp-spacer"></span>' +
      '<button id="copyRespBtn">Copy</button>' +
      '<button id="saveRespBtn">Save</button></div>';
  }
  html += '<div class="kp-resp-tabs">' +
    rtabHtml('body', 'Response', 0) +
    rtabHtml('headers', 'Headers', response ? response.headers.length : 0) +
    rtabHtml('cookies', 'Cookies', 0) +
    rtabHtml('tests', 'Test Results', testsResult && testsResult.results ? testsResult.results.length : 0) +
  '</div><div id="respContent"></div>' +
  '<div class="resp-filterrow"><input id="respFilter" placeholder="filter" value="' + esc(filterText) + '"></div>';
  section.innerHTML = html;
  $all('.kp-rtab').forEach(function (el) {
    el.addEventListener('click', function () {
      respTab = el.getAttribute('data-rtab');
      renderResponse();
    });
  });
  var copyBtn = $('#copyRespBtn');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(response.body).then(function () {
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1200);
    });
  });
  var saveBtn = $('#saveRespBtn');
  if (saveBtn) saveBtn.addEventListener('click', function () {
    vscode.postMessage({ command: 'save-response', base64: response.base64, name: model.name || 'response' });
  });
  var filterInput = $('#respFilter');
  filterInput.addEventListener('input', function (e) {
    filterText = e.target.value;
    renderRespContent();
  });
  renderRespContent();
}

function formatTime(ms) {
  if (ms < 1000) return Math.round(ms) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function numberedHtml(rawText, highlightFn) {
  var lines = String(rawText).split('\\n');
  var rows = lines.map(function (l, i) {
    var content = l === '' ? '&nbsp;' : highlightFn(l);
    return '<div class="cl"><span class="ln">' + (i + 1) + '</span><span class="lc">' + content + '</span></div>';
  });
  return rows.join('');
}

function renderRespContent() {
  var content = $('#respContent');
  if (!content) return;
  if (respTab === 'body') renderRespBody(content);
  else if (respTab === 'headers') renderRespHeaders(content);
  else if (respTab === 'cookies') renderRespCookies(content);
  else renderRespTests(content);
}

function renderRespBody(content) {
  var bodyText = response.body || '';
  var contentType = response.contentType || '';
  var filter = filterText.trim();
  var inner = '';
  if (contentType.indexOf('image/') === 0 && response.base64) {
    content.innerHTML = '<div class="resp-code" style="max-height:none"><img class="resp-img" src="data:' + contentType.split(';')[0] + ';base64,' + response.base64 + '"></div>';
    return;
  }
  if (filter) {
    if (looksJson(bodyText)) {
      var parsed = JSON.parse(bodyText);
      var r = jsonPathGet(parsed, filter);
      if (r.found) {
        inner = numberedHtml(JSON.stringify(r.value, null, 2), highlightJson);
      } else {
        inner = '<span class="muted">Path not found: ' + esc(filter) + '</span>';
      }
    } else {
      var lines = bodyText.split('\\n').filter(function (l) { return l.toLowerCase().indexOf(filter.toLowerCase()) > -1; }).slice(0, 500);
      if (lines.length === 0) inner = '<span class="muted">No matches</span>';
      else inner = numberedHtml(lines.join('\\n'), escPlain);
    }
  } else if (looksJson(bodyText)) {
    inner = numberedHtml(JSON.stringify(JSON.parse(bodyText), null, 2), highlightJson);
  } else if (/xml|html/i.test(contentType)) {
    inner = numberedHtml(prettyXml(bodyText), highlightXml);
  } else if (bodyText.length > 500000) {
    inner = '<span class="muted">Response too large to display (' + formatSize(bodyText.length) + '). Use Save button.</span>';
  } else {
    inner = numberedHtml(bodyText, escPlain);
  }
  content.innerHTML = '<div class="resp-code">' + inner + '</div>';
}

function renderRespHeaders(content) {
  var rows = response.headers.map(function (h) {
    return '<tr><td>' + esc(h.name) + '</td><td>' + esc(h.value) + '</td></tr>';
  }).join('');
  content.innerHTML = '<table class="resp-headers">' + rows + '</table>';
}

function renderRespCookies(content) {
  var cookies = (response.headers || []).filter(function (h) { return /set-cookie/i.test(h.name); });
  if (cookies.length === 0) {
    content.innerHTML = '<div class="kp-hint">No cookies in response.</div>';
    return;
  }
  var rows = cookies.map(function (h) {
    var pair = String(h.value).split(';')[0];
    var eq = pair.indexOf('=');
    var name = eq > -1 ? pair.slice(0, eq) : pair;
    var value = eq > -1 ? pair.slice(eq + 1) : '';
    return '<tr><td>' + esc(name) + '</td><td>' + esc(value) + '</td></tr>';
  }).join('');
  content.innerHTML = '<table class="resp-headers">' + rows + '</table>';
}

function renderRespTests(content) {
  if (!testsResult || !testsResult.results || testsResult.results.length === 0) {
    content.innerHTML = '<div class="kp-hint">No test results. Add asserts in the Tests tab and send the request.</div>';
    return;
  }
  content.innerHTML = testsResult.results.map(function (r) {
    return '<div class="test-line"><span class="test-icon ' + (r.pass ? 'test-pass' : 'test-fail') + '">' + (r.pass ? '&#10004;' : '&#10008;') + '</span>' +
      '<span class="test-name">' + esc(r.name) + '</span><span class="test-msg">' + esc(r.message) + '</span></div>';
  }).join('');
}

function send() {
  if (sending) return;
  sending = true;
  showError('');
  var btn = $('#sendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  vscode.postMessage({ command: 'send', model: model });
}

function renderAll() {
  renderMethod();
  renderEnvSelect();
  paramRows = parseUrlQuery(model.url);
  updateTabCounts();
  renderTabPanel();
  renderResponse();
}

function handleMessage(msg) {
  if (msg.command === 'response') {
    sending = false;
    var btn = $('#sendBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
    response = msg.response;
    testsResult = msg.tests || null;
    renderResponse();
  } else if (msg.command === 'error') {
    sending = false;
    var btn2 = $('#sendBtn');
    if (btn2) { btn2.disabled = false; btn2.textContent = 'Send'; }
    response = null;
    testsResult = null;
    renderResponse();
    showError(msg.message || 'Request failed');
  } else if (msg.command === 'saved') {
    meta.requestId = msg.requestId;
    meta.collectionId = msg.collectionId;
    meta.collectionName = msg.collectionName;
    meta.saved = true;
    model.name = msg.name || model.name;
    var saveIcon = $('#saveIconBtn');
    if (saveIcon) saveIcon.title = 'Save (Ctrl+S)';
  } else if (msg.command === 'envs') {
    meta.envs = msg.envs;
    meta.activeEnvId = msg.activeEnvId;
    renderEnvSelect();
  }
}

window.addEventListener('message', function (event) { handleMessage(event.data); });

ensureModel();
buildSkeleton();
bindSkeleton();
renderAll();
if (INIT.autoSend) { setTimeout(function () { send(); }, 50); }
</script>
</body>
</html>`;
}
