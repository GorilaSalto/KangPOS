import * as crypto from 'crypto';
import { AssertRule, AuthConfig, BodyType, KangposRequest, RequestBody } from '../types';

export const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export function uid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function interpolateVars(input: string, vars: Record<string, string>): string {
  if (!input || input.indexOf('{{') === -1) return input;
  return input.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, name) => {
    const key = String(name).trim();
    if (key === '$guid' || key === '$randomUuid') return uid();
    if (key === '$timestamp') return String(Math.floor(Date.now() / 1000));
    if (key === '$timestampMs') return String(Date.now());
    if (key === '$randomInt') return String(Math.floor(Math.random() * 1000));
    if (key === '$randomHex8') return crypto.randomBytes(4).toString('hex');
    const v = vars[key];
    return v === undefined ? m : v;
  });
}

export interface PathResult {
  found: boolean;
  value: unknown;
}

export function getJsonPath(obj: unknown, path: string): PathResult {
  if (!path) return { found: false, value: undefined };
  let p = path.trim();
  if (p.startsWith('$')) p = p.slice(1);
  if (p.startsWith('.')) p = p.slice(1);
  if (!p) return { found: true, value: obj };
  const tokens = p.split('.').flatMap(t => {
    const parts: string[] = [];
    const re = /([^[\]]*)\[(-?\d+)\]/g;
    let rest = t;
    let match: RegExpExecArray | null;
    let consumed = 0;
    while ((match = re.exec(t)) !== null) {
      if (match.index > consumed || match[1]) parts.push(match[1]);
      parts.push(match[2]);
      consumed = match.index + match[0].length;
    }
    if (consumed < t.length) parts.push(t.slice(consumed));
    void rest;
    return parts.filter(x => x !== '');
  });
  let current: unknown = obj;
  for (const token of tokens) {
    if (current === null || current === undefined) return { found: false, value: undefined };
    if (Array.isArray(current) && /^\d+$/.test(token)) {
      const idx = parseInt(token, 10);
      if (idx >= current.length || idx < 0) return { found: false, value: undefined };
      current = current[idx];
      continue;
    }
    if (token === 'length' && Array.isArray(current)) {
      current = current.length;
      continue;
    }
    if (typeof current !== 'object') return { found: false, value: undefined };
    current = (current as Record<string, unknown>)[token];
  }
  return { found: current !== undefined, value: current };
}

export function formatBytes(bytes: number): string {
  if (isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return (i === 0 ? n : n.toFixed(2)) + ' ' + units[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return Math.round(ms) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
  const days = Math.floor(diff / 86400000);
  if (days === 1) return 'yesterday';
  if (days < 30) return days + ' days ago';
  return new Date(ts).toLocaleDateString();
}

export function newBody(type: BodyType = 'none'): RequestBody {
  return {
    type,
    raw: '',
    form: [],
    formdata: [],
    graphql: { query: '', variables: '' },
    binaryName: '',
    binaryData: '',
    binaryPath: ''
  };
}

export function newAuth(): AuthConfig {
  return {
    type: 'none',
    basic: { username: '', password: '' },
    bearer: { token: '' },
    apikey: { key: '', value: '', in: 'header' },
    oauth2: {
      grantType: 'client_credentials',
      tokenUrl: '',
      clientId: '',
      clientSecret: '',
      scope: '',
      username: '',
      password: '',
      accessToken: '',
      refreshToken: ''
    }
  };
}

export function defaultHeaders(method: string): { name: string; value: string; disabled?: boolean }[] {
  const headers = [
    { name: 'Accept', value: '*/*', disabled: false },
    { name: 'User-Agent', value: 'KangPOS(@kangpos)', disabled: false }
  ];
  if ((method || '').toUpperCase() === 'POST') {
    headers.push({ name: 'Content-Type', value: 'application/json', disabled: false });
  }
  return headers;
}

export function newRequest(name: string): KangposRequest {
  return {
    _id: uid(),
    name,
    method: 'GET',
    url: '',
    body: newBody(),
    headers: defaultHeaders('GET'),
    auth: newAuth(),
    tests: [],
    script: '',
    docs: '',
    createdAt: Date.now()
  };
}

export function assertLabel(rule: AssertRule): string {
  const targetNames: Record<string, string> = {
    status: 'Status Code',
    header: 'Header',
    body: 'Body',
    text: 'Body Text',
    time: 'Response Time',
    env: 'Set Env Var'
  };
  return targetNames[rule.type] || rule.type;
}

export function normalizeUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const host = u.split('/')[0].split('?')[0];
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\*\.local)$/i.test(host);
  return (isLocal ? 'http://' : 'https://') + u;
}

export function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '#27ae60',
    POST: '#f39c12',
    PUT: '#2980b9',
    PATCH: '#8e44ad',
    DELETE: '#e74c3c',
    HEAD: '#7f8c8d',
    OPTIONS: '#16a085'
  };
  return colors[(method || 'GET').toUpperCase()] || '#7f8c8d';
}

const MIME_MAP: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain',
  text: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  csv: 'text/csv',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ico: 'image/x-icon',
  zip: 'application/zip',
  gz: 'application/gzip',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff: 'font/woff',
  woff2: 'font/woff2'
};

export function guessMime(fileName: string): string {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

export function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

interface CurlToken {
  flag: string;
  value: string;
}

function tokenizeCurl(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | null = null;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length && (text[i + 1] === '\n' || text[i + 1] === '\r')) {
      i += 2;
      while (i < text.length && /\s/.test(text[i])) i++;
      continue;
    }
    if (ch === '\\' && quote && i + 1 < text.length) {
      const next = text[i + 1];
      if (quote === '"' && (next === '"' || next === '\\' || next === '$' || next === '`')) {
        current += next;
        i += 2;
        continue;
      }
      if (quote === "'") {
        current += ch + next;
        i += 2;
        continue;
      }
    }
    if (quote) {
      if (ch === quote) {
        if (quote === "'" && text[i + 1] === "'") {
          current += "'";
          i += 2;
          continue;
        }
        quote = null;
        i++;
        continue;
      }
      current += ch;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  if (current) tokens.push(current);
  return tokens;
}

export interface CurlResult {
  method: string;
  url: string;
  headers: { name: string; value: string; disabled?: boolean }[];
  bodyType: BodyType;
  raw: string;
  form: { name: string; value: string; disabled?: boolean }[];
  formdata: { name: string; value: string; type: 'text' | 'file'; fileName?: string }[];
  auth: { username: string; password: string } | null;
}

export function parseCurl(text: string): CurlResult {
  let clean = text.trim();
  clean = clean.replace(/^curl\s+/i, '');
  clean = clean.replace(/\^\r?\n/g, ' ');
  const tokens = tokenizeCurl(clean);
  const result: CurlResult = {
    method: '',
    url: '',
    headers: [],
    bodyType: 'none',
    raw: '',
    form: [],
    formdata: [],
    auth: null
  };
  let dataParts: string[] = [];
  let contentType = '';
  const formParts: { name: string; value: string; type: 'text' | 'file'; fileName?: string }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = (): string => {
      i++;
      return tokens[i] !== undefined ? tokens[i] : '';
    };
    if (t === '-X' || t === '--request') result.method = next().toUpperCase();
    else if (t === '-H' || t === '--header') {
      const h = next();
      const idx = h.indexOf(':');
      if (idx > 0) {
        const name = h.slice(0, idx).trim();
        const value = h.slice(idx + 1).trim();
        if (/^content-type$/i.test(name)) contentType = value;
        else result.headers.push({ name, value });
      } else if (h.endsWith(';')) {
        result.headers.push({ name: h.slice(0, -1).trim(), value: '' });
      }
    } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-ascii' || t === '--data-binary' || t === '--data-urlencode') {
      const v = next();
      if (t === '--data-urlencode' && v.includes('=')) {
        const idx = v.indexOf('=');
        dataParts.push(v.slice(0, idx) + '=' + encodeURIComponent(v.slice(idx + 1)));
      } else {
        dataParts.push(v);
      }
    } else if (t === '-F' || t === '--form' || t === '--form-string') {
      const v = next();
      const idx = v.indexOf('=');
      if (idx > 0) {
        const name = v.slice(0, idx).trim();
        const value = v.slice(idx + 1);
        if (value.startsWith('@')) {
          const rest = value.slice(1);
          const semi = rest.indexOf(';');
          const fileName = semi > -1 ? rest.slice(0, semi) : rest;
          formParts.push({ name, value: '', type: 'file', fileName });
        } else {
          formParts.push({ name, value, type: 'text' });
        }
      }
    } else if (t === '--url') result.url = next();
    else if (t === '-u' || t === '--user') {
      const v = next();
      const idx = v.indexOf(':');
      result.auth = { username: idx > -1 ? v.slice(0, idx) : v, password: idx > -1 ? v.slice(idx + 1) : '' };
    } else if (t === '-A' || t === '--user-agent') {
      result.headers.push({ name: 'User-Agent', value: next() });
    } else if (t === '-b' || t === '--cookie') {
      result.headers.push({ name: 'Cookie', value: next() });
    } else if (t === '-e' || t === '--referer') {
      result.headers.push({ name: 'Referer', value: next() });
    } else if (t === '-m' || t === '--max-time' || t === '--connect-timeout' || t === '-k' || t === '--insecure' || t === '-L' || t === '--location' || t === '-s' || t === '--silent' || t === '--compressed' || t === '-G' || t === '--get' || t === '-v' || t === '--verbose' || t === '-i' || t === '--include' || t === '--location-trusted' || t === '-#' || t === '--progress-bar') {
      next();
    } else if (t.startsWith('-')) {
      next();
    } else if (!result.url && /^https?:\/\//i.test(t)) {
      result.url = t;
    } else if (!result.url && !t.startsWith('-')) {
      result.url = t;
    }
  }
  if (result.method) {
    result.method = result.method.toUpperCase();
  } else if (dataParts.length > 0 || formParts.length > 0) {
    result.method = 'POST';
  } else {
    result.method = 'GET';
  }
  if (formParts.length > 0) {
    result.bodyType = 'formdata';
    result.formdata = formParts;
  } else if (dataParts.length > 0) {
    const joined = dataParts.length === 1 ? dataParts[0] : dataParts.join('&');
    if (/json/i.test(contentType)) {
      result.bodyType = 'json';
      result.raw = joined;
    } else if (/xml/i.test(contentType)) {
      result.bodyType = 'xml';
      result.raw = joined;
    } else if (/x-www-form-urlencoded/i.test(contentType) || dataParts.length > 1 || /[&=]/.test(joined)) {
      result.bodyType = 'form';
      result.form = joined.split('&').map(pair => {
        const idx = pair.indexOf('=');
        return {
          name: idx > -1 ? decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' ')) : pair,
          value: idx > -1 ? decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' ')) : ''
        };
      });
    } else {
      result.bodyType = 'raw';
      result.raw = joined;
    }
  }
  return result;
}
