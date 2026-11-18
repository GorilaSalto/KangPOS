import * as vscode from 'vscode';
import { store } from '../data/store';
import { accentColor } from '../webview/requestUi';
import { timeAgo } from '../utils/utils';
import { CollectionItem, KangposFolder, KangposRequest } from '../types';

interface SidebarRequestNode { type: 'request'; id: string; name: string; method: string; lastRun?: number }
interface SidebarFolderNode { type: 'folder'; id: string; name: string; items: SidebarNode[] }
type SidebarNode = SidebarRequestNode | SidebarFolderNode;

interface SidebarCollectionNode {
  type: 'collection';
  id: string;
  name: string;
  count: number;
  items: SidebarNode[];
}

interface SidebarActivityNode {
  id: string;
  name: string;
  method: string;
  url: string;
  status: number;
  createdAt: number;
}

interface SidebarEnvNode {
  id: string;
  name: string;
  type: string;
  varCount: number;
}

interface SidebarData {
  accent: string;
  collections: SidebarCollectionNode[];
  activity: SidebarActivityNode[];
  envs: SidebarEnvNode[];
  activeEnvId: string;
}

function isFolder(item: CollectionItem): item is KangposFolder {
  return (item as KangposFolder).type === 'folder';
}

function snapshot(): SidebarData {
  const lastRun: Record<string, number> = {};
  for (const a of store.activity) {
    const rid = a.request && a.request._id;
    if (rid && !lastRun[rid]) lastRun[rid] = a.createdAt;
  }
  const mapItem = (item: CollectionItem): SidebarNode => {
    if (isFolder(item)) {
      return { type: 'folder', id: item._id, name: item.name, items: item.items.map(mapItem) };
    }
    const r = item as KangposRequest;
    return { type: 'request', id: r._id, name: r.name, method: r.method, lastRun: lastRun[r._id] };
  };
  return {
    accent: accentColor(vscode.workspace.getConfiguration('kangpos').get<string>('theme', 'blue')),
    collections: store.collections.map(col => ({
      type: 'collection' as const,
      id: col._id,
      name: col.name,
      count: store.listRequests(col._id).length,
      items: col.items.map(mapItem)
    })),
    activity: store.activity.map(a => ({ id: a._id, name: a.name || a.url, method: a.method, url: a.url, status: a.status, createdAt: a.createdAt })),
    envs: store.environments.map(e => ({ id: e._id, name: e.name, type: e.type, varCount: e.variables.length })),
    activeEnvId: store.activeEnvId
  };
}

export class KangposSidebar implements vscode.WebviewViewProvider {
  static viewId = 'kangpos.sidebar';
  private view?: vscode.WebviewView;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      store.onDidChange(() => void this.postData()),
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('kangpos')) void this.postData();
      })
    );
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [] };
    view.webview.html = sidebarHtml();
    view.webview.onDidReceiveMessage(msg => void this.onMessage(msg as { command: string; [key: string]: unknown }));
    void this.postData();
  }

  private async postData(): Promise<void> {
    if (!this.view) return;
    try {
      await this.view.webview.postMessage({ command: 'data', data: snapshot() });
    } catch {
      // webview not ready
    }
  }

  private async onMessage(msg: { command: string; [key: string]: unknown }): Promise<void> {
    switch (msg.command) {
      case 'exec':
        if (typeof msg.cmd === 'string' && msg.cmd.startsWith('kangpos.')) {
          await vscode.commands.executeCommand(msg.cmd, msg.args);
        }
        break;
      case 'set-env':
        if (typeof msg.envId === 'string') store.setActiveEnv(msg.envId);
        break;
      case 'new-env': {
        const name = await vscode.window.showInputBox({ prompt: 'Environment name', value: 'New Environment' });
        if (name) store.addEnv(name);
        break;
      }
      default:
        break;
    }
  }
}

export function sidebarHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  color: var(--vscode-sideBar-foreground, #cccccc);
  background: var(--vscode-sideBar-background, #252526);
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 13px;
  display: flex; flex-direction: column; overflow: hidden;
  user-select: none;
}
input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #cccccc);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 13px; padding: 4px 14px; font-size: 12px; outline: none; height: 25px;
}
input:focus { border-color: var(--accent, #29b6f6); }
button { font-family: inherit; }
.kp-head { display: flex; align-items: center; gap: 7px; padding: 10px 12px 8px; }
.kp-head .kp-logo { display: inline-flex; color: var(--accent, #29b6f6); }
.kp-head .kp-logo svg { width: 16px; height: 16px; }
.kp-title { font-size: 11.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--vscode-sideBar-foreground, #ddd); }
.kp-spacer { flex: 1; }
.iconbtn {
  width: 24px; height: 24px; padding: 0; display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 4px; cursor: pointer;
  color: var(--vscode-sideBar-foreground, #ccc); opacity: 0.8;
}
.iconbtn:hover { background: rgba(128,128,128,0.22); opacity: 1; }
.iconbtn svg { width: 15px; height: 15px; }
.kp-newreq {
  display: block; width: calc(100% - 24px); margin: 0 12px 6px; height: 30px;
  background: var(--accent, #29b6f6); color: #fff; border: none; border-radius: 4px;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.kp-newreq:hover { filter: brightness(1.08); }
.kp-tabs { display: flex; gap: 18px; padding: 4px 14px 0; }
.kp-tab { padding: 7px 1px; font-size: 12.5px; cursor: pointer; color: var(--vscode-descriptionForeground, #999); border-bottom: 2px solid transparent; }
.kp-tab:hover { color: var(--vscode-sideBar-foreground, #ccc); }
.kp-tab.active { color: var(--vscode-sideBar-foreground, #fff); border-bottom-color: var(--accent, #29b6f6); }
.filterrow { padding: 9px 12px 7px; }
.filterrow input { width: 100%; }
.content { flex: 1; overflow-y: auto; padding-bottom: 24px; }
.node { padding: 7px 12px; cursor: pointer; }
.node:hover { background: rgba(128,128,128,0.15); }
.aline { display: flex; align-items: center; gap: 7px; min-width: 0; }
.aurl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--vscode-sideBar-foreground, #ccc); }
.atime { color: var(--vscode-descriptionForeground, #8f8f8f); font-size: 11px; margin-top: 2px; }
.mpill { flex: none; display: inline-block; padding: 0 6px; border-radius: 3px; font-size: 10px; font-weight: 700; line-height: 15px; color: #fff; letter-spacing: 0.3px; }
.ncount { color: var(--vscode-descriptionForeground, #999); font-size: 11px; flex: none; }
.envbadge { flex: none; display: inline-block; padding: 0 6px; border-radius: 9px; font-size: 9px; font-weight: 700; line-height: 14px; color: #fff; background: #2e7d32; }
.trow { display: flex; align-items: center; gap: 6px; padding: 7px 12px; cursor: pointer; }
.trow:hover { background: rgba(128,128,128,0.15); }
.trow .chev { flex: none; width: 14px; height: 16px; display: flex; align-items: center; justify-content: center; opacity: 0.7; }
.trow .chev svg { width: 11px; height: 11px; }
.trow .chev.hidden { visibility: hidden; }
.trow .nicon { flex: none; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; }
.trow .nicon svg { width: 13px; height: 13px; }
.tname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tsub { color: var(--vscode-descriptionForeground, #999); font-size: 11px; flex: none; }
.kp-hint { color: var(--vscode-descriptionForeground, #888); font-size: 12px; padding: 14px 12px; text-align: center; }
.kp-hint button { background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #fff); border: none; border-radius: 3px; padding: 4px 14px; cursor: pointer; font-size: 12px; margin-top: 8px; }
.menu { position: fixed; z-index: 999; min-width: 170px; background: var(--vscode-menu-background, #252526); border: 1px solid var(--vscode-menu-border, #454545); border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.45); padding: 4px; }
.menuitem { padding: 4px 12px; border-radius: 3px; cursor: pointer; font-size: 12px; color: var(--vscode-menu-foreground, #ccc); white-space: nowrap; }
.menuitem:hover { background: var(--vscode-menu-selectionBackground, #094771); color: var(--vscode-menu-selectionForeground, #fff); }
.menuitem.danger { color: #ef5350; }
.menusep { height: 1px; background: rgba(128,128,128,0.3); margin: 4px 6px; }
</style>
</head>
<body>
<div id="app"></div>
<script>
var vscode = acquireVsCodeApi();
var DATA = null;
var tab = 'activity';
var expanded = {};
var filter = '';
var menuEl = null;

var ACCENT = '#29b6f6';
var METHOD_COLORS = { GET: '#27ae60', POST: '#f39c12', PUT: '#2980b9', PATCH: '#8e44ad', DELETE: '#e74c3c', HEAD: '#7f8c8d', OPTIONS: '#16a085' };

var ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  folderplus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 10v6M9 13h6"/></svg>',
  import: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  env: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>',
  chevdown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  chevright: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2 4 13h6.5L10 22l9-11h-6.5L13 2Z"/></svg>'
};

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function timeAgo(ts) {
  var diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
  var days = Math.floor(diff / 86400000);
  if (days === 1) return 'yesterday';
  if (days < 30) return days + ' days ago';
  return new Date(ts).toLocaleDateString();
}
function pill(method) {
  var m = (method || 'GET').toUpperCase();
  return '<span class="mpill" style="background:' + (METHOD_COLORS[m] || '#7f8c8d') + '">' + esc(m) + '</span>';
}
function exec(cmd, args) { vscode.postMessage({ command: 'exec', cmd: cmd, args: args }); }

function filterNode(node, f) {
  if (node.type === 'folder') {
    if (node.name.toLowerCase().indexOf(f) > -1) return node;
    var items = [];
    node.items.forEach(function (it) {
      var m = filterNode(it, f);
      if (m) items.push(m);
    });
    if (items.length === 0) return null;
    return { type: 'folder', id: node.id, name: node.name, items: items };
  }
  return node.name.toLowerCase().indexOf(f) > -1 ? node : null;
}

function renderCollections() {
  var f = filter.trim().toLowerCase();
  var cols = DATA.collections;
  if (f) {
    cols = [];
    DATA.collections.forEach(function (col) {
      if (col.name.toLowerCase().indexOf(f) > -1) { cols.push(col); return; }
      var items = [];
      col.items.forEach(function (it) {
        var m = filterNode(it, f);
        if (m) items.push(m);
      });
      if (items.length) cols.push({ type: 'collection', id: col.id, name: col.name, count: col.count, items: items });
    });
  }
  if (cols.length === 0) {
    return '<div class="kp-hint">' + (filter ? 'No matches for "' + esc(filter) + '"' : 'No collections yet. Create one to get started.') +
      (filter ? '' : '<br><button data-empty-act="new-collection">New Collection</button>') + '</div>';
  }
  var html = '';
  cols.forEach(function (col) {
    var isOpen = !!expanded[col.id];
    html += '<div class="trow" data-kind="collection" data-id="' + esc(col.id) + '" data-name="' + esc(col.name) + '">' +
      '<span class="chev" data-act="chev">' + (isOpen ? ICONS.chevdown : ICONS.chevright) + '</span>' +
      '<span class="nicon" style="color:' + ACCENT + '">' + ICONS.bolt + '</span>' +
      '<span class="tname" style="flex:1">' + esc(col.name) + '</span><span class="tsub">' + col.count + '</span>' +
    '</div>';
    if (isOpen) html += renderItems(col.items, 1, col.id);
  });
  return html;
}

function renderItems(items, depth, cid) {
  var html = '';
  items.forEach(function (it) {
    var pad = 'padding-left:' + (12 + depth * 14) + 'px';
    if (it.type === 'folder') {
      var isOpen = !!expanded[it.id];
      html += '<div class="trow" data-kind="folder" data-id="' + esc(it.id) + '" data-cid="' + esc(cid) + '" data-name="' + esc(it.name) + '" style="' + pad + '">' +
        '<span class="chev" data-act="chev">' + (isOpen ? ICONS.chevdown : ICONS.chevright) + '</span>' +
        '<span class="nicon">' + ICONS.folder + '</span>' +
        '<span class="tname" style="flex:1">' + esc(it.name) + '</span>' +
      '</div>';
      if (isOpen) html += renderItems(it.items, depth + 1, cid);
    } else {
      html += '<div class="trow" data-kind="request" data-id="' + esc(it.id) + '" data-cid="' + esc(cid) + '" data-name="' + esc(it.name) + '" data-method="' + esc(it.method) + '" style="' + pad + '">' +
        '<span class="chev hidden"></span>' +
        pill(it.method) +
        '<span class="tname" style="flex:1">' + esc(it.name) + '</span>' +
      '</div>';
    }
  });
  return html;
}

function renderActivity() {
  var f = filter.trim().toLowerCase();
  var entries = DATA.activity;
  if (f) {
    entries = entries.filter(function (e) {
      return (e.name || '').toLowerCase().indexOf(f) > -1 || (e.url || '').toLowerCase().indexOf(f) > -1;
    });
  }
  if (entries.length === 0) return '<div class="kp-hint">' + (filter ? 'No matches for "' + esc(filter) + '"' : 'No activity yet. Send a request to see it here.') + '</div>';
  var html = '';
  entries.forEach(function (e) {
    html += '<div class="node" data-kind="activity" data-id="' + esc(e.id) + '" data-name="' + esc(e.name) + '">' +
      '<div class="aline">' + pill(e.method) + '<span class="aurl">' + esc(e.url || e.name) + '</span></div>' +
      '<div class="atime">' + esc(timeAgo(e.createdAt)) + '</div>' +
    '</div>';
  });
  return html;
}

function renderEnvs() {
  var f = filter.trim().toLowerCase();
  var envs = DATA.envs;
  if (f) envs = envs.filter(function (e) { return e.name.toLowerCase().indexOf(f) > -1; });
  if (envs.length === 0) return '<div class="kp-hint">No environments.</div>';
  var html = '';
  envs.forEach(function (e) {
    var isActive = e.id === DATA.activeEnvId;
    html += '<div class="node" data-kind="env" data-id="' + esc(e.id) + '" data-name="' + esc(e.name) + '">' +
      '<div class="aline">' +
        '<span class="nicon" style="color:' + ACCENT + '">' + ICONS.env + '</span>' +
        '<span class="aurl">' + esc(e.name) + '</span>' +
        (e.type === 'e' ? '<span class="tsub">' + e.varCount + ' vars</span>' : '') +
        (isActive ? '<span class="envbadge">ACTIVE</span>' : '') +
      '</div>' +
    '</div>';
  });
  return html;
}

function renderContent() {
  var box = $('#content');
  if (!box) return;
  if (!DATA) { box.innerHTML = ''; return; }
  var html;
  if (tab === 'collections') html = renderCollections();
  else if (tab === 'activity') html = renderActivity();
  else html = renderEnvs();
  box.innerHTML = html;
  bindContent();
}

function iconBtnHtml(icon, title, act, val) {
  return '<button class="iconbtn" data-act="' + act + '" data-val="' + esc(val || '') + '" title="' + title + '">' + ICONS[icon] + '</button>';
}

function renderChrome() {
  var actions = '';
  if (tab === 'collections') {
    actions = iconBtnHtml('folderplus', 'New Collection', 'cmd', 'kangpos.new-collection') +
      iconBtnHtml('import', 'Import', 'cmd', 'kangpos.import');
  } else if (tab === 'env') {
    actions = iconBtnHtml('plus', 'New Environment', 'newenv', '');
  }
  var tabs =
    '<div class="kp-tab' + (tab === 'activity' ? ' active' : '') + '" data-tab="activity">Activity</div>' +
    '<div class="kp-tab' + (tab === 'collections' ? ' active' : '') + '" data-tab="collections">Collections</div>' +
    '<div class="kp-tab' + (tab === 'env' ? ' active' : '') + '" data-tab="env">Env</div>';
  var placeholder = tab === 'collections' ? 'filter collections' : tab === 'activity' ? 'filter activity' : 'filter envs';
  $('#app').innerHTML =
    '<div class="kp-head">' +
      '<span class="kp-logo">' + ICONS.bolt + '</span>' +
      '<span class="kp-title">Kangpos</span>' +
      '<span class="kp-spacer"></span>' + actions +
    '</div>' +
    '<button class="kp-newreq" data-act="cmd" data-val="kangpos.new-request">New Request</button>' +
    '<div class="kp-tabs">' + tabs + '</div>' +
    '<div class="filterrow">' +
      '<input id="filterInput" placeholder="' + placeholder + '" value="' + esc(filter) + '">' +
    '</div>' +
    '<div class="content" id="content"></div>';
  $all('.kp-tab').forEach(function (el) {
    el.addEventListener('click', function () {
      tab = el.getAttribute('data-tab');
      filter = '';
      renderChrome();
      renderContent();
    });
  });
  var fi = $('#filterInput');
  fi.addEventListener('input', function (e) {
    filter = e.target.value;
    renderContent();
  });
  $all('[data-act="cmd"]').forEach(function (el) {
    el.addEventListener('click', function () { exec(el.getAttribute('data-val'), undefined); });
  });
  $all('[data-act="newenv"]').forEach(function (el) {
    el.addEventListener('click', function () { vscode.postMessage({ command: 'new-env' }); });
  });
  renderContent();
}

function bindContent() {
  $all('#content .trow').forEach(function (row) {
    var kind = row.getAttribute('data-kind');
    var id = row.getAttribute('data-id');
    var chev = row.querySelector('[data-act="chev"]');
    if (chev) chev.addEventListener('click', function (e) {
      e.stopPropagation();
      expanded[id] = !expanded[id];
      renderContent();
    });
    if (kind === 'collection' || kind === 'folder') {
      row.addEventListener('click', function () {
        expanded[id] = !expanded[id];
        renderContent();
      });
    } else if (kind === 'request') {
      row.addEventListener('click', function () {
        exec('kangpos.open-request', { collectionId: row.getAttribute('data-cid') || findCollectionId(id), requestId: id });
      });
    } else if (kind === 'env') {
      row.addEventListener('click', function () { exec('kangpos.manage-envs', undefined); });
    }
    row.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showMenu(e, row);
    });
  });
  $all('#content .node[data-kind="activity"]').forEach(function (row) {
    row.addEventListener('click', function () { exec('kangpos.open-activity', row.getAttribute('data-id')); });
    row.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showMenu(e, row);
    });
  });
  $all('#content .node[data-kind="env"]').forEach(function (row) {
    row.addEventListener('click', function () { exec('kangpos.manage-envs', undefined); });
    row.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showMenu(e, row);
    });
  });
  var emptyBtn = $('[data-empty-act="new-collection"]');
  if (emptyBtn) emptyBtn.addEventListener('click', function () { exec('kangpos.new-collection', undefined); });
}

function findCollectionId(requestId) {
  var found = null;
  DATA.collections.forEach(function (col) {
    var walk = function (items) {
      items.forEach(function (it) {
        if (it.id === requestId) found = col.id;
        if (it.type === 'folder') walk(it.items);
      });
    };
    walk(col.items);
  });
  return found || '';
}

function hideMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; }
}

function menuItem(label, cmd, args, danger) {
  return '<div class="menuitem' + (danger ? ' danger' : '') + '" data-cmd="' + esc(cmd) + '" data-args="' + esc(JSON.stringify(args)) + '">' + label + '</div>';
}

function showMenu(e, row) {
  hideMenu();
  var kind = row.getAttribute('data-kind');
  var id = row.getAttribute('data-id');
  var name = row.getAttribute('data-name') || '';
  var cid = row.getAttribute('data-cid') || findCollectionId(id);
  var html = '';
  if (kind === 'collection') {
    html += menuItem('New Request', 'kangpos.new-request-in', { collectionId: id, folderId: null });
    html += menuItem('New Folder', 'kangpos.new-folder-in', { collectionId: id, folderId: null });
    html += '<div class="menusep"></div>';
    html += menuItem('Run Collection', 'kangpos.run-collection', { collectionId: id });
    html += '<div class="menusep"></div>';
    html += menuItem('Rename', 'kangpos.rename-item', { collectionId: id, id: id });
    html += menuItem('Duplicate', 'kangpos.duplicate-item', { collectionId: id, id: id });
    html += menuItem('Export', 'kangpos.export-collection', { collectionId: id });
    html += '<div class="menusep"></div>';
    html += menuItem('Delete', 'kangpos.delete-item', { collectionId: id, id: id, name: name }, true);
  } else if (kind === 'folder') {
    html += menuItem('New Request', 'kangpos.new-request-in', { collectionId: cid, folderId: id });
    html += menuItem('New Folder', 'kangpos.new-folder-in', { collectionId: cid, folderId: id });
    html += '<div class="menusep"></div>';
    html += menuItem('Rename', 'kangpos.rename-item', { collectionId: cid, id: id });
    html += menuItem('Duplicate', 'kangpos.duplicate-item', { collectionId: cid, id: id });
    html += '<div class="menusep"></div>';
    html += menuItem('Delete', 'kangpos.delete-item', { collectionId: cid, id: id, name: name }, true);
  } else if (kind === 'request') {
    html += menuItem('Send Request', 'kangpos.send-request', { collectionId: cid, requestId: id });
    html += '<div class="menusep"></div>';
    html += menuItem('Copy as cURL', 'kangpos.copy-curl', { requestId: id });
    html += menuItem('Generate Code', 'kangpos.generate-code', { requestId: id });
    html += '<div class="menusep"></div>';
    html += menuItem('Rename', 'kangpos.rename-item', { collectionId: cid, id: id });
    html += menuItem('Duplicate', 'kangpos.duplicate-item', { collectionId: cid, id: id });
    html += '<div class="menusep"></div>';
    html += menuItem('Delete', 'kangpos.delete-item', { collectionId: cid, id: id, name: name }, true);
  } else if (kind === 'activity') {
    html += menuItem('Open', 'kangpos.open-activity', id);
  } else if (kind === 'env') {
    if (id !== DATA.activeEnvId) html += menuItem('Set Active', '__setenv', { envId: id });
    html += menuItem('Manage Environments', 'kangpos.manage-envs', undefined);
  }
  menuEl = document.createElement('div');
  menuEl.className = 'menu';
  menuEl.innerHTML = html;
  document.body.appendChild(menuEl);
  var x = e.clientX, y = e.clientY;
  var rect = menuEl.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
  if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
  menuEl.style.left = x + 'px';
  menuEl.style.top = y + 'px';
  Array.prototype.slice.call(menuEl.querySelectorAll('.menuitem')).forEach(function (el) {
    el.addEventListener('click', function () {
      var cmd = el.getAttribute('data-cmd');
      var args = JSON.parse(el.getAttribute('data-args') || 'null');
      hideMenu();
      if (cmd === '__setenv') vscode.postMessage({ command: 'set-env', envId: args.envId });
      else exec(cmd, args);
    });
  });
}

document.addEventListener('click', function (e) {
  if (menuEl && !menuEl.contains(e.target)) hideMenu();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') hideMenu();
});

window.addEventListener('message', function (event) {
  var msg = event.data;
  if (msg.command === 'data') {
    DATA = msg.data;
    if (DATA.accent) {
      ACCENT = DATA.accent;
      document.documentElement.style.setProperty('--accent', ACCENT);
    }
    if (DATA.collections.length > 0 && Object.keys(expanded).length === 0) {
      DATA.collections.forEach(function (col) { expanded[col.id] = true; });
    }
    renderContent();
  }
});

renderChrome();
</script>
</body>
</html>`;
}
