import * as vscode from 'vscode';
import { ActivityEntry } from '../types';
import { methodColor, timeAgo } from '../utils/utils';
import { store, Store } from '../data/store';

function methodIcon(method: string): { light: vscode.Uri; dark: vscode.Uri } {
  const color = methodColor(method);
  const short = method.length > 4 ? method.slice(0, 3) : method;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect x="1" y="3" width="14" height="10" rx="2.5" fill="' + color + '"/><text x="8" y="10.6" font-family="Menlo,Consolas,monospace" font-size="6.5" font-weight="bold" fill="#ffffff" text-anchor="middle">' + short.toUpperCase() + '</text></svg>';
  const uri = vscode.Uri.parse('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
  return { light: uri, dark: uri };
}

interface GroupNode {
  kind: 'group';
  label: string;
  entries: ActivityEntry[];
}

export class ActivityTreeProvider implements vscode.TreeDataProvider<GroupNode | ActivityEntry> {
  private emitter = new vscode.EventEmitter<GroupNode | ActivityEntry | undefined>();
  private itemMap = new WeakMap<vscode.TreeItem, GroupNode | ActivityEntry>();
  onDidChangeTreeData: vscode.Event<GroupNode | ActivityEntry | undefined> = this.emitter.event;

  constructor(private storeRef: Store) {
    storeRef.onDidChange(() => this.emitter.fire(undefined));
  }

  resolve(arg: unknown): ActivityEntry | GroupNode | undefined {
    if (arg instanceof vscode.TreeItem) return this.itemMap.get(arg);
    return undefined;
  }

  getTreeItem(node: GroupNode | ActivityEntry): vscode.TreeItem {
    if ('kind' in node && node.kind === 'group') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded);
      item.description = String(node.entries.length);
      item.contextValue = 'activity-group';
      this.itemMap.set(item, node);
      return item;
    }
    const entry = node as ActivityEntry;
    const item = new vscode.TreeItem(entry.name || entry.url, vscode.TreeItemCollapsibleState.None);
    item.description = entry.method + ' · ' + timeAgo(entry.createdAt);
    item.iconPath = methodIcon(entry.method);
    item.contextValue = 'activity-entry';
    item.tooltip = new vscode.MarkdownString('**' + entry.method + '** ' + entry.url + '\n\nStatus: ' + entry.status + ' · ' + Math.round(entry.timeMs) + ' ms');
    item.command = {
      command: 'kangpos.open-activity',
      title: 'Open',
      arguments: [entry._id]
    };
    this.itemMap.set(item, entry);
    return item;
  }

  getChildren(node?: GroupNode | ActivityEntry): (GroupNode | ActivityEntry)[] {
    if (!node) {
      const entries = this.storeRef.activity;
      if (entries.length === 0) return [];
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 86400000;
      const startOfWeek = startOfToday - 6 * 86400000;
      const groups: GroupNode[] = [
        { kind: 'group', label: 'Today', entries: [] },
        { kind: 'group', label: 'Yesterday', entries: [] },
        { kind: 'group', label: 'Previous 7 Days', entries: [] },
        { kind: 'group', label: 'Older', entries: [] }
      ];
      for (const entry of entries) {
        if (entry.createdAt >= startOfToday) groups[0].entries.push(entry);
        else if (entry.createdAt >= startOfYesterday) groups[1].entries.push(entry);
        else if (entry.createdAt >= startOfWeek) groups[2].entries.push(entry);
        else groups[3].entries.push(entry);
      }
      return groups.filter(g => g.entries.length > 0);
    }
    if ('kind' in node && node.kind === 'group') {
      return node.entries;
    }
    return [];
  }
}

export function getActivityEntry(id: string): ActivityEntry | undefined {
  return store.getActivityEntry(id);
}
