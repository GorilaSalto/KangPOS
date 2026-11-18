import { KangposRequest } from '../types';

function headerLines(req: KangposRequest): string[] {
  const lines: string[] = [];
  for (const h of req.headers || []) {
    if (h.disabled || !h.name) continue;
    lines.push(h.name + ': ' + h.value);
  }
  if (req.auth && req.auth.type === 'basic') {
    lines.push('Authorization: Basic <base64 of ' + req.auth.basic.username + ':' + req.auth.basic.password + '>');
  }
  if (req.auth && req.auth.type === 'bearer') {
    lines.push('Authorization: Bearer ' + req.auth.bearer.token);
  }
  if (req.auth && req.auth.type === 'apikey' && req.auth.apikey.in === 'header') {
    lines.push(req.auth.apikey.key + ': ' + req.auth.apikey.value);
  }
  return lines;
}

function bodyPayload(req: KangposRequest): { bodyString: string; form: { name: string; value: string; type: 'text' | 'file'; fileName?: string }[] | null } {
  const body = req.body;
  if (!body || body.type === 'none') return { bodyString: '', form: null };
  switch (body.type) {
    case 'json':
      return { bodyString: body.raw || '', form: null };
    case 'xml':
      return { bodyString: body.raw || '', form: null };
    case 'raw':
      return { bodyString: body.raw || '', form: null };
    case 'form': {
      const pairs = (body.form || []).filter(f => !f.disabled && f.name).map(f => encodeURIComponent(f.name) + '=' + encodeURIComponent(f.value));
      return { bodyString: pairs.join('&'), form: null };
    }
    case 'formdata':
      return { bodyString: '', form: body.formdata || [] };
    case 'graphql': {
      let variables: unknown = {};
      try {
        variables = body.graphql.variables ? JSON.parse(body.graphql.variables) : {};
      } catch {
        variables = {};
      }
      return { bodyString: JSON.stringify({ query: body.graphql.query, variables }), form: null };
    }
    case 'binary':
      return { bodyString: '<binary file: ' + (body.binaryName || 'file') + '>', form: null };
    default:
      return { bodyString: '', form: null };
  }
}

function curlEscape(s: string): string {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

export function generateCurl(req: KangposRequest): string {
  const parts: string[] = ['curl', '-X', req.method];
  const url = req.url || '';
  for (const line of headerLines(req)) {
    parts.push('-H ' + curlEscape(line));
  }
  if (req.auth && req.auth.type === 'basic') {
    parts.push('-u ' + curlEscape(req.auth.basic.username + ':' + req.auth.basic.password));
  }
  if (req.auth && req.auth.type === 'apikey' && req.auth.apikey.in === 'query') {
    const joiner = url.includes('?') ? '&' : '?';
    parts.push(curlEscape(url + joiner + req.auth.apikey.key + '=' + req.auth.apikey.value));
  } else {
    parts.push(curlEscape(url));
  }
  const payload = bodyPayload(req);
  if (payload.form) {
    for (const f of payload.form) {
      if (f.type === 'file') {
        parts.push('-F ' + curlEscape(f.name + '=@' + (f.fileName || 'file')));
      } else {
        parts.push('-F ' + curlEscape(f.name + '=' + f.value));
      }
    }
  } else if (payload.bodyString) {
    if (req.body.type === 'form') {
      parts.push('--data ' + curlEscape(payload.bodyString));
    } else {
      parts.push('--data-raw ' + curlEscape(payload.bodyString));
    }
  }
  return parts.join(' \\\n  ');
}

function jsonSafe(s: string): string {
  return JSON.stringify(s);
}

export function generateNode(req: KangposRequest): string {
  const lines: string[] = [];
  lines.push('const response = await fetch(' + jsonSafe(req.url || ''), '  {');
  lines.push('    method: ' + jsonSafe(req.method) + ',');
  lines.push('    headers: {');
  for (const line of headerLines(req)) {
    const idx = line.indexOf(':');
    const name = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    lines.push('      ' + jsonSafe(name) + ': ' + jsonSafe(value) + ',');
  }
  const payload = bodyPayload(req);
  if (payload.form) {
    lines.push('    },');
    lines.push('    body: (() => {');
    lines.push('      const form = new FormData();');
    for (const f of payload.form) {
      if (f.type === 'file') {
        lines.push('      form.append(' + jsonSafe(f.name) + ', new Blob([data]), ' + jsonSafe(f.fileName || 'file') + ');');
      } else {
        lines.push('      form.append(' + jsonSafe(f.name) + ', ' + jsonSafe(f.value) + ');');
      }
    }
    lines.push('      return form;');
    lines.push('    })()');
  } else if (payload.bodyString) {
    lines.push('    },');
    lines.push('    body: ' + jsonSafe(payload.bodyString));
  } else {
    lines.push('    }');
  }
  lines.push('  });');
  lines.push('const data = await response.text();');
  lines.push('console.log(data);');
  return lines.join('\n').replace(': <base64', 'Basic');
}

export function generatePython(req: KangposRequest): string {
  const lines: string[] = [];
  lines.push('import requests');
  lines.push('');
  lines.push('url = ' + jsonSafe(req.url || ''));
  lines.push('headers = {');
  for (const line of headerLines(req)) {
    const idx = line.indexOf(':');
    lines.push('    ' + jsonSafe(line.slice(0, idx).trim()) + ': ' + jsonSafe(line.slice(idx + 1).trim()) + ',');
  }
  lines.push('}');
  const payload = bodyPayload(req);
  if (payload.form) {
    lines.push('files = {');
    for (const f of payload.form) {
      if (f.type === 'file') {
        lines.push('    ' + jsonSafe(f.name) + ': (' + jsonSafe(f.fileName || 'file') + ', open(' + jsonSafe(f.fileName || 'file') + ', \'rb\')),');
      } else {
        lines.push('    ' + jsonSafe(f.name) + ': (None, ' + jsonSafe(f.value) + '),');
      }
    }
    lines.push('}');
    lines.push('response = requests.request(' + jsonSafe(req.method) + ', url, headers=headers, files=files)');
  } else if (payload.bodyString) {
    if (req.body.type === 'form') {
      lines.push('data = ' + jsonSafe(payload.bodyString));
      lines.push('response = requests.request(' + jsonSafe(req.method) + ', url, headers=headers, data=data)');
    } else {
      lines.push('response = requests.request(' + jsonSafe(req.method) + ', url, headers=headers, data=' + jsonSafe(payload.bodyString) + ')');
    }
  } else {
    lines.push('response = requests.request(' + jsonSafe(req.method) + ', url, headers=headers)');
  }
  lines.push('print(response.text)');
  return lines.join('\n');
}

export function generateGo(req: KangposRequest): string {
  const lines: string[] = [];
  const payload = bodyPayload(req);
  const isMultipart = !!payload.form;
  lines.push('package main');
  lines.push('');
  lines.push('import (');
  lines.push('    "fmt"');
  if (isMultipart) {
    lines.push('    "bytes"');
    lines.push('    "mime/multipart"');
  } else if (payload.bodyString) {
    lines.push('    "strings"');
  }
  lines.push('    "io"');
  lines.push('    "net/http"');
  lines.push(')');
  lines.push('');
  lines.push('func main() {');
  if (isMultipart) {
    lines.push('    body := &bytes.Buffer{}');
    lines.push('    writer := multipart.NewWriter(body)');
    for (const f of payload.form || []) {
      if (f.type === 'file') {
        lines.push('    fw, _ := writer.CreateFormFile(' + jsonSafe(f.name) + ', ' + jsonSafe(f.fileName || 'file') + ')');
        lines.push('    fw.Write([]byte(' + jsonSafe(f.value || '<file content>') + '))');
      } else {
        lines.push('    writer.WriteField(' + jsonSafe(f.name) + ', ' + jsonSafe(f.value) + ')');
      }
    }
    lines.push('    writer.Close()');
    lines.push('    req, _ := http.NewRequest(' + jsonSafe(req.method) + ', ' + jsonSafe(req.url || '') + ', body)');
    lines.push('    req.Header.Set("Content-Type", writer.FormDataContentType())');
  } else if (payload.bodyString) {
    lines.push('    payload := ' + jsonSafe(payload.bodyString));
    lines.push('    req, _ := http.NewRequest(' + jsonSafe(req.method) + ', ' + jsonSafe(req.url || '') + ', strings.NewReader(payload))');
  } else {
    lines.push('    req, _ := http.NewRequest(' + jsonSafe(req.method) + ', ' + jsonSafe(req.url || '') + ', nil)');
  }
  for (const line of headerLines(req)) {
    const idx = line.indexOf(':');
    lines.push('    req.Header.Set(' + jsonSafe(line.slice(0, idx).trim()) + ', ' + jsonSafe(line.slice(idx + 1).trim()) + ')');
  }
  lines.push('    res, err := http.DefaultClient.Do(req)');
  lines.push('    if err != nil {');
  lines.push('        panic(err)');
  lines.push('    }');
  lines.push('    defer res.Body.Close()');
  lines.push('    resBody, _ := io.ReadAll(res.Body)');
  lines.push('    fmt.Println(string(resBody))');
  lines.push('}');
  return lines.join('\n');
}

export function generatePhp(req: KangposRequest): string {
  const lines: string[] = [];
  lines.push('<?php');
  lines.push('$ch = curl_init();');
  const payload = bodyPayload(req);
  lines.push('curl_setopt($ch, CURLOPT_URL, ' + jsonSafe(req.url || '') + ');');
  lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);');
  lines.push('curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ' + jsonSafe(req.method) + ');');
  const headers = headerLines(req);
  if (headers.length > 0) {
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [');
    for (const line of headers) {
      lines.push('    ' + jsonSafe(line) + ',');
    }
    lines.push(']);');
  }
  if (payload.form) {
    lines.push('curl_setopt($ch, CURLOPT_POSTFIELDS, [');
    for (const f of payload.form) {
      if (f.type === 'file') {
        lines.push('    ' + jsonSafe(f.name) + ' => new CURLStringFile(<file content>, ' + jsonSafe(f.fileName || 'file') + '),');
      } else {
        lines.push('    ' + jsonSafe(f.name) + ' => ' + jsonSafe(f.value) + ',');
      }
    }
    lines.push(']);');
  } else if (payload.bodyString) {
    lines.push('curl_setopt($ch, CURLOPT_POSTFIELDS, ' + jsonSafe(payload.bodyString) + ');');
  }
  lines.push('$response = curl_exec($ch);');
  lines.push('curl_close($ch);');
  lines.push('echo $response;');
  return lines.join('\n');
}

export function generateJavaScript(req: KangposRequest): string {
  const node = generateNode(req);
  return node;
}

export function generateCsharp(req: KangposRequest): string {
  const lines: string[] = [];
  lines.push('using System;');
  lines.push('using System.Net.Http;');
  lines.push('using System.Text;');
  lines.push('using System.Threading.Tasks;');
  lines.push('');
  lines.push('class Program {');
  lines.push('    static async Task Main() {');
  lines.push('        using var client = new HttpClient();');
  const payload = bodyPayload(req);
  if (payload.bodyString && !payload.form) {
    lines.push('        var content = new StringContent(' + jsonSafe(payload.bodyString) + ', Encoding.UTF8, ' + jsonSafe(req.body.type === 'json' ? 'application/json' : 'text/plain') + ');');
    lines.push('        var response = await client.' + methodCsharp(req.method) + '(' + jsonSafe(req.url || '') + ', content);');
  } else {
    lines.push('        var response = await client.' + methodCsharp(req.method) + '(' + jsonSafe(req.url || '') + ');');
  }
  for (const line of headerLines(req)) {
    const idx = line.indexOf(':');
    lines.push('        client.DefaultRequestHeaders.Add(' + jsonSafe(line.slice(0, idx).trim()) + ', ' + jsonSafe(line.slice(idx + 1).trim()) + ');');
  }
  lines.push('        var body = await response.Content.ReadAsStringAsync();');
  lines.push('        Console.WriteLine(body);');
  lines.push('    }');
  lines.push('}');
  return lines.join('\n');
}

function methodCsharp(method: string): string {
  const m = (method || 'GET').toUpperCase();
  if (m === 'GET') return 'GetAsync';
  if (m === 'POST') return 'PostAsync';
  if (m === 'PUT') return 'PutAsync';
  if (m === 'DELETE') return 'DeleteAsync';
  if (m === 'PATCH') return 'PatchAsync';
  if (m === 'HEAD') return 'SendAsync(new HttpRequestMessage(HttpMethod.Head, "")';
  return 'GetAsync';
}

export const CODEGEN_LANGUAGES = [
  { id: 'curl', label: 'cURL' },
  { id: 'node', label: 'Node.js (fetch)' },
  { id: 'javascript', label: 'JavaScript (fetch)' },
  { id: 'python', label: 'Python (requests)' },
  { id: 'go', label: 'Go (net/http)' },
  { id: 'php', label: 'PHP (cURL)' },
  { id: 'csharp', label: 'C# (HttpClient)' }
];

export function generateCode(lang: string, req: KangposRequest): string {
  switch (lang) {
    case 'curl':
      return generateCurl(req);
    case 'node':
      return generateNode(req);
    case 'javascript':
      return generateJavaScript(req);
    case 'python':
      return generatePython(req);
    case 'go':
      return generateGo(req);
    case 'php':
      return generatePhp(req);
    case 'csharp':
      return generateCsharp(req);
    default:
      return generateCurl(req);
  }
}
