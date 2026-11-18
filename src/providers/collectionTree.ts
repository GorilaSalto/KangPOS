import * as vscode from 'vscode';
import { CollectionItem, KangposCollection, KangposFolder, KangposRequest } from '../types';
import { methodColor, newRequest, uid } from '../utils/utils';
import { store, Store } from '../data/store';

function isFolder(item: CollectionItem): item is KangposFolder {
  return (item as KangposFolder).type === 'folder';
}

export type NodeKind = 'collection' | 'folder' | 'request';

export class CollectionNode {
  kind: NodeKind;
  id: string;
  collectionId: string;
  parentId: string | null;
  name: string;
  request?: KangposRequest;
  folder?: KangposFolder;
  collection?: KangposCollection;

  constructor(init: { kind: NodeKind; id: string; collectionId: string; parentId: string | null; name: string; request?: KangposRequest; folder?: KangposFolder; collection?: KangposCollection }) {
    this.kind = init.kind;
    this.id = init.id;
    this.collectionId = init.collectionId;
    this.parentId = init.parentId;
    this.name = init.name;
    this.request = init.request;
    this.folder = init.folder;
    this.collection = init.collection;
  }
}

function methodIcon(method: string): { light: vscode.Uri; dark: vscode.Uri } {
  const color = methodColor(method);
  const short = method.length > 4 ? method.slice(0, 3) : method;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect x="1" y="3" width="14" height="10" rx="2.5" fill="' + color + '"/><text x="8" y="10.6" font-family="Menlo,Consolas,monospace" font-size="6.5" font-weight="bold" fill="#ffffff" text-anchor="middle">' + short.toUpperCase() + '</text></svg>';
  const uri = vscode.Uri.parse('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
  return { light: uri, dark: uri };
}

function collectionIcon(): { light: vscode.Uri; dark: vscode.Uri } {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect x="1" y="1" width="14" height="14" rx="3.5" fill="#0d9fd6"/><path d="M9.2 3.4 5.4 9.4h3.1l-.9 4.2 4.4-6.3H8.9l.9-3.9z" fill="#fff"/></svg>';
  const uri = vscode.Uri.parse('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
  return { light: uri, dark: uri };
}

export class CollectionTreeProvider implements vscode.TreeDataProvider<CollectionNode>, vscode.TreeDragAndDropController<CollectionNode> {
  private emitter = new vscode.EventEmitter<CollectionNode | undefined>();
  private itemMap = new WeakMap<vscode.TreeItem, CollectionNode>();
  dragMimeTypes = ['application/vnd.code.tree.kangpos-collections'];
  dropMimeTypes = ['application/vnd.code.tree.kangpos-collections'];
  onDidChangeTreeData: vscode.Event<CollectionNode | undefined> = this.emitter.event;

  constructor(private storeRef: Store) {
    storeRef.onDidChange(() => this.emitter.fire(undefined));
  }

  resolve(arg: unknown): CollectionNode | undefined {
    if (arg instanceof vscode.TreeItem) return this.itemMap.get(arg);
    return undefined;
  }

  getTreeItem(node: CollectionNode): vscode.TreeItem {
    let item: vscode.TreeItem;
    if (node.kind === 'collection') {
      const count = this.storeRef.listRequests(node.collectionId).length;
      item = new vscode.TreeItem(node.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.description = count + (count === 1 ? ' request' : ' requests');
      item.iconPath = collectionIcon();
      item.contextValue = 'collection';
      item.tooltip = node.name;
    } else if (node.kind === 'folder') {
      item = new vscode.TreeItem(node.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon('folder');
      item.contextValue = 'folder';
    } else {
      const req = node.request as KangposRequest;
      item = new vscode.TreeItem(req.name, vscode.TreeItemCollapsibleState.None);
      item.description = req.method;
      item.iconPath = methodIcon(req.method);
      item.tooltip = new vscode.MarkdownString('**' + req.method + '** ' + req.url);
      item.contextValue = 'request';
      item.command = {
        command: 'kangpos.open-request',
        title: 'Open Request',
        arguments: [{ collectionId: node.collectionId, requestId: req._id }]
      };
    }
    this.itemMap.set(item, node);
    return item;
  }

  getChildren(node?: CollectionNode): CollectionNode[] {
    if (!node) {
      return this.storeRef.collections.map(col => new CollectionNode({ kind: 'collection', id: col._id, collectionId: col._id, parentId: null, name: col.name, collection: col }));
    }
    if (node.kind === 'collection') {
      const col = this.storeRef.getCollection(node.collectionId);
      if (!col) return [];
      return col.items.map(item => this.itemNode(item, node.collectionId, node.id));
    }
    if (node.kind === 'folder' && node.folder) {
      return node.folder.items.map(item => this.itemNode(item, node.collectionId, node.id));
    }
    return [];
  }

  private itemNode(item: CollectionItem, collectionId: string, parentId: string): CollectionNode {
    if (isFolder(item)) {
      return new CollectionNode({ kind: 'folder', id: item._id, collectionId, parentId, name: item.name, folder: item });
    }
    return new CollectionNode({ kind: 'request', id: item._id, collectionId, parentId, name: item.name, request: item });
  }

  async handleDrag(source: readonly CollectionNode[], dataTransfer: vscode.DataTransfer): Promise<void> {
    dataTransfer.set('application/vnd.code.tree.kangpos-collections', new vscode.DataTransferItem(source.map(n => ({ kind: n.kind, id: n.id }))));
  }

  async handleDrop(target: CollectionNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const raw = dataTransfer.get('application/vnd.code.tree.kangpos-collections');
    if (!raw) return;
    const dragged = (raw.value || []) as { kind: NodeKind; id: string }[];
    if (!Array.isArray(dragged) || dragged.length === 0) return;
    if (dragged.some(d => d.kind === 'collection')) return;
    const ids = dragged.map(d => d.id);
    if (target && target.kind === 'request') {
      store.moveItem(ids, { collectionId: target.collectionId, parentId: target.parentId, afterId: target.id });
      return;
    }
    if (target && target.kind === 'folder') {
      store.moveItem(ids, { collectionId: target.collectionId, parentId: target.id });
      return;
    }
    if (target && target.kind === 'collection') {
      store.moveItem(ids, { collectionId: target.collectionId, parentId: null });
      return;
    }
    const firstCol = this.storeRef.collections[0];
    if (firstCol) store.moveItem(ids, { collectionId: firstCol._id, parentId: null });
  }

  async newRequestIn(node: CollectionNode): Promise<void> {
    const name = await vscode.window.showInputBox({ prompt: 'Request name', value: 'New Request' });
    if (name === undefined) return;
    const req = newRequest(name);
    const parentId = node.kind === 'folder' ? node.id : null;
    this.storeRef.addRequest(node.collectionId, parentId, req);
    await vscode.commands.executeCommand('kangpos.open-request', { collectionId: node.collectionId, requestId: req._id });
  }

  async newFolderIn(node: CollectionNode): Promise<void> {
    const name = await vscode.window.showInputBox({ prompt: 'Folder name', value: 'New Folder' });
    if (!name) return;
    const parentId = node.kind === 'folder' ? node.id : null;
    const col = this.storeRef.getCollection(node.collectionId);
    if (!col) return;
    const folder: KangposFolder = { _id: uid(), type: 'folder', name, items: [] };
    let items: CollectionItem[] = col.items;
    if (parentId) {
      const loc = this.storeRef.locateInCollection(col, parentId);
      if (loc && isFolder(loc.parentItems[loc.index])) {
        items = (loc.parentItems[loc.index] as KangposFolder).items;
      }
    }
    items.push(folder);
    this.storeRef.persistCollections();
    vscode.commands.executeCommand('kangpos-collections.refresh');
  }
}
