import * as http from 'http';
import * as https from 'https';
import * as zlib from 'zlib';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { AuthConfig, HttpClientConfig, HttpHeader, HttpResponse, KangposRequest, MultipartFile } from '../types';
import { guessMime, normalizeUrl } from './utils';

function createProxyAgents(proxy: string): { httpAgent?: http.Agent; httpsAgent?: https.Agent } {
  try {
    return {
      httpAgent: new HttpProxyAgent(proxy),
      httpsAgent: new HttpsProxyAgent(proxy)
    };
  } catch {
    return {};
  }
}

async function decodeBody(buffer: Buffer, encoding: string): Promise<Buffer> {
  try {
    if (!encoding) return buffer;
    const enc = encoding.toLowerCase();
    if (enc.includes('br')) return zlib.brotliDecompressSync(buffer);
    if (enc.includes('gzip')) return zlib.gunzipSync(buffer);
    if (enc.includes('deflate')) return zlib.inflateSync(buffer);
    return buffer;
  } catch {
    return buffer;
  }
}

function bufferFromRequest(req: KangposRequest, headers: Record<string, string>): { body?: Buffer; error?: string } {
  const body = req.body;
  if (!body || body.type === 'none') return {};
  switch (body.type) {
    case 'json': {
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      return { body: Buffer.from(body.raw || '', 'utf8') };
    }
    case 'xml': {
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/xml';
      return { body: Buffer.from(body.raw || '', 'utf8') };
    }
    case 'raw': {
      if (!headers['Content-Type']) headers['Content-Type'] = 'text/plain';
      return { body: Buffer.from(body.raw || '', 'utf8') };
    }
    case 'form': {
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const encoded = (body.form || [])
        .filter(f => !f.disabled && f.name)
        .map(f => encodeURIComponent(f.name) + '=' + encodeURIComponent(f.value))
        .join('&');
      return { body: Buffer.from(encoded, 'utf8') };
    }
    case 'graphql': {
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      let variables: unknown = {};
      if (body.graphql.variables && body.graphql.variables.trim()) {
        try {
          variables = JSON.parse(body.graphql.variables);
        } catch (e) {
          return { error: 'GraphQL variables is not valid JSON: ' + String(e) };
        }
      }
      return { body: Buffer.from(JSON.stringify({ query: body.graphql.query, variables }), 'utf8') };
    }
    case 'binary': {
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/octet-stream';
      if (body.binaryData) return { body: Buffer.from(body.binaryData, 'base64') };
      return { error: 'No file selected for binary body' };
    }
    case 'formdata': {
      const boundary = '----KangposBoundary' + Math.random().toString(36).slice(2);
      headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
      const chunks: Buffer[] = [];
      const fields = body.formdata || [];
      for (const field of fields) {
        if (!field.name) continue;
        chunks.push(Buffer.from('--' + boundary + '\r\n', 'utf8'));
        if (field.type === 'file') {
          let data: Buffer | null = null;
          let fileName = field.fileName || 'file';
          if (field.base64) {
            data = Buffer.from(field.base64, 'base64');
          } else {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const fs = require('fs') as typeof import('fs');
              data = fs.readFileSync(field.fileName || field.value);
              fileName = field.fileName || field.value;
            } catch {
              data = null;
            }
          }
          if (!data) continue;
          chunks.push(
            Buffer.from(
              'Content-Disposition: form-data; name="' + field.name + '"; filename="' + fileName.replace(/"/g, '') + '"\r\n',
              'utf8'
            )
          );
          chunks.push(Buffer.from('Content-Type: ' + guessMime(fileName) + '\r\n\r\n', 'utf8'));
          chunks.push(data);
          chunks.push(Buffer.from('\r\n', 'utf8'));
        } else {
          chunks.push(Buffer.from('Content-Disposition: form-data; name="' + field.name + '"\r\n\r\n', 'utf8'));
          chunks.push(Buffer.from(field.value || '', 'utf8'));
          chunks.push(Buffer.from('\r\n', 'utf8'));
        }
      }
      chunks.push(Buffer.from('--' + boundary + '--\r\n', 'utf8'));
      return { body: Buffer.concat(chunks) };
    }
    default:
      return {};
  }
}

function applyAuth(
  req: KangposRequest,
  auth: AuthConfig,
  headers: Record<string, string>,
  queryAppend: { name: string; value: string }[],
  token: string | null
): void {
  if (!auth) return;
  switch (auth.type) {
    case 'basic':
      if (!headers['Authorization']) {
        headers['Authorization'] = 'Basic ' + Buffer.from((auth.basic.username || '') + ':' + (auth.basic.password || '')).toString('base64');
      }
      break;
    case 'bearer':
      if (!headers['Authorization']) {
        headers['Authorization'] = 'Bearer ' + (auth.bearer.token || '');
      }
      break;
    case 'apikey':
      if (auth.apikey.in === 'query') {
        queryAppend.push({ name: auth.apikey.key, value: auth.apikey.value });
      } else {
        if (!headers[auth.apikey.key]) headers[auth.apikey.key] = auth.apikey.value;
      }
      break;
    case 'oauth2':
      if (token) {
        if (!headers['Authorization']) headers['Authorization'] = 'Bearer ' + token;
      } else if (auth.oauth2.accessToken) {
        if (!headers['Authorization']) headers['Authorization'] = 'Bearer ' + auth.oauth2.accessToken;
      }
      break;
    default:
      break;
  }
}

async function fetchOauthToken(auth: AuthConfig, config: HttpClientConfig): Promise<{ token: string; error?: string }> {
  const oauth = auth.oauth2;
  if (!oauth.tokenUrl) return { token: '', error: 'OAuth2: token URL is empty' };
  const form = new URLSearchParams();
  if (oauth.grantType === 'client_credentials') {
    form.set('grant_type', 'client_credentials');
    form.set('client_id', oauth.clientId);
    form.set('client_secret', oauth.clientSecret);
    if (oauth.scope) form.set('scope', oauth.scope);
  } else if (oauth.grantType === 'password') {
    form.set('grant_type', 'password');
    form.set('client_id', oauth.clientId);
    form.set('client_secret', oauth.clientSecret);
    form.set('username', oauth.username);
    form.set('password', oauth.password);
    if (oauth.scope) form.set('scope', oauth.scope);
  } else {
    return { token: '', error: 'OAuth2: authorization_code flow not supported at send time. Obtain access_token manually and fill it in.' };
  }
  return new Promise(resolve => {
    try {
      const url = new URL(oauth.tokenUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;
      const options: https.RequestOptions = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(form.toString())
        },
        rejectUnauthorized: config.verifySsl
      };
      const req = lib.request(options, (resp) => {
        const chunks: Buffer[] = [];
        resp.on('data', (c: Buffer) => chunks.push(c));
        resp.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (json.access_token) resolve({ token: json.access_token });
            else resolve({ token: '', error: 'OAuth2 token error: ' + (json.error_description || json.error || 'no access_token in response') });
          } catch (e) {
            resolve({ token: '', error: 'OAuth2 token response is not JSON: ' + String(e) });
          }
        });
      });
      req.on('error', (e: Error) => resolve({ token: '', error: 'OAuth2 token request failed: ' + e.message }));
      if (config.timeout > 0) req.setTimeout(config.timeout, () => {
        req.destroy(new Error('OAuth2 token request timeout'));
      });
      req.write(form.toString());
      req.end();
    } catch (e) {
      resolve({ token: '', error: 'OAuth2 token URL invalid: ' + String(e) });
    }
  });
}

export async function sendRequest(req: KangposRequest, config: HttpClientConfig): Promise<HttpResponse> {
  const auth = req.auth;
  let token: string | null = null;
  if (auth && auth.type === 'oauth2' && (auth.oauth2.grantType === 'client_credentials' || auth.oauth2.grantType === 'password') && !auth.oauth2.accessToken) {
    const tokenResult = await fetchOauthToken(auth, config);
    if (tokenResult.error) throw new Error(tokenResult.error);
    token = tokenResult.token;
  }

  const headers: Record<string, string> = {};
  for (const h of req.headers || []) {
    if (!h.disabled && h.name) headers[h.name] = h.value;
  }
  const queryAppend: { name: string; value: string }[] = [];
  applyAuth(req, auth, headers, queryAppend, token);

  const bodyResult = bufferFromRequest(req, headers);
  if (bodyResult.error) throw new Error(bodyResult.error);
  const body = bodyResult.body;
  if (body && !headers['Content-Type'] && req.body.type !== 'formdata') {
    headers['Content-Type'] = 'application/octet-stream';
  }
  headers['Accept-Encoding'] = headers['Accept-Encoding'] || 'gzip, deflate, br';
  headers['User-Agent'] = headers['User-Agent'] || 'Kangpos/1.0';

  let method = (req.method || 'GET').toUpperCase();
  if (method === 'HEAD') delete headers['Content-Length'];

  let urlStr = normalizeUrl(req.url || '');
  if (!urlStr) throw new Error('URL is empty');
  const url = new URL(urlStr);
  for (const q of queryAppend) {
    if (q.name) url.searchParams.append(q.name, q.value);
  }
  urlStr = url.toString();

  if (body) headers['Content-Length'] = String(body.length);

  const agents = config.proxy ? createProxyAgents(config.proxy) : {};
  const isHttps = url.protocol === 'https:';
  const maxRedirects = config.followRedirects ? Math.max(0, config.maxRedirects) : 0;
  let currentUrl = urlStr;
  let redirectCount = 0;
  const start = process.hrtime.bigint();

  const doSend = (targetUrl: string, sendBody: Buffer | undefined): Promise<{ status: number; statusText: string; headers: HttpHeader[]; data: Buffer }> => {
    return new Promise((resolve, reject) => {
      let parsed: URL;
      try {
        parsed = new URL(targetUrl);
      } catch (e) {
        reject(new Error('Invalid URL: ' + targetUrl));
        return;
      }
      const lib = parsed.protocol === 'https:' ? https : http;
      const options: https.RequestOptions = {
        method,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers: {
          ...headers,
          Host: parsed.host
        },
        rejectUnauthorized: config.verifySsl
      };
      if (parsed.protocol === 'https:' && agents.httpsAgent) {
        options.agent = agents.httpsAgent;
      } else if (parsed.protocol === 'http:' && agents.httpAgent) {
        options.agent = agents.httpAgent;
      }
      const clientReq = lib.request(options, (resp) => {
        const chunks: Buffer[] = [];
        resp.on('data', (c: Buffer) => chunks.push(c));
        resp.on('end', () => {
          const rawHeaders: HttpHeader[] = [];
          const respHeaders = resp.headers;
          for (const key of Object.keys(respHeaders)) {
            const val = respHeaders[key];
            if (val === undefined) continue;
            if (Array.isArray(val)) {
              for (const v of val) rawHeaders.push({ name: key, value: v });
            } else {
              rawHeaders.push({ name: key, value: val });
            }
          }
          resolve({
            status: resp.statusCode || 0,
            statusText: resp.statusMessage || '',
            headers: rawHeaders,
            data: Buffer.concat(chunks)
          });
        });
      });
      clientReq.on('error', (e: Error) => reject(e));
      if (config.timeout > 0) {
        clientReq.setTimeout(config.timeout, () => {
          clientReq.destroy(new Error('Request timeout (' + config.timeout + ' ms)'));
        });
      }
      if (sendBody && method !== 'HEAD') clientReq.write(sendBody);
      clientReq.end();
    });
  };

  let lastResponse: { status: number; statusText: string; headers: HttpHeader[]; data: Buffer } | null = null;
  let currentBody: Buffer | undefined = body;
  while (true) {
    const response = await doSend(currentUrl, currentBody);
    lastResponse = response;
    const location = response.headers.find(h => h.name.toLowerCase() === 'location');
    const isRedirect = response.status >= 300 && response.status < 400 && location;
    if (isRedirect && redirectCount < maxRedirects) {
      redirectCount++;
      let nextUrl: URL;
      try {
        nextUrl = new URL(location.value, currentUrl);
      } catch {
        break;
      }
      const keepMethod = response.status === 307 || response.status === 308;
      const switchToGet = response.status === 303 || (!keepMethod && (response.status === 301 || response.status === 302) && method === 'POST');
      if (switchToGet) {
        method = 'GET';
        delete headers['Content-Length'];
        currentBody = undefined;
      } else {
        if (currentBody) headers['Content-Length'] = String(currentBody.length);
      }
      currentUrl = nextUrl.toString();
      continue;
    }
    break;
  }

  const end = process.hrtime.bigint();
  const timeMs = Number(end - start) / 1e6;
  if (!lastResponse) throw new Error('No response');
  const encoding = lastResponse.headers.find(h => h.name.toLowerCase() === 'content-encoding')?.value || '';
  const decoded = await decodeBody(lastResponse.data, encoding);
  const contentTypeHeader = lastResponse.headers.find(h => h.name.toLowerCase() === 'content-type')?.value || '';
  return {
    status: lastResponse.status,
    statusText: lastResponse.statusText,
    headers: lastResponse.headers,
    body: decoded.toString('utf8'),
    bodyBase64: decoded.toString('base64'),
    timeMs,
    size: decoded.length,
    contentType: contentTypeHeader
  };
}
