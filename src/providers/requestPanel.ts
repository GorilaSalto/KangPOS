import * as vscode from 'vscode';
import { ActivityEntry, KangposRequest } from '../types';
import { store } from '../data/store';
import { sendResolvedRequest } from '../data/runCollection';
import { accentColor, getRequestHtml, RequestUiMeta } from '../webview/requestUi';
import { deepClone, uid } from '../utils/utils';
import { generateCurl, generateCode, CODEGEN_LANGUAGES } from '../utils/codegen';
import { requestFromCurl } from '../data/importer';
import { EnvPanel } from './envPanel';

interface PanelMeta {
  requestId?: string;
  collectionId?: string;
  folderId?: string;
  collectionName?: string;
  saved: boolean;
}

interface PanelEntry {
  key: string;
  panel: vscode.WebviewPanel;
  model: KangposRequest;
  meta: PanelMeta;
}

export interface OpenOptions {
  request: KangposRequest;
  requestId?: string;
  collectionId?: string;
  folderId?: string;
  collectionName?: string;
  autoSend?: boolean;
}

export class RequestPanelManager {
  private panels = new Map<string, PanelEntry>();
  lastRequest: { model: KangposRequest; collectionId?: string; requestId?: string } | null = null;

  constructor() {
    store.onDidChange(() => this.broadcastEnvs());
  }

  async open(opts: OpenOptions): Promise<void> {
    const reuse = vscode.workspace.getConfiguration('kangpos').get<boolean>('reuseTab', true);
    if (reuse && opts.requestId) {
      for (const entry of this.panels.values()) {
        if (entry.meta.requestId === opts.requestId) {
          entry.model = deepClone(opts.request);
          if (opts.collectionId) entry.meta.collectionId = opts.collectionId;
          if (opts.collectionName) entry.meta.collectionName = opts.collectionName;
          entry.panel.reveal(undefined, !opts.autoSend);          entry.panel.title = this.panelTitle(entry);
          this.renderPanel(entry, !!opts.autoSend);
          if (opts.autoSend) void this.sendFromEntry(entry);
          return;
        }
      }
    }
    const entry = await this.createPanel(opts);
    if (opts.autoSend) void this.sendFromEntry(entry);
  }

  private panelTitle(entry: PanelEntry): string {
    const name = entry.model.name || 'New Request';
    return name + (entry.meta.collectionName ? '  ·  ' + entry.meta.collectionName : '  ·  Session');
  }

  private async createPanel(opts: OpenOptions): Promise<PanelEntry> {
    const panel = vscode.window.createWebviewPanel(
      'kangposRequest',
      (opts.request.name || 'New Request') + (opts.collectionName ? '  ·  ' + opts.collectionName : '  ·  Session'),
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: !opts.autoSend },
      { enableScripts: true, retainContextWhenHidden: true }
    );
    const key = uid();
    const entry: PanelEntry = {
      key,
      panel,
      model: deepClone(opts.request),
      meta: {
        requestId: opts.requestId,
        collectionId: opts.collectionId,
        folderId: opts.folderId,
        collectionName: opts.collectionName,
        saved: !!opts.requestId
      }
    };
    this.panels.set(key, entry);
    panel.onDidDispose(() => {
      this.panels.delete(key);
    });
    panel.webview.onDidReceiveMessage(msg => void this.onMessage(entry, msg));
    this.renderPanel(entry, !!opts.autoSend);
    return entry;
  }

  private metaForUi(entry: PanelEntry): RequestUiMeta {
    return {
      requestId: entry.meta.requestId,
      collectionId: entry.meta.collectionId,
      collectionName: entry.meta.collectionName,
      saved: entry.meta.saved,
      envs: store.environments.map(e => ({ id: e._id, name: e.name, type: e.type })),
      activeEnvId: store.activeEnvId
    };
  }

  private renderPanel(entry: PanelEntry, autoSend: boolean): void {
    entry.panel.title = this.panelTitle(entry);
    entry.panel.webview.html = getRequestHtml({
      model: entry.model,
      meta: this.metaForUi(entry),
      accent: accentColor(vscode.workspace.getConfiguration('kangpos').get<string>('theme', 'blue')),
      autoSend
    });
  }

  private broadcastEnvs(): void {
    for (const entry of this.panels.values()) {
      void entry.panel.webview.postMessage({
        command: 'envs',
        envs: store.environments.map(e => ({ id: e._id, name: e.name, type: e.type })),
        activeEnvId: store.activeEnvId
      });
    }
  }

  private async onMessage(entry: PanelEntry, msg: { command: string; [key: string]: unknown }): Promise<void> {
    switch (msg.command) {
      case 'send': {
        entry.model = this.mergeModel(entry.model, msg.model as KangposRequest);
        entry.panel.title = this.panelTitle(entry);
        await this.sendFromEntry(entry);
        break;
      }
      case 'save': {
        if (entry.meta.saved && entry.meta.requestId) {
          entry.model._id = entry.meta.requestId;
          store.updateRequest(entry.model);
          void vscode.window.showInformationMessage('Kangpos: Request saved');
        } else {
          await this.saveAs(entry);
        }
        break;
      }
      case 'save-as': {
        entry.model = this.mergeModel(entry.model, msg.model as KangposRequest);
        await this.saveAs(entry);
        break;
      }
      case 'copy-curl': {
        entry.model = this.mergeModel(entry.model, msg.model as KangposRequest);
        const curl = generateCurl(entry.model);
        await vscode.env.clipboard.writeText(curl);
        void vscode.window.showInformationMessage('Kangpos: cURL copied to clipboard');
        break;
      }
      case 'codegen': {
        entry.model = this.mergeModel(entry.model, msg.model as KangposRequest);
        const lang = await vscode.window.showQuickPick(CODEGEN_LANGUAGES.map(l => ({ label: l.label, id: l.id })), { placeHolder: 'Select language' });
        if (!lang) return;
        const code = generateCode(lang.id, entry.model);
        const doc = await vscode.workspace.openTextDocument({ content: code, language: lang.id === 'python' ? 'python' : lang.id === 'go' ? 'go' : lang.id === 'php' ? 'php' : lang.id === 'csharp' ? 'csharp' : 'javascript' });
        await vscode.window.showTextDocument(doc);
        break;
      }
      case 'save-response': {
        const base64 = typeof msg.base64 === 'string' ? msg.base64 : '';
        const name = typeof msg.name === 'string' && msg.name ? msg.name : 'response';
        if (!base64) {
          void vscode.window.showInformationMessage('Kangpos: No response to save');
          return;
        }
        const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(name.replace(/[^\w.\-]+/g, '_')) });
        if (!uri) return;
        await vscode.workspace.fs.writeFile(uri, Buffer.from(base64, 'base64'));
        void vscode.window.showInformationMessage('Kangpos: Response saved to ' + uri.fsPath);
        break;
      }
      case 'manage-envs': {
        EnvPanel.show();
        break;
      }
      case 'set-env': {
        if (typeof msg.envId === 'string') store.setActiveEnv(msg.envId);
        break;
      }
      default:
        break;
    }
  }

  private mergeModel(current: KangposRequest, incoming: Partial<KangposRequest> | undefined): KangposRequest {
    if (!incoming) return current;
    return incoming as KangposRequest;
  }  private async sendFromEntry(entry: PanelEntry): Promise<void> {
    this.lastRequest = { model: deepClone(entry.model), collectionId: entry.meta.collectionId, requestId: entry.meta.requestId };
    const outcome = await sendResolvedRequest(entry.model, entry.meta.collectionId, undefined, store.activeEnvId);
    if (outcome.response) {
      const activityEntry: ActivityEntry = {
        _id: uid(),
        name: entry.model.name || 'New Request',
        method: entry.model.method,
        url: entry.model.url,
        request: deepClone(entry.model),
        collectionId: entry.meta.collectionId,
        status: outcome.response.status,
        timeMs: outcome.response.timeMs,
        size: outcome.response.size,
        createdAt: Date.now()
      };
      store.addActivity(activityEntry);
      await entry.panel.webview.postMessage({
        command: 'response',
        response: {
          status: outcome.response.status,
          statusText: outcome.response.statusText,
          headers: outcome.response.headers,
          body: outcome.response.body,
          base64: outcome.response.bodyBase64,
          timeMs: outcome.response.timeMs,
          size: outcome.response.size,
          contentType: outcome.response.contentType
        },
        tests: {
          results: outcome.tests,
          passed: outcome.testPassed,
          failed: outcome.testFailed
        }
      });
    } else {
      await entry.panel.webview.postMessage({
        command: 'error',
        message: outcome.error || 'Request failed'
      });
    }
  }

  async rerun(): Promise<void> {
    if (!this.lastRequest) {
      void vscode.window.showInformationMessage('Kangpos: No request to re-run. Send a request first.');
      return;
    }
    await this.open({
      request: deepClone(this.lastRequest.model),
      requestId: this.lastRequest.requestId,
      collectionId: this.lastRequest.collectionId,
      autoSend: true
    });
  }

  async openSaved(collectionId: string, requestId: string, autoSend = false): Promise<void> {
    const found = store.getRequest(requestId);
    if (!found) {
      void vscode.window.showInformationMessage('Kangpos: Request not found');
      return;
    }
    await this.open({
      request: found.request,
      requestId,
      collectionId,
      collectionName: found.collectionName,
      autoSend
    });
  }

  async openActivity(activityId: string): Promise<void> {
    const entry = store.getActivityEntry(activityId);
    if (!entry) {
      void vscode.window.showInformationMessage('Kangpos: Activity entry not found');
      return;
    }
    await this.open({ request: entry.request });
  }

  private async saveAs(entry: PanelEntry): Promise<void> {
    const name = await vscode.window.showInputBox({ prompt: 'Request name', value: entry.model.name || 'New Request' });
    if (name === undefined) return;
    entry.model.name = name;
    const collections = store.collections;
    let target: { label: string; description?: string; id: string } | undefined;
    if (collections.length > 0) {
      const picks: { label: string; description?: string; id: string }[] = collections.map(c => ({ label: c.name, description: store.listRequests(c._id).length + ' requests', id: c._id }));
      picks.push({ label: '$(add) Create New Collection...', id: '__new' });
      target = await vscode.window.showQuickPick(picks, { placeHolder: 'Select collection to save request' });
    } else {
      target = { label: '$(add) Create New Collection...', id: '__new' };
    }
    if (!target) return;
    let collectionId = target.id;
    let collectionName = '';
    if (collectionId === '__new') {
      const newName = await vscode.window.showInputBox({ prompt: 'Collection name', value: 'My Collection' });
      if (!newName) return;
      const col = store.newCollection(newName);
      collectionId = col._id;
      collectionName = col.name;
    } else {
      collectionName = (collections.find(c => c._id === collectionId) || { name: '' }).name;
    }
    const folders = store.listFolders(collectionId);
    const folderPicks: { label: string; id: string | null }[] = [{ label: 'Collection Root', id: null }];
    for (const f of folders) folderPicks.push({ label: f.label, id: f.id });
    const folderPick = await vscode.window.showQuickPick(folderPicks, { placeHolder: 'Select folder' });
    if (!folderPick) return;
    entry.model = { ...deepClone(entry.model), _id: uid() };
    store.addRequest(collectionId, folderPick.id, entry.model);
    entry.meta = {
      requestId: entry.model._id,
      collectionId,
      folderId: folderPick.id || undefined,
      collectionName,
      saved: true
    };
    await entry.panel.webview.postMessage({
      command: 'saved',
      requestId: entry.model._id,
      collectionId,
      collectionName,
      name
    });
    entry.panel.title = this.panelTitle(entry);
  }
}

export async function importCurlFlow(): Promise<void> {
  const text = await vscode.window.showInputBox({ prompt: 'Paste cURL command', placeHolder: 'curl -X GET https://api.example.com -H "Authorization: Bearer token"' });
  if (!text) return;
  try {
    const req = requestFromCurl(text);
    const collections = store.collections;
    let collectionId: string;
    let collectionName = '';
    if (collections.length > 0) {
      const picks: { label: string; description?: string; id: string; name: string }[] = collections.map(c => ({ label: c.name, id: c._id, name: c.name }));
      picks.push({ label: '$(add) Create New Collection...', id: '__new', name: '' });
      const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Save cURL request to collection' });
      if (!pick) return;
      if (pick.id === '__new') {
        const newName = await vscode.window.showInputBox({ prompt: 'Collection name', value: 'Imported cURL' });
        if (!newName) return;
        const col = store.newCollection(newName);
        collectionId = col._id;
        collectionName = col.name;
      } else {
        collectionId = pick.id;
        collectionName = pick.name;
      }
    } else {
      const col = store.newCollection('Imported cURL');
      collectionId = col._id;
      collectionName = col.name;
    }
    store.addRequest(collectionId, null, req);
    void vscode.window.showInformationMessage('Kangpos: cURL imported to ' + collectionName);
  } catch (e) {
    void vscode.window.showErrorMessage('Kangpos: Failed to parse cURL - ' + (e instanceof Error ? e.message : String(e)));
  }
}
