import { AssertRule, AuthConfig, BodyType, CollectionItem, KangposCollection, KangposFolder, KangposRequest, KV, MultipartFile, RequestBody } from '../types';
import { newAuth, newBody, newRequest, parseCurl, uid } from '../utils/utils';

export interface KangposExportFile {
  type: 'kangpos';
  version: number;
  exportedAt?: number;
  collections: KangposCollection[];
}

function kvList(list: { key?: string; name?: string; value?: string; disabled?: boolean }[] | undefined): KV[] {
  return (list || [])
    .filter(h => h && (h.key || h.name))
    .map(h => ({ name: h.key || h.name || '', value: h.value || '', disabled: !!h.disabled }));
}

function mapPostmanBody(pmBody: PostmanBody | undefined): RequestBody {
  const body = newBody();
  if (!pmBody) return body;
  const mode = pmBody.mode;
  if (mode === 'raw') {
    const lang = (pmBody.options?.raw?.language || pmBody.rawLanguage || '').toLowerCase();
    if (lang === 'json') {
      body.type = 'json';
    } else if (lang === 'xml') {
      body.type = 'xml';
    } else {
      body.type = 'raw';
    }
    body.raw = typeof pmBody.raw === 'string' ? pmBody.raw : '';
  } else if (mode === 'urlencoded') {
    body.type = 'form';
    body.form = kvList(pmBody.urlencoded);
  } else if (mode === 'formdata') {
    body.type = 'formdata';
    body.formdata = (pmBody.formdata || [])
      .filter(f => f && f.key)
      .map(f => {
        const isFile = f.type === 'file' || (Array.isArray(f.src) && f.src.length > 0) || typeof f.src === 'string';
        const src = Array.isArray(f.src) ? f.src[0] : f.src;
        const part: MultipartFile = { name: f.key, value: '', type: isFile ? 'file' : 'text' };
        if (isFile && src) part.fileName = src;
        if (!isFile) part.value = f.value || '';
        return part;
      });
  } else if (mode === 'graphql' && pmBody.graphql) {
    body.type = 'graphql';
    body.graphql.query = typeof pmBody.graphql.query === 'string' ? pmBody.graphql.query : '';
    body.graphql.variables = typeof pmBody.graphql.variables === 'string' ? pmBody.graphql.variables : JSON.stringify(pmBody.graphql.variables || {});
  } else if (mode === 'file') {
    body.type = 'binary';
    const src = pmBody.file?.src;
    body.binaryName = typeof src === 'string' ? src : '';
    body.binaryPath = body.binaryName;
  }
  return body;
}

function mapPostmanAuth(pmAuth: PostmanAuth | undefined): AuthConfig {
  const auth = newAuth();
  if (!pmAuth || !pmAuth.type) return auth;
  switch (pmAuth.type) {
    case 'basic': {
      auth.type = 'basic';
      const list = pmAuth.basic || [];
      for (const item of list) {
        if (item.key === 'username') auth.basic.username = item.value || '';
        if (item.key === 'password') auth.basic.password = item.value || '';
      }
      break;
    }
    case 'bearer': {
      auth.type = 'bearer';
      const list = pmAuth.bearer || [];
      for (const item of list) {
        if (item.key === 'token') auth.bearer.token = item.value || '';
      }
      break;
    }
    case 'apikey': {
      auth.type = 'apikey';
      const list = pmAuth.apikey || [];
      for (const item of list) {
        if (item.key === 'key') auth.apikey.key = item.value || '';
        if (item.key === 'value') auth.apikey.value = item.value || '';
        if (item.key === 'in') auth.apikey.in = item.value === 'query' ? 'query' : 'header';
      }
      break;
    }
    case 'oauth2':
    case 'oauth1':
    case 'digest':
    case 'hawk':
    case 'ntlm':
    case 'awsv4':
    default:
      auth.type = 'none';
      break;
  }
  return auth;
}

function mapPostmanUrl(pmUrl: PostmanUrl | string | undefined): string {
  if (!pmUrl) return '';
  if (typeof pmUrl === 'string') return pmUrl;
  return pmUrl.raw || '';
}

function postmanDescription(desc: unknown): string {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  const d = desc as { content?: string };
  return d.content || '';
}

function walkPostmanItems(items: PostmanItem[], folderName: string | null): { request: KangposRequest; folderName: string }[] {
  const result: { request: KangposRequest; folderName: string }[] = [];
  for (const item of items || []) {
    if (item.item) {
      const subName = folderName ? folderName + ' / ' + (item.name || 'folder') : item.name || 'folder';
      result.push(...walkPostmanItems(item.item, subName));
    } else if (item.request) {
      const req = newRequest(item.name || 'Request');
      const r = item.request;
      req.method = (typeof r.method === 'string' ? r.method : 'GET').toUpperCase();
      req.url = mapPostmanUrl(r.url);
      req.headers = kvList(r.header);
      req.body = mapPostmanBody(r.body);
      req.auth = mapPostmanAuth(r.auth);
      const desc = postmanDescription(item.description || r.description);
      req.docs = desc;
      result.push({ request: req, folderName: folderName || '' });
    }
  }
  return result;
}

function insertByFolderName(col: KangposCollection, request: KangposRequest, folderName: string): void {
  if (!folderName) {
    col.items.push(request);
    return;
  }
  const segments = folderName.split(' / ');
  let items: CollectionItem[] = col.items;
  let currentPath = '';
  for (const seg of segments) {
    currentPath = currentPath ? currentPath + ' / ' + seg : seg;
    let folder = items.find(i => (i as KangposFolder).type === 'folder' && i.name === seg) as KangposFolder | undefined;
    if (!folder) {
      folder = { _id: uid(), type: 'folder', name: seg, items: [] };
      items.push(folder);
    }
    items = folder.items;
  }
  items.push(request);
}

export function importPostman(json: unknown): KangposCollection[] {
  const collections: KangposCollection[] = [];
  const source: PostmanCollection[] = Array.isArray(json) ? (json as PostmanCollection[]) : [json as PostmanCollection];
  for (const pc of source) {
    if (!pc || !pc.info) continue;
    const col: KangposCollection = {
      _id: uid(),
      name: pc.info.name || 'Imported Collection',
      items: [],
      createdAt: Date.now(),
      envVars: []
    };
    const flat = walkPostmanItems(pc.item || [], null);
    for (const entry of flat) {
      insertByFolderName(col, entry.request, entry.folderName);
    }
    collections.push(col);
  }
  return collections;
}

function regenerate(col: KangposCollection): KangposCollection {
  const walk = (items: CollectionItem[]): CollectionItem[] =>
    items.map(item => {
      if ((item as KangposFolder).type === 'folder') {
        const f = item as KangposFolder;
        return { _id: uid(), type: 'folder', name: f.name, items: walk(f.items) };
      }
      return { ...(item as KangposRequest), _id: uid() };
    });
  return {
    _id: uid(),
    name: col.name,
    items: walk(col.items),
    createdAt: Date.now(),
    envVars: col.envVars ? deepCopyKv(col.envVars) : []
  };
}

function deepCopyKv(list: KV[]): KV[] {
  return list.map(v => ({ ...v }));
}

export function importKangpos(json: unknown): KangposCollection[] {
  const data = json as Partial<KangposExportFile> & Partial<KangposCollection>;
  if (data && data.type === 'kangpos' && Array.isArray(data.collections)) {
    return data.collections.map(regenerate);
  }
  if (Array.isArray(json)) {
    return (json as KangposCollection[]).map(regenerate);
  }
  if (data && Array.isArray(data.items)) {
    return [regenerate(data as KangposCollection)];
  }
  return [];
}

export function exportKangpos(collections: KangposCollection[]): KangposExportFile {
  return {
    type: 'kangpos',
    version: 1,
    exportedAt: Date.now(),
    collections: JSON.parse(JSON.stringify(collections)) as KangposCollection[]
  };
}

export function requestFromCurl(text: string, name?: string): KangposRequest {
  const parsed = parseCurl(text);
  const req = newRequest(name || 'cURL Request');
  req.method = parsed.method;
  req.url = parsed.url;
  req.headers = parsed.headers;
  req.body = newBody(parsed.bodyType);
  if (parsed.bodyType === 'json' || parsed.bodyType === 'xml' || parsed.bodyType === 'raw') {
    req.body.raw = parsed.raw;
  } else if (parsed.bodyType === 'form') {
    req.body.form = parsed.form;
  } else if (parsed.bodyType === 'formdata') {
    req.body.formdata = parsed.formdata.map(f => ({ ...f }));
  }
  if (parsed.auth) {
    req.auth = newAuth();
    req.auth.type = 'basic';
    req.auth.basic = parsed.auth;
  }
  return req;
}

export function requestToAssertDefaults(tests: AssertRule[] | undefined): AssertRule[] {
  return tests || [];
}

interface PostmanVariable {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: string;
  raw?: string;
  rawLanguage?: string;
  options?: { raw?: { language?: string } };
  urlencoded?: { key: string; value: string; disabled?: boolean }[];
  formdata?: { key: string; value: string; type?: string; src?: string | string[] }[];
  graphql?: { query: string; variables?: unknown };
  file?: { src?: string | string[] };
}

interface PostmanAuth {
  type: string;
  basic?: { key: string; value: string }[];
  bearer?: { key: string; value: string }[];
  apikey?: { key: string; value: string; in?: string }[];
}

interface PostmanUrl {
  raw?: string;
  query?: { key: string; value: string; disabled?: boolean }[];
}

interface PostmanItem {
  name?: string;
  description?: unknown;
  item?: PostmanItem[];
  request?: {
    method?: string;
    header?: { key: string; value: string; disabled?: boolean }[];
    url?: PostmanUrl | string;
    body?: PostmanBody;
    auth?: PostmanAuth;
    description?: unknown;
  };
}

interface PostmanCollection {
  info?: { name: string };
  item?: PostmanItem[];
  variable?: PostmanVariable[];
}
