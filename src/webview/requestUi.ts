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
  padding: 10px 12px 40px;
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
  border-radius: 2px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 12px;
}
button:hover { background: var(--vscode-button-secondaryHoverBackground, #45494e); }
button.primary { background: var(--accent); color: #fff; }
button.primary:hover { filter: brightness(1.1); background: var(--accent); }
button:disabled { opacity: 0.6; cursor: default; }
.kp-top { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.kp-top #reqName { flex: 1; font-size: 13px; font-weight: 600; }
.kp-actions { display: flex; gap: 6px; }
.kp-reqbar { display: flex; gap: 8px; margin-bottom: 8px; }
.kp-reqbar #urlInput { flex: 1; }
#methodSelect {
  width: 110px; font-weight: 700; color: #fff; border: none; cursor: pointer;
  -webkit-appearance: none; appearance: none; text-align: center; padding: 5px 6px;
}
#sendBtn { min-width: 80px; font-weight: 600; padding: 5px 18px; }
.kp-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--vscode-panel-border, #333); margin-bottom: 10px; }
.kp-tab { padding: 6px 12px; cursor: pointer; font-size: 12px; color: var(--vscode-foreground, #ccc); border-bottom: 2px solid transparent; user-select: none; }
.kp-tab:hover { color: var(--vscode-editor-foreground); }
.kp-tab.active { border-bottom-color: var(--accent); color: var(--vscode-editor-foreground); }
.kp-count { opacity: 0.7; font-size: 10px; margin-left: 4px; }
.kp-tabpanel { margin-bottom: 12px; }
.row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.row input.row-name { flex: 3; }
.row input.row-value { flex: 7; }
.row-del { background: transparent; color: var(--vscode-editor-foreground, #ccc); font-size: 14px; padding: 2px 8px; }
.row-del:hover { color: #e74c3c; background: transparent; }
.row-check { width: 14px; height: 14px; flex: none; }
.kp-hint { color: var(--vscode-descriptionForeground, #888); font-size: 12px; margin: 6px 0; }
.kp-btnrow { margin-top: 8px; display: flex; gap: 8px; }
.kp-label { font-size: 11px; color: var(--vscode-descriptionForeground, #999); margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 0.4px; }
.kp-grid { display: grid; grid-template-columns: 130px 1fr; gap: 6px; align-items: center; max-width: 720px; }
.kp-error { background: #5f2120; border: 1px solid #e74c3c; color: #f5c6cb; padding: 10px 14px; border-radius: 3px; margin: 10px 0; white-space: pre-wrap; font-size: 12px; }
.kp-resp { border-top: 1px solid var(--vscode-panel-border, #333); padding-top: 10px; }
.kp-resp-meta { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.kp-pill { padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; color: #fff; }
.kp-pill.ok { background: #2e7d32; }
.kp-pill.warn { background: #ef6c00; }
.kp-pill.err { background: #c62828; }
.kp-meta { color: var(--vscode-descriptionForeground, #999); font-size: 12px; }
.kp-spacer { flex: 1; }
.kp-resp-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--vscode-panel-border, #333); margin-bottom: 8px; }
.kp-rtab { padding: 5px 12px; cursor: pointer; font-size: 12px; border-bottom: 2px solid transparent; user-select: none; }
.kp-rtab.active { border-bottom-color: var(--accent); }
.resp-toolbar { margin-bottom: 6px; }
.resp-toolbar input { width: 60%; }
pre.resp-body {
  background: var(--vscode-code-block-background, rgba(128,128,128,0.1));
  padding: 10px 14px; border-radius: 3px; overflow: auto; max-height: 55vh;
  font-family: var(--vscode-editor-font-family, monospace); font-size: 12px;
  white-space: pre-wrap; word-break: break-word; margin: 0; line-height: 1.55;
}
.tok-key { color: #9cdcfe; }
.tok-str { color: #ce9178; }
.tok-num { color: #b5cea8; }
.tok-bool { color: #569cd6; }
.tok-null { color: #569cd6; }
.tok-tag { color: #569cd6; }
.tok-attr { color: #9cdcfe; }
.tok-comment { color: #6a9955; }
.tok-plain { color: var(--vscode-editor-foreground, #ccc); }
.muted { color: var(--vscode-descriptionForeground, #888); }
.resp-headers { width: 100%; border-collapse: collapse; font-size: 12px; }
.resp-headers td { padding: 3px 10px; border-bottom: 1px solid rgba(128,128,128,0.15); vertical-align: top; }
.resp-headers td:first-child { color: var(--vscode-descriptionForeground, #999); white-space: nowrap; width: 220px; }
.test-line { display: flex; gap: 8px; align-items: baseline; padding: 4px 2px; font-size: 12px; border-bottom: 1px solid rgba(128,128,128,0.12); }
.test-icon { font-weight: 700; }
.test-pass { color: #66bb6a; }
.test-fail { color: #ef5350; }
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

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function safeDecode(s) { try { return decodeURIComponent(String(s).replace(/\\+/g, ' ')); } catch (e) { return s; } }

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
    out.push({ name: safeDecode(name), value: safeDecode(value) });
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
    '<div class="kp-top">' +
      '<select id="envSelect" title="Environment"></select>' +
      '<input id="reqName" placeholder="Request Name">' +
      '<div class="kp-actions">' +
        '<button id="saveBtn" class="primary">Save</button>' +
        '<button id="saveAsBtn">Save As</button>' +
        '<select id="actionSelect" title="Actions">' +
          '<option value="">Actions</option>' +
          '<option value="curl">Copy as cURL</option>' +
          '<option value="codegen">Generate Code</option>' +
          '<option value="save-resp">Save Response</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="kp-reqbar">' +
      '<select id="methodSelect"></select>' +
      '<input id="urlInput" placeholder="Enter request URL e.g. https://api.example.com/v1/users">' +
      '<button id="sendBtn" class="primary">Send</button>' +
    '</div>' +
    '<div class="kp-tabs" id="tabBar"></div>' +
    '<div class="kp-tabpanel" id="tabPanel"></div>' +
    '<div id="errorBox" class="kp-error" style="display:none"></div>' +
    '<div id="respSection" class="kp-resp" style="display:none"></div>';
}

function bindSkeleton() {
  $('#reqName').addEventListener('input', function (e) { model.name = e.target.value; });
  $('#urlInput').addEventListener('input', function (e) {
    model.url = e.target.value;
    if (activeTab === 'params') { paramRows = parseUrlQuery(model.url); renderTabPanel(); }
    updateTabCounts();
  });
  $('#methodSelect').addEventListener('change', function (e) {
    model.method = e.target.value;
    e.target.style.background = METHOD_COLORS[model.method] || '#7f8c8d';
  });
  $('#sendBtn').addEventListener('click', function () { send(); });
  $('#saveBtn').addEventListener('click', function () {
    if (meta.saved) vscode.postMessage({ command: 'save', model: model });
    else vscode.postMessage({ command: 'save-as', model: model });
  });
  $('#saveAsBtn').addEventListener('click', function () {
    vscode.postMessage({ command: 'save-as', model: model });
  });
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
  });
}

function renderMethod() {
  var sel = $('#methodSelect');
  sel.innerHTML = METHODS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
  sel.value = METHODS.indexOf(model.method) > -1 ? model.method : 'GET';
  sel.style.background = METHOD_COLORS[sel.value] || '#7f8c8d';
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

function renderTop() {
  $('#reqName').value = model.name || '';
  $('#saveBtn').textContent = meta.saved ? 'Save' : 'Save As';
  $('#saveAsBtn').style.display = meta.saved ? '' : 'none';
}

function tabDefs() {
  return [
    ['params', 'Params', paramRows.length],
    ['body', 'Body', model.body && model.body.type !== 'none' ? 1 : 0],
    ['auth', 'Auth', model.auth && model.auth.type !== 'none' ? 1 : 0],
    ['headers', 'Headers', activeHeaders().length],
    ['tests', 'Tests', (model.tests || []).filter(function (t) { return !t.disabled; }).length],
    ['docs', 'Docs', model.docs ? 1 : 0]
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

function rowHtml(prefix, i, nameValue, valueHtml, checked, mono) {
  return '<div class="row" data-i="' + i + '">' +
    (checked === null ? '' : '<input type="checkbox" class="row-check" data-act="check"' + (checked ? ' checked' : '') + '>') +
    '<input class="row-name" data-act="name" value="' + esc(nameValue) + '" placeholder="Name"' + (mono ? ' style="font-family:var(--vscode-editor-font-family,monospace)"' : '') + '>' +
    valueHtml +
    '<button class="row-del" data-act="del" title="Remove">&times;</button>' +
  '</div>';
}

function renderTabPanel() {
  var panel = $('#tabPanel');
  if (activeTab === 'params') {
    var html = '';
    if (paramRows.length === 0) {
      html = '<div class="kp-hint">No query parameters. Add a parameter or type it in the URL e.g. ?page=1&size=10</div>';
    } else {
      html = paramRows.map(function (p, i) {
        return rowHtml('param', i, p.name, '<input class="row-value" data-act="value" value="' + esc(p.value) + '" placeholder="Value" style="flex:7;font-family:var(--vscode-editor-font-family,monospace)">', null);
      }).join('');
    }
    html += '<div class="kp-btnrow"><button id="addParam">+ Add Param</button></div>';
    panel.innerHTML = html;
    $all('#tabPanel .row').forEach(function (row) {
      var i = parseInt(row.getAttribute('data-i'), 10);
      row.querySelectorAll('[data-act="name"], [data-act="value"]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          paramRows[i].name = row.querySelector('[data-act="name"]').value;
          paramRows[i].value = row.querySelector('[data-act="value"]').value;
          model.url = serializeUrl(model.url, paramRows);
          $('#urlInput').value = model.url;
          updateTabCounts();
        });
      });
      row.querySelector('[data-act="del"]').addEventListener('click', function () {
        paramRows.splice(i, 1);
        model.url = serializeUrl(model.url, paramRows);
        $('#urlInput').value = model.url;
        updateTabCounts();
        renderTabPanel();
      });
    });
    var addBtn = $('#addParam');
    if (addBtn) addBtn.addEventListener('click', function () {
      paramRows.push({ name: '', value: '' });
      renderTabPanel();
      var rows = $all('#tabPanel .row');
      var last = rows[rows.length - 1];
      if (last) last.querySelector('[data-act="name"]').focus();
    });
    return;
  }

  if (activeTab === 'body') {
    var body = model.body;
    var types = ['none', 'json', 'form', 'formdata', 'xml', 'raw', 'binary', 'graphql'];
    var typeLabels = { none: 'None', json: 'JSON', form: 'Form Urlencoded', formdata: 'Form Data (multipart)', xml: 'XML', raw: 'Raw', binary: 'Binary File', graphql: 'GraphQL' };
    var html = '<div class="row"><select id="bodyType" class="kp-select-sm">';
    types.forEach(function (t) {
      html += '<option value="' + t + '"' + (body.type === t ? ' selected' : '') + '>' + typeLabels[t] + '</option>';
    });
    html += '</select></div><div id="bodyEditor"></div>';
    panel.innerHTML = html;
    $('#bodyType').addEventListener('change', function (e) {
      body.type = e.target.value;
      renderTabPanel();
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
    var html = '';
    if (model.headers.length === 0) {
      html = '<div class="kp-hint">No headers set.</div>';
    }
    model.headers.forEach(function (h, i) {
      html += rowHtml('header', i, h.name, '<input class="row-value" data-act="value" value="' + esc(h.value) + '" placeholder="Value" style="flex:7;font-family:var(--vscode-editor-font-family,monospace)">', !h.disabled);
    });
    html += '<div class="kp-btnrow"><button id="addHeader">+ Add Header</button></div>';
    panel.innerHTML = html;
    $all('#tabPanel .row').forEach(function (row) {
      var i = parseInt(row.getAttribute('data-i'), 10);
      row.querySelector('[data-act="check"]').addEventListener('change', function (e) {
        model.headers[i].disabled = !e.target.checked;
        updateTabCounts();
      });
      row.querySelector('[data-act="name"]').addEventListener('input', function (e) {
        model.headers[i].name = e.target.value;
        updateTabCounts();
      });
      row.querySelector('[data-act="value"]').addEventListener('input', function (e) {
        model.headers[i].value = e.target.value;
      });
      row.querySelector('[data-act="del"]').addEventListener('click', function () {
        model.headers.splice(i, 1);
        updateTabCounts();
        renderTabPanel();
      });
    });
    var addBtn = $('#addHeader');
    if (addBtn) addBtn.addEventListener('click', function () {
      model.headers.push({ name: '', value: '', disabled: false });
      renderTabPanel();
      var rows = $all('#tabPanel .row');
      var last = rows[rows.length - 1];
      if (last) last.querySelector('[data-act="name"]').focus();
    });
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
    html = '<textarea id="bodyRaw" rows="10" spellcheck="false"></textarea>' +
      '<div class="kp-hint">Tip: use variables like ' + esc('{{base_url}}') + ' or dynamic ' + esc('{{$guid}}') + ', ' + esc('{{$timestamp}}') + ', ' + esc('{{$randomInt}}') + '</div>';
  } else if (body.type === 'graphql') {
    html = '<div class="kp-label">Query</div><textarea id="gqlQuery" rows="8" spellcheck="false"></textarea>' +
      '<div class="kp-label">Variables (JSON)</div><textarea id="gqlVars" rows="4" spellcheck="false"></textarea>';
  } else if (body.type === 'form') {
    if (body.form.length === 0) html = '<div class="kp-hint">No form fields.</div>';
    body.form.forEach(function (f, i) {
      html += rowHtml('form', i, f.name, '<input class="row-value" data-act="value" value="' + esc(f.value) + '" placeholder="Value" style="flex:7;font-family:var(--vscode-editor-font-family,monospace)">', null);
    });
    html += '<div class="kp-btnrow"><button id="addFormField">+ Add Field</button></div>';
  } else if (body.type === 'formdata') {
    if (body.formdata.length === 0) html = '<div class="kp-hint">No form data fields.</div>';
    body.formdata.forEach(function (f, i) {
      var valueHtml;
      if (f.type === 'file') {
        valueHtml = '<button class="row-value kp-select-sm" data-act="pickfile" style="flex:7;text-align:left">' + esc(f.fileName || 'Select File') + '</button>' +
          '<input type="file" style="display:none" data-act="fileinput">';
      } else {
        valueHtml = '<input class="row-value" data-act="value" value="' + esc(f.value) + '" placeholder="Value" style="flex:7;font-family:var(--vscode-editor-font-family,monospace)">';
      }
      html += '<div class="row" data-i="' + i + '">' +
        '<input class="row-name" data-act="name" value="' + esc(f.name) + '" placeholder="Name">' +
        '<select class="kp-select-sm" data-act="fdtype" style="flex:1"><option value="text"' + (f.type !== 'file' ? ' selected' : '') + '>Text</option><option value="file"' + (f.type === 'file' ? ' selected' : '') + '>File</option></select>' +
        valueHtml +
        '<button class="row-del" data-act="del">&times;</button>' +
      '</div>';
    });
    html += '<div class="kp-btnrow"><button id="addFdField">+ Add Field</button></div>';
  } else if (body.type === 'binary') {
    html = '<div class="row"><button id="binPick" style="flex:none">' + esc(body.binaryName || 'Select File') + '</button>' +
      '<input type="file" id="binInput" style="display:none"></div>';
  }
  container.innerHTML = html;

  var rawEl = container.querySelector('#bodyRaw');
  if (rawEl) {
    rawEl.value = body.raw;
    rawEl.addEventListener('input', function (e) { body.raw = e.target.value; });
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
  $all('#tabPanel .row').forEach(function (row) {
    var i = parseInt(row.getAttribute('data-i'), 10);
    var nameEl = row.querySelector('[data-act="name"]');
    if (nameEl) nameEl.addEventListener('input', function (e) { body.form[i].name = e.target.value; });
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
  var addForm = container.querySelector('#addFormField');
  if (addForm) addForm.addEventListener('click', function () {
    body.form.push({ name: '', value: '' });
    renderTabPanel();
  });
  var addFd = container.querySelector('#addFdField');
  if (addFd) addFd.addEventListener('click', function () {
    body.formdata.push({ name: '', value: '', type: 'text' });
    renderTabPanel();
  });
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

function renderResponse() {
  var section = $('#respSection');
  if (!response && !testsResult) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  var html = '';
  if (response) {
    var pill = '<span class="kp-pill ' + statusClass(response.status) + '">' + response.status + (response.statusText ? ' ' + esc(response.statusText) : '') + '</span>';
    var time = '<span class="kp-meta">' + formatTime(response.timeMs) + '</span>';
    var size = '<span class="kp-meta">' + formatSize(response.size) + '</span>';
    html += '<div class="kp-resp-meta">' + pill + time + size + '<div class="kp-spacer"></div>' +
      '<button id="copyRespBtn">Copy</button>' +
      '<button id="saveRespBtn">Save</button></div>';
  }
  var testSummary = '';
  if (testsResult && testsResult.results && testsResult.results.length > 0) {
    testSummary = ' (' + testsResult.passed + ' passed, ' + testsResult.failed + ' failed)';
  }
  html += '<div class="kp-resp-tabs">' +
    '<div class="kp-rtab' + (respTab === 'body' ? ' active' : '') + '" data-rtab="body">Body</div>' +
    '<div class="kp-rtab' + (respTab === 'headers' ? ' active' : '') + '" data-rtab="headers">Headers</div>' +
    '<div class="kp-rtab' + (respTab === 'tests' ? ' active' : '') + '" data-rtab="tests">Tests' + testSummary + '</div>' +
  '</div><div id="respContent"></div>';
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
  var content = $('#respContent');
  if (respTab === 'body') renderRespBody(content);
  else if (respTab === 'headers') renderRespHeaders(content);
  else renderRespTests(content);
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

function renderRespBody(content) {
  var bodyText = response.body || '';
  var contentType = response.contentType || '';
  var filter = filterText.trim();
  var inner = '';
  if (contentType.indexOf('image/') === 0 && response.base64) {
    inner = '<img class="resp-img" src="data:' + contentType.split(';')[0] + ';base64,' + response.base64 + '">';
  } else if (filter) {
    if (looksJson(bodyText)) {
      var parsed = JSON.parse(bodyText);
      var r = jsonPathGet(parsed, filter);
      if (r.found) {
        inner = highlightJson(JSON.stringify(r.value, null, 2));
      } else {
        inner = '<span class="muted">Path not found: ' + esc(filter) + '</span>';
      }
    } else {
      var lines = bodyText.split('\\n').filter(function (l) { return l.toLowerCase().indexOf(filter.toLowerCase()) > -1; }).slice(0, 500);
      if (lines.length === 0) inner = '<span class="muted">No matches</span>';
      else inner = '<span class="tok-plain">' + esc(lines.join('\\n')) + '</span>';
    }
  } else if (looksJson(bodyText)) {
    inner = highlightJson(JSON.stringify(JSON.parse(bodyText), null, 2));
  } else if (/xml|html/i.test(contentType)) {
    inner = highlightXml(prettyXml(bodyText));
  } else if (bodyText.length > 500000) {
    inner = '<span class="muted">Response too large to display (' + formatSize(bodyText.length) + '). Use Save button.</span>';
  } else {
    inner = '<span class="tok-plain">' + esc(bodyText) + '</span>';
  }
  content.innerHTML = '<div class="resp-toolbar"><input id="respFilter" placeholder="Filter: JSON path (data.items[0].name) or text search" value="' + esc(filterText) + '"></div>' +
    '<pre class="resp-body">' + inner + '</pre>';
  var filterInput = $('#respFilter');
  filterInput.addEventListener('input', function (e) {
    filterText = e.target.value;
    var pre = content.querySelector('.resp-body');
    var bodyText2 = response.body || '';
    var filter2 = filterText.trim();
    var inner2;
    if (!filter2) {
      renderResponse();
      return;
    }
    if (looksJson(bodyText2)) {
      var parsed2 = JSON.parse(bodyText2);
      var r2 = jsonPathGet(parsed2, filter2);
      inner2 = r2.found ? highlightJson(JSON.stringify(r2.value, null, 2)) : '<span class="muted">Path not found: ' + esc(filter2) + '</span>';
    } else {
      var lines2 = bodyText2.split('\\n').filter(function (l) { return l.toLowerCase().indexOf(filter2.toLowerCase()) > -1; }).slice(0, 500);
      inner2 = lines2.length ? '<span class="tok-plain">' + esc(lines2.join('\\n')) + '</span>' : '<span class="muted">No matches</span>';
    }
    pre.innerHTML = inner2;
  });
}

function renderRespHeaders(content) {
  var rows = response.headers.map(function (h) {
    return '<tr><td>' + esc(h.name) + '</td><td>' + esc(h.value) + '</td></tr>';
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
  renderTop();
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
    renderTop();
    renderTabPanel();
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
