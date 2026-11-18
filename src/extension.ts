import * as vscode from 'vscode';
import * as fs from 'fs';
import { Store, setStore, store } from './data/store';
import { CollectionTreeProvider, CollectionNode } from './providers/collectionTree';
import { ActivityTreeProvider } from './providers/activityTree';
import { RequestPanelManager, importCurlFlow } from './providers/requestPanel';
import { EnvPanel } from './providers/envPanel';
import { ReportPanel } from './providers/reportPanel';
import { runCollection } from './data/runCollection';
import { importKangpos, importPostman, exportKangpos } from './data/importer';
import { generateCode, generateCurl, CODEGEN_LANGUAGES } from './utils/codegen';
import { newRequest, uid } from './utils/utils';
import { KangposCollection } from './types';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const appStore = new Store(context);
  await appStore.init();
  setStore(appStore);

  const collectionProvider = new CollectionTreeProvider(appStore);
  const activityProvider = new ActivityTreeProvider(appStore);
  const panelManager = new RequestPanelManager();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('kangpos-collections', collectionProvider),
    vscode.window.registerTreeDataProvider('kangpos-activity', activityProvider)
  );

  const resolve = (node: unknown): CollectionNode | undefined => collectionProvider.resolve(node);

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
    const p = payload as { collectionId?: string; requestId?: string } | undefined;
    if (p && p.collectionId && p.requestId) {
      void panelManager.openSaved(p.collectionId, p.requestId);
    }
  });

  register('kangpos.open-activity', (activityId?: unknown) => {
    if (typeof activityId === 'string' && activityId) {
      void panelManager.openActivity(activityId);
    }
  });

  register('kangpos.send-request', (node?: unknown) => {
    const resolved = resolve(node);
    if (resolved && resolved.kind === 'request' && resolved.request) {
      void panelManager.open({
        request: resolved.request,
        requestId: resolved.id,
        collectionId: resolved.collectionId,
        collectionName: (appStore.getCollection(resolved.collectionId) || { name: '' }).name,
        autoSend: true
      });
    }
  });

  register('kangpos.run-collection', async (node?: unknown) => {
    const resolved = resolve(node);
    const col = resolved && resolved.kind === 'collection' ? appStore.getCollection(resolved.id) : await pickCollection(appStore);
    if (!col) {
      void vscode.window.showInformationMessage('Kangpos: No collection selected');
      return;
    }
    const mode = await vscode.window.showQuickPick(['Sequential', 'Parallel'], { placeHolder: 'Run mode' });
    if (!mode) return;
    const report = await runCollection(col._id, mode === 'Parallel');
    if (report) ReportPanel.show(report);
  });

  register('kangpos.export-collection', async (node?: unknown) => {
    const resolved = resolve(node);
    const col = resolved && resolved.kind === 'collection' ? appStore.getCollection(resolved.id) : await pickCollection(appStore);
    if (!col) return;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(col.name.replace(/[^\w\-]+/g, '_') + '.kangpos.json')
    });
    if (!uri) return;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportKangpos([col]), null, 2), 'utf8'));
    void vscode.window.showInformationMessage('Kangpos: Collection exported to ' + uri.fsPath);
  });

  register('kangpos.new-request-in', (node?: unknown) => {
    const resolved = resolve(node);
    if (resolved) void collectionProvider.newRequestIn(resolved);
  });

  register('kangpos.new-folder-in', (node?: unknown) => {
    const resolved = resolve(node);
    if (resolved) void collectionProvider.newFolderIn(resolved);
  });

  register('kangpos.rename-item', async (node?: unknown) => {
    const resolved = resolve(node);
    if (!resolved) return;
    const name = await vscode.window.showInputBox({ prompt: 'Rename', value: resolved.name });
    if (name) appStore.renameItem(resolved.collectionId, resolved.id, name);
  });

  register('kangpos.duplicate-item', (node?: unknown) => {
    const resolved = resolve(node);
    if (resolved) appStore.duplicateItem(resolved.collectionId, resolved.id);
  });

  register('kangpos.delete-item', async (node?: unknown) => {
    const resolved = resolve(node);
    if (!resolved) return;
    const confirm = await vscode.window.showWarningMessage('Delete "' + resolved.name + '"?', { modal: true }, 'Delete');
    if (confirm === 'Delete') appStore.deleteItem(resolved.collectionId, resolved.id);
  });

  register('kangpos.copy-curl', (node?: unknown) => {
    const resolved = resolve(node);
    if (resolved && resolved.kind === 'request' && resolved.request) {
      void vscode.env.clipboard.writeText(generateCurl(resolved.request));
      void vscode.window.showInformationMessage('Kangpos: cURL copied to clipboard');
    }
  });

  register('kangpos.generate-code', async (node?: unknown) => {
    const resolved = resolve(node);
    if (!resolved || resolved.kind !== 'request' || !resolved.request) return;
    const lang = await vscode.window.showQuickPick(CODEGEN_LANGUAGES.map(l => ({ label: l.label, id: l.id })), { placeHolder: 'Select language' });
    if (!lang) return;
    const code = generateCode(lang.id, resolved.request);
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
