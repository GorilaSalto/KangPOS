import * as vscode from 'vscode';
import { KangposEnv, KV } from '../types';
import { store } from '../data/store';

export interface EnvUiInit {
  environments: KangposEnv[];
  activeEnvId: string;
}

export class EnvPanel {
  private static panels: vscode.WebviewPanel[] = [];

  static show(): void {
    if (EnvPanel.panels.length > 0) {
      EnvPanel.panels[0].reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'kangposEnvs',
      'Kangpos · Environments',
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true }
    );
    EnvPanel.panels.push(panel);
    let sub: vscode.Disposable | undefined;
    panel.onDidDispose(() => {
      EnvPanel.panels = EnvPanel.panels.filter(p => p !== panel);
      if (sub) sub.dispose();
    });
    panel.webview.onDidReceiveMessage(msg => void EnvPanel.onMessage(msg));
    sub = store.onDidChange(() => {
      if (!EnvPanel.panels.includes(panel)) return;
      EnvPanel.render(panel);
    });
    EnvPanel.render(panel);
  }

  private static render(panel: vscode.WebviewPanel): void {
    panel.webview.html = envHtml({ environments: store.environments, activeEnvId: store.activeEnvId });
  }

  private static async onMessage(msg: { command: string; [key: string]: unknown }): Promise<void> {
    switch (msg.command) {
      case 'env-create': {
        const name = await vscode.window.showInputBox({ prompt: 'Environment name', value: 'New Environment' });
        if (name) store.addEnv(name);
        break;
      }
      case 'env-delete': {
        const id = String(msg.id || '');
        if (!id || id === 'g') break;
        const env = store.environments.find(e => e._id === id);
        const confirm = await vscode.window.showWarningMessage('Delete environment "' + (env ? env.name : id) + '"?', { modal: true }, 'Delete');
        if (confirm === 'Delete') store.deleteEnv(id);
        break;
      }
      case 'env-rename': {
        const id = String(msg.id || '');
        const name = typeof msg.name === 'string' ? msg.name : '';
        if (id && name) store.renameEnv(id, name);
        break;
      }
      case 'env-set-active': {
        store.setActiveEnv(String(msg.id || 'g'));
        break;
      }
      case 'env-vars': {
        const id = String(msg.id || '');
        const variables = (msg.variables || []) as KV[];
        if (id) store.updateEnvVars(id, variables.map(v => ({ name: String(v.name || ''), value: String(v.value || '') })));
        break;
      }
      default:
        break;
    }
  }
}

export function envHtml(init: EnvUiInit): string {
  const json = JSON.stringify(init).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding: 12px 16px 60px;
  color: var(--vscode-editor-foreground, #ccc);
  background: var(--vscode-editor-background, #1e1e1e);
  font-family: var(--vscode-font-family, sans-serif); font-size: 13px;
}
input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 2px; padding: 4px 8px; font-size: 12px; outline: none;
}
input:focus { border-color: #29b6f6; }
button {
  background: var(--vscode-button-secondaryBackground, #3a3d41);
  color: var(--vscode-button-secondaryForeground, #fff);
  border: none; border-radius: 2px; padding: 4px 12px; cursor: pointer; font-size: 12px;
}
button.primary { background: #29b6f6; color: #fff; }
button.ghost { background: transparent; color: var(--vscode-editor-foreground, #ccc); font-size: 14px; padding: 2px 8px; }
button.ghost:hover { color: #ef5350; }
.env-block { border: 1px solid var(--vscode-panel-border, #333); border-radius: 4px; margin-bottom: 14px; }
.env-head { display: flex; gap: 8px; align-items: center; padding: 8px 10px; background: rgba(128,128,128,0.08); }
.env-head input { font-weight: 700; }
.env-name { width: 220px; }
.active-badge { background: #2e7d32; color: #fff; border-radius: 10px; padding: 2px 10px; font-size: 10px; font-weight: 700; }
.spacer { flex: 1; }
.vars { padding: 4px 10px 10px; }
.var-row { display: flex; gap: 6px; margin: 6px 0; align-items: center; }
.var-row input.vname { flex: 2; }
.var-row input.vvalue { flex: 6; font-family: var(--vscode-editor-font-family, monospace); }
.var-del { background: transparent; color: var(--vscode-editor-foreground, #ccc); font-size: 14px; padding: 2px 8px; }
.var-del:hover { color: #e74c3c; }
.hint { color: var(--vscode-descriptionForeground, #888); font-size: 12px; margin: 6px 0; }
.addbtn { margin: 6px 0; }
</style>
</head>
<body>
<div id="app"></div>
<script>
var INIT = ${json};
var vscode = acquireVsCodeApi();

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render() {
  var app = $('#app');
  var html = '<div class="hint">Environments are variable sets usable in requests with ' + esc('{{variable}}') + ' syntax. The active environment is used when sending requests. Dynamic variables: ' + esc('{{$guid}}') + ', ' + esc('{{$timestamp}}') + ', ' + esc('{{$randomInt}}') + '</div>';
  html += '<div style="margin-bottom:12px"><button id="addEnv" class="primary">+ New Environment</button></div>';
  INIT.environments.forEach(function (env) {
    var isGlobal = env.type === 'g';
    var isActive = env._id === INIT.activeEnvId;
    html += '<div class="env-block" data-id="' + esc(env._id) + '">' +
      '<div class="env-head">' +
        '<input class="env-name" data-act="rename" value="' + esc(env.name) + '"' + (isGlobal ? ' disabled' : '') + '>' +
        (isActive ? '<span class="active-badge">ACTIVE</span>' : '<button data-act="setactive">Set Active</button>') +
        '<div class="spacer"></div>' +
        (isGlobal ? '' : '<button class="ghost" data-act="delete" title="Delete">&times;</button>') +
      '</div>' +
      '<div class="vars">';
    env.variables.forEach(function (v, i) {
      html += '<div class="var-row" data-i="' + i + '">' +
        '<input class="vname" data-act="vname" value="' + esc(v.name) + '" placeholder="Variable Name">' +
        '<input class="vvalue" data-act="vvalue" value="' + esc(v.value) + '" placeholder="Value">' +
        '<button class="var-del" data-act="vdel">&times;</button>' +
      '</div>';
    });
    html += '<button class="addbtn" data-act="addvar">+ Add Variable</button>';
    html += '</div></div>';
  });
  app.innerHTML = html;

  $('#addEnv').addEventListener('click', function () {
    vscode.postMessage({ command: 'env-create' });
  });

  $all('.env-block').forEach(function (block) {
    var id = block.getAttribute('data-id');
    var renameEl = block.querySelector('[data-act="rename"]');
    if (renameEl) renameEl.addEventListener('change', function (e) {
      vscode.postMessage({ command: 'env-rename', id: id, name: e.target.value });
    });
    var setActive = block.querySelector('[data-act="setactive"]');
    if (setActive) setActive.addEventListener('click', function () {
      vscode.postMessage({ command: 'env-set-active', id: id });
    });
    var del = block.querySelector('[data-act="delete"]');
    if (del) del.addEventListener('click', function () {
      vscode.postMessage({ command: 'env-delete', id: id });
    });
    var addVar = block.querySelector('[data-act="addvar"]');
    if (addVar) addVar.addEventListener('click', function () {
      var vars = collectVars(block);
      vars.push({ name: '', value: '' });
      vscode.postMessage({ command: 'env-vars', id: id, variables: vars });
    });
    block.querySelectorAll('.var-row').forEach(function (row) {
      var i = parseInt(row.getAttribute('data-i'), 10);
      var nameEl = row.querySelector('[data-act="vname"]');
      var valueEl = row.querySelector('[data-act="vvalue"]');
      if (nameEl) nameEl.addEventListener('change', function () {
        vscode.postMessage({ command: 'env-vars', id: id, variables: collectVars(block) });
      });
      if (valueEl) valueEl.addEventListener('change', function () {
        vscode.postMessage({ command: 'env-vars', id: id, variables: collectVars(block) });
      });
      var delVar = row.querySelector('[data-act="vdel"]');
      if (delVar) delVar.addEventListener('click', function () {
        var vars = collectVars(block);
        vars.splice(i, 1);
        vscode.postMessage({ command: 'env-vars', id: id, variables: vars });
      });
    });
  });
}

function collectVars(block) {
  var rows = block.querySelectorAll('.var-row');
  var vars = [];
  rows.forEach(function (row) {
    vars.push({
      name: row.querySelector('[data-act="vname"]').value,
      value: row.querySelector('[data-act="vvalue"]').value
    });
  });
  return vars;
}

window.addEventListener('message', function (event) {
  if (event.data && event.data.command === 'refresh') {
    INIT = event.data.init;
    render();
  }
});

render();
</script>
</body>
</html>`;
}
