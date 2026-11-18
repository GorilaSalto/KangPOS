import * as vscode from 'vscode';
import * as fs from 'fs';
import { Store, setStore, store } from './data/store';
import { KangposSidebar } from './providers/sidebar';
import { RequestPanelManager, importCurlFlow } from './providers/requestPanel';
import { EnvPanel } from './providers/envPanel';
import { ReportPanel } from './providers/reportPanel';
import { runCollection } from './data/runCollection';
import { importKangpos, importPostman, exportKangpos } from './data/importer';
import { generateCode, generateCurl, CODEGEN_LANGUAGES } from './utils/codegen';
import { newRequest, uid } from './utils/utils';
import { CollectionItem, KangposCollection, KangposFolder, KangposRequest } from './types';

interface ItemPayload {
  collectionId?: string;
  folderId?: string | null;
  id?: string;
  requestId?: string;
  name?: string;
}

function asPayload(arg: unknown): ItemPayload {
  if (arg && typeof arg === 'object' && !Array.isArray(arg)) return arg as ItemPayload;
  return {};
}

function isFolder(item: CollectionItem): item is KangposFolder {
  return (item as KangposFolder).type === 'folder';
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const appStore = new Store(context);
  await appStore.init();
  setStore(appStore);

  const panelManager = new RequestPanelManager();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(KangposSidebar.viewId, new KangposSidebar(context), {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  const register = (id: string, handler: (...args: unknown[]) => unknown): void => {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, (...args: unknown[]) => {
        return handler(...args);
      })
    );
  };

  register('kangpos.new-request', () => panelManager.open({ request: newRequest('New Request') }));

  register('kangpos.new-collection', async () => {
    const name = await vscode.window.showInputBox({ prompt: 'Collection name', value: 'My Collection' });
    if (name) appStore.newCollection(name);
  });

  register('kangpos.import', () => importFlow(appStore));

  register('kangpos.import-curl', () => importCurlFlow());

  register('kangpos.manage-envs', () => EnvPanel.show());

  register('kangpos.select-env', () => selectEnvFlow(appStore));

  register('kangpos.re-run', () => panelManager.rerun());

  register('kangpos.open-request', (payload?: unknown) => {
    const p = asPayload(payload);
    if (p.collectionId && p.requestId) {
      void panelManager.openSaved(p.collectionId, p.requestId);
    }
  });

  register('kangpos.open-activity', (activityId?: unknown) => {
    if (typeof activityId === 'string' && activityId) {
      void panelManager.openActivity(activityId);
    }
  });

  register('kangpos.send-request', async (payload?: unknown) => {
    const p = asPayload(payload);
    if (p.collectionId && p.requestId) {
      await panelManager.openSaved(p.collectionId, p.requestId, true);
      return;
    }
    const found = await pickRequest(appStore);
    if (found) await panelManager.openSaved(found.collectionId, found.requestId, true);
  });

  register('kangpos.run-collection', async (payload?: unknown) => {
    const p = asPayload(payload);
    const col = p.collectionId ? appStore.getCollection(p.collectionId) : await pickCollection(appStore);
    if (!col) {
      void vscode.window.showInformationMessage('Kangpos: No collection selected');
      return;
    }
    const mode = await vscode.window.showQuickPick(['Sequential', 'Parallel'], { placeHolder: 'Run mode' });
    if (!mode) return;
    const report = await runCollection(col._id, mode === 'Parallel');
    if (report) ReportPanel.show(report);
  });

  register('kangpos.export-collection', async (payload?: unknown) => {
    const p = asPayload(payload);
    const col = p.collectionId ? appStore.getCollection(p.collectionId) : await pickCollection(appStore);
    if (!col) return;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(col.name.replace(/[^\w\-]+/g, '_') + '.kangpos.json')
    });
    if (!uri) return;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportKangpos([col]), null, 2), 'utf8'));
    void vscode.window.showInformationMessage('Kangpos: Collection exported to ' + uri.fsPath);
  });

  register('kangpos.new-request-in', async (payload?: unknown) => {
    const p = asPayload(payload);
    const col = p.collectionId ? appStore.getCollection(p.collectionId) : await pickCollection(appStore);
    if (!col) return;
    const name = await vscode.window.showInputBox({ prompt: 'Request name', value: 'New Request' });
    if (name === undefined) return;
    const req = newRequest(name);
    appStore.addRequest(col._id, p.folderId || null, req);
    await panelManager.open({ request: req, requestId: req._id, collectionId: col._id, collectionName: col.name });
  });

  register('kangpos.new-folder-in', async (payload?: unknown) => {
    const p = asPayload(payload);
    const col = p.collectionId ? appStore.getCollection(p.collectionId) : await pickCollection(appStore);
    if (!col) return;
    const name = await vscode.window.showInputBox({ prompt: 'Folder name', value: 'New Folder' });
    if (!name) return;
    const folder: KangposFolder = { _id: uid(), type: 'folder', name, items: [] };
    let items = col.items;
    if (p.folderId) {
      const loc = appStore.locateInCollection(col, p.folderId);
      if (loc && isFolder(loc.parentItems[loc.index])) items = (loc.parentItems[loc.index] as KangposFolder).items;
    }
    items.push(folder);
    appStore.persistCollections();
  });

  register('kangpos.rename-item', async (payload?: unknown) => {
    const p = asPayload(payload);
    if (!p.collectionId || !p.id) return;
    const col = appStore.getCollection(p.collectionId);
    if (!col) return;
    let current = col.name;
    if (col._id !== p.id) {
      const loc = appStore.locateInCollection(col, p.id);
      if (loc) current = loc.parentItems[loc.index].name;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Rename', value: current });
    if (name) appStore.renameItem(p.collectionId, p.id, name);
  });

  register('kangpos.duplicate-item', (payload?: unknown) => {
    const p = asPayload(payload);
    if (!p.collectionId || !p.id) return;
    appStore.duplicateItem(p.collectionId, p.id);
  });

  register('kangpos.delete-item', async (payload?: unknown) => {
    const p = asPayload(payload);
    if (!p.collectionId || !p.id) return;
    const name = p.name || 'this item';
    const confirm = await vscode.window.showWarningMessage('Delete "' + name + '"?', { modal: true }, 'Delete');
    if (confirm === 'Delete') appStore.deleteItem(p.collectionId, p.id);
  });

  register('kangpos.copy-curl', async (payload?: unknown) => {
    const p = asPayload(payload);
    let req: KangposRequest | undefined;
    if (p.requestId) {
      req = appStore.getRequest(p.requestId)?.request;
    } else {
      const found = await pickRequest(appStore);
      req = found ? appStore.getRequest(found.requestId)?.request : undefined;
    }
    if (!req) return;
    await vscode.env.clipboard.writeText(generateCurl(req));
    void vscode.window.showInformationMessage('Kangpos: cURL copied to clipboard');
  });

  register('kangpos.generate-code', async (payload?: unknown) => {
    const p = asPayload(payload);
    let req: KangposRequest | undefined;
    if (p.requestId) {
      req = appStore.getRequest(p.requestId)?.request;
    } else {
      const found = await pickRequest(appStore);
      req = found ? appStore.getRequest(found.requestId)?.request : undefined;
    }
    if (!req) return;
    const lang = await vscode.window.showQuickPick(CODEGEN_LANGUAGES.map(l => ({ label: l.label, id: l.id })), { placeHolder: 'Select language' });
    if (!lang) return;
    const code = generateCode(lang.id, req);
    const doc = await vscode.workspace.openTextDocument({ content: code });
    await vscode.window.showTextDocument(doc);
  });

  register('kangpos.clear-activity', () => appStore.clearActivity());
}

async function pickCollection(appStore: Store): Promise<KangposCollection | undefined> {
  if (appStore.collections.length === 0) return undefined;
  const picks = appStore.collections.map(c => ({ label: c.name, description: appStore.listRequests(c._id).length + ' requests', id: c._id }));
  const chosen = await vscode.window.showQuickPick(picks, { placeHolder: 'Select collection' });
  return chosen ? appStore.getCollection(chosen.id) : undefined;
}

async function pickRequest(appStore: Store): Promise<{ collectionId: string; requestId: string } | undefined> {
  const picks: { label: string; description: string; collectionId: string; requestId: string }[] = [];
  for (const c of appStore.collections) {
    for (const r of appStore.listRequests(c._id)) {
      picks.push({ label: r.request.name || r.request.url, description: r.request.method + ' · ' + c.name, collectionId: c._id, requestId: r.request._id });
    }
  }
  if (picks.length === 0) return undefined;
  const chosen = await vscode.window.showQuickPick(picks, { placeHolder: 'Select request' });
  return chosen ? { collectionId: chosen.collectionId, requestId: chosen.requestId } : undefined;
}

async function selectEnvFlow(appStore: Store): Promise<void> {
  const picks = appStore.environments.map(e => ({ label: e.name, description: e.type === 'g' ? 'global' : e.variables.length + ' variables', id: e._id }));
  const chosen = await vscode.window.showQuickPick(picks, { placeHolder: 'Set active environment' });
  if (chosen) appStore.setActiveEnv(chosen.id);
}

async function importFlow(appStore: Store): Promise<void> {
  const type = await vscode.window.showQuickPick(
    [
      { label: '$(cloud) Postman Collection (v2.1)', id: 'postman' },
      { label: '$(terminal) cURL Command', id: 'curl' },
      { label: '$(json) Kangpos JSON', id: 'kangpos' }
    ],
    { placeHolder: 'Import type' }
  );
  if (!type) return;
  if (type.id === 'curl') {
    await vscode.commands.executeCommand('kangpos.import-curl');
    return;
  }
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: type.id === 'postman' ? { 'Postman Collection': ['json'] } : { 'Kangpos Collection': ['json'] }
  });
  if (!uris || uris.length === 0) return;
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(uris[0].fsPath, 'utf8'));
  } catch (e) {
    void vscode.window.showErrorMessage('Kangpos: Invalid JSON file - ' + (e instanceof Error ? e.message : String(e)));
    return;
  }
  const collections = type.id === 'postman' ? importPostman(json) : importKangpos(json);
  if (collections.length === 0) {
    void vscode.window.showErrorMessage('Kangpos: Nothing to import from this file');
    return;
  }
  for (const col of collections) {
    col._id = uid();
    appStore.collections.push(col);
  }
  appStore.persistCollections();
  void vscode.window.showInformationMessage('Kangpos: Imported ' + collections.length + ' collection(s)');
}

export function deactivate(): void {
  void store;
}
