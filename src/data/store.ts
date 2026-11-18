import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ActivityEntry, CollectionItem, KangposCollection, KangposEnv, KangposFolder, KangposRequest, KV } from '../types';
import { deepClone, newRequest, uid } from '../utils/utils';

interface FindResult {
  collection: KangposCollection;
  parentItems: CollectionItem[];
  index: number;
}

function isFolder(item: CollectionItem): item is KangposFolder {
  return (item as KangposFolder).type === 'folder';
}

export class Store {
  private ctx: vscode.ExtensionContext;
  private emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;
  collections: KangposCollection[] = [];
  environments: KangposEnv[] = [];
  activity: ActivityEntry[] = [];
  activeEnvId = 'g';

  constructor(ctx: vscode.ExtensionContext) {
    this.ctx = ctx;
  }

  async init(): Promise<void> {
    try {
      fs.mkdirSync(this.dataDir(), { recursive: true });
    } catch {
      // directory may already exist
    }
    this.collections = this.readJson<{ collections: KangposCollection[] }>(this.collectionsPath(), { collections: [] }).collections || [];
    const envData = this.readJson<{ environments: KangposEnv[]; activeEnvId: string }>(this.environmentsPath(), { environments: [], activeEnvId: 'g' });
    this.environments = envData.environments || [];
    this.activeEnvId = envData.activeEnvId || 'g';
    this.activity = this.readJson<{ activity: ActivityEntry[] }>(this.activityPath(), { activity: [] }).activity || [];
    if (!this.environments.find(e => e._id === 'g')) {
      this.environments.unshift({ _id: 'g', name: 'Global', type: 'g', variables: [] });
      this.saveEnvironments();
    }
    if (!this.activeEnvId || !this.environments.find(e => e._id === this.activeEnvId)) {
      this.activeEnvId = 'g';
      this.saveEnvironments();
    }
  }

  private readJson<T>(p: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson(p: string, data: unknown): void {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      void e;
    }
  }

  dataDir(): string {
    const wsStorage = vscode.workspace.getConfiguration('kangpos').get<boolean>('workspaceStorage', false);
    if (wsStorage && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.kangpos');
    }
    return this.ctx.globalStorageUri.fsPath;
  }

  collectionsPath(): string {
    return path.join(this.dataDir(), 'collections.json');
  }

  environmentsPath(): string {
    return path.join(this.dataDir(), 'environments.json');
  }

  activityPath(): string {
    return path.join(this.dataDir(), 'activity.json');
  }

  private saveCollections(): void {
    this.writeJson(this.collectionsPath(), { collections: this.collections });
  }

  private saveEnvironments(): void {
    this.writeJson(this.environmentsPath(), { environments: this.environments, activeEnvId: this.activeEnvId });
  }

  private saveActivity(): void {
    this.writeJson(this.activityPath(), { activity: this.activity });
  }

  private emit(): void {
    this.emitter.fire();
  }

  getCollection(id: string): KangposCollection | undefined {
    return this.collections.find(c => c._id === id);
  }

  newCollection(name: string): KangposCollection {
    const col: KangposCollection = { _id: uid(), name, items: [], createdAt: Date.now(), envVars: [] };
    this.collections.push(col);
    this.saveCollections();
    this.emit();
    return col;
  }

  deleteCollection(id: string): void {
    this.collections = this.collections.filter(c => c._id !== id);
    this.saveCollections();
    this.emit();
  }

  renameCollection(id: string, name: string): void {
    const col = this.getCollection(id);
    if (col) col.name = name;
    this.saveCollections();
    this.emit();
  }

  locateInCollection(col: KangposCollection, id: string): FindResult | null {
    return this.locate(col.items, col, id, null);
  }

  persistCollections(): void {
    this.saveCollections();
    this.emit();
  }

  private locate(items: CollectionItem[], collection: KangposCollection, id: string, parentItems: CollectionItem[] | null): FindResult | null {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item._id === id) {
        return { collection, parentItems: parentItems || items, index: i };
      }
      if (isFolder(item)) {
        const found = this.locate(item.items, collection, id, items);
        if (found) return found;
      }
    }
    return null;
  }

  locateRequest(id: string): FindResult | null {
    for (const col of this.collections) {
      const found = this.locate(col.items, col, id, null);
      if (found) return found;
    }
    return null;
  }

  getRequest(id: string): { request: KangposRequest; collectionId: string; collectionName: string } | null {
    const found = this.locateRequest(id);
    if (!found || isFolder(found.parentItems[found.index])) return null;
    return {
      request: found.parentItems[found.index] as KangposRequest,
      collectionId: found.collection._id,
      collectionName: found.collection.name
    };
  }

  addRequest(collectionId: string, folderId: string | null, request: KangposRequest): void {
    const col = this.getCollection(collectionId);
    if (!col) return;
    let items = col.items;
    if (folderId) {
      const located = this.locate(col.items, col, folderId, null);
      if (located && isFolder(located.parentItems[located.index])) {
        items = (located.parentItems[located.index] as KangposFolder).items;
      }
    }
    items.push(request);
    this.saveCollections();
    this.emit();
  }

  updateRequest(request: KangposRequest): void {
    const found = this.locateRequest(request._id);
    if (found && !isFolder(found.parentItems[found.index])) {
      found.parentItems[found.index] = deepClone(request);
      this.saveCollections();
      this.emit();
    }
  }

  renameItem(collectionId: string, itemId: string, name: string): void {
    const col = this.getCollection(collectionId);
    if (!col) return;
    if (col._id === itemId) {
      col.name = name;
    } else {
      const located = this.locate(col.items, col, itemId, null);
      if (located) located.parentItems[located.index].name = name;
    }
    this.saveCollections();
    this.emit();
  }

  deleteItem(collectionId: string, itemId: string): void {
    const col = this.getCollection(collectionId);
    if (!col) return;
    if (col._id === itemId) {
      this.deleteCollection(itemId);
      return;
    }
    const located = this.locate(col.items, col, itemId, null);
    if (located) {
      located.parentItems.splice(located.index, 1);
      this.saveCollections();
      this.emit();
    }
  }

  duplicateItem(collectionId: string, itemId: string): void {
    const col = this.getCollection(collectionId);
    if (!col) return;
    if (col._id === itemId) {
      const clone: KangposCollection = {
        _id: uid(),
        name: col.name + ' copy',
        items: this.regenerateIds(col.items),
        createdAt: Date.now(),
        envVars: deepClone(col.envVars)
      };
      this.collections.push(clone);
      this.saveCollections();
      this.emit();
      return;
    }
    const located = this.locate(col.items, col, itemId, null);
    if (!located) return;
    const item = located.parentItems[located.index];
    const clone = isFolder(item)
      ? { _id: uid(), type: 'folder' as const, name: item.name + ' copy', items: this.regenerateIds(item.items) }
      : { ...(deepClone(item) as KangposRequest), _id: uid(), name: item.name + ' copy' };
    located.parentItems.splice(located.index + 1, 0, clone);
    this.saveCollections();
    this.emit();
  }

  private regenerateIds(items: CollectionItem[]): CollectionItem[] {
    return items.map(item => {
      if (isFolder(item)) {
        return { _id: uid(), type: 'folder' as const, name: item.name, items: this.regenerateIds(item.items) };
      }
      return { ...(deepClone(item) as KangposRequest), _id: uid() };
    });
  }

  moveItem(draggedIds: string[], target: { collectionId: string; parentId?: string | null; afterId?: string | null }): void {
    for (const id of draggedIds) {
      if (target.parentId && (id === target.parentId || this.isDescendant(id, target.parentId))) continue;
      let item: CollectionItem | null = null;
      for (const col of this.collections) {
        const located = this.locate(col.items, col, id, null);
        if (located) {
          item = located.parentItems[located.index];
          located.parentItems.splice(located.index, 1);
          break;
        }
      }
      if (!item) continue;
      const col = this.getCollection(target.collectionId);
      if (!col) continue;
      let parentItems: CollectionItem[] = col.items;
      if (target.parentId) {
        const located = this.locate(col.items, col, target.parentId, null);
        if (located && isFolder(located.parentItems[located.index])) {
          parentItems = (located.parentItems[located.index] as KangposFolder).items;
        }
      }
      let insertIndex = parentItems.length;
      if (target.afterId) {
        const idx = parentItems.findIndex(i => i._id === target.afterId);
        if (idx > -1) insertIndex = idx + 1;
      }
      parentItems.splice(insertIndex, 0, item);
    }
    this.saveCollections();
    this.emit();
  }

  private isDescendant(ancestorId: string, maybeDescendantId: string): boolean {
    const check = (items: CollectionItem[], inside: boolean): boolean => {
      for (const item of items) {
        if (inside && item._id === maybeDescendantId) return true;
        if (item._id === ancestorId) {
          if (isFolder(item) && check(item.items, true)) return true;
          continue;
        }
        if (isFolder(item) && check(item.items, inside)) return true;
      }
      return false;
    };
    for (const col of this.collections) {
      if (check(col.items, false)) return true;
    }
    return false;
  }

  listRequests(collectionId: string): { request: KangposRequest; folderName: string }[] {
    const col = this.getCollection(collectionId);
    const result: { request: KangposRequest; folderName: string }[] = [];
    if (!col) return result;
    const walk = (items: CollectionItem[], folderName: string): void => {
      for (const item of items) {
        if (isFolder(item)) walk(item.items, folderName ? folderName + ' / ' + item.name : item.name);
        else result.push({ request: item, folderName });
      }
    };
    walk(col.items, '');
    return result;
  }

  listFolders(collectionId: string): { id: string; label: string }[] {
    const col = this.getCollection(collectionId);
    const result: { id: string; label: string }[] = [];
    if (!col) return result;
    const walk = (items: CollectionItem[], prefix: string): void => {
      for (const item of items) {
        if (isFolder(item)) {
          const label = prefix ? prefix + ' / ' + item.name : item.name;
          result.push({ id: item._id, label });
          walk(item.items, label);
        }
      }
    };
    walk(col.items, '');
    return result;
  }

  getGlobalEnv(): KangposEnv {
    return this.environments.find(e => e._id === 'g') || { _id: 'g', name: 'Global', type: 'g', variables: [] };
  }

  setActiveEnv(id: string): void {
    this.activeEnvId = this.environments.find(e => e._id === id) ? id : 'g';
    this.saveEnvironments();
    this.emit();
  }

  addEnv(name: string): KangposEnv {
    const env: KangposEnv = { _id: uid(), name, type: 'e', variables: [] };
    this.environments.push(env);
    this.saveEnvironments();
    this.emit();
    return env;
  }

  deleteEnv(id: string): void {
    if (id === 'g') return;
    this.environments = this.environments.filter(e => e._id !== id);
    if (this.activeEnvId === id) this.activeEnvId = 'g';
    this.saveEnvironments();
    this.emit();
  }

  renameEnv(id: string, name: string): void {
    const env = this.environments.find(e => e._id === id);
    if (env) env.name = name;
    this.saveEnvironments();
    this.emit();
  }

  updateEnvVars(id: string, variables: KV[]): void {
    const env = this.environments.find(e => e._id === id);
    if (env) {
      env.variables = variables.map(v => ({ name: v.name, value: v.value }));
      this.saveEnvironments();
      this.emit();
    }
  }

  setVarInto(envId: string, name: string, value: string): void {
    const env = this.environments.find(e => e._id === envId);
    if (!env) return;
    const existing = env.variables.find(v => v.name === name);
    if (existing) existing.value = value;
    else env.variables.push({ name, value });
    this.saveEnvironments();
    this.emit();
  }

  variablesFor(collectionId?: string): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const v of this.getGlobalEnv().variables) {
      if (v.name) vars[v.name] = v.value;
    }
    const active = this.environments.find(e => e._id === this.activeEnvId);
    if (active) {
      for (const v of active.variables) {
        if (v.name) vars[v.name] = v.value;
      }
    }
    if (collectionId) {
      const col = this.getCollection(collectionId);
      if (col) {
        for (const v of col.envVars || []) {
          if (v.name) vars[v.name] = v.value;
        }
      }
    }
    return vars;
  }

  addActivity(entry: ActivityEntry): void {
    const max = vscode.workspace.getConfiguration('kangpos').get<number>('maxActivity', 100);
    const save = vscode.workspace.getConfiguration('kangpos').get<boolean>('saveActivity', true);
    if (!save) return;
    this.activity.unshift(entry);
    if (this.activity.length > max) this.activity = this.activity.slice(0, max);
    this.saveActivity();
    this.emit();
  }

  clearActivity(): void {
    this.activity = [];
    this.saveActivity();
    this.emit();
  }

  getActivityEntry(id: string): ActivityEntry | undefined {
    return this.activity.find(a => a._id === id);
  }
}

export let store: Store;

export function setStore(s: Store): void {
  store = s;
}
