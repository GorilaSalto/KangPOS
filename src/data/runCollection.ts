import * as vscode from 'vscode';
import { HttpClientConfig, HttpResponse, KangposCollection, KangposRequest, RunAssertResult, RunResult } from '../types';
import { evaluateAsserts } from '../utils/asserts';
import { sendRequest } from '../utils/http';
import { deepClone, interpolateVars } from '../utils/utils';
import { store } from './store';

export function httpClientConfig(): HttpClientConfig {
  const cfg = vscode.workspace.getConfiguration('kangpos');
  return {
    timeout: cfg.get<number>('requestTimeout', 0),
    followRedirects: cfg.get<boolean>('followRedirects', true),
    maxRedirects: cfg.get<number>('maxRedirects', 10),
    verifySsl: cfg.get<boolean>('verifySsl', true),
    proxy: cfg.get<string>('proxy', '') || ''
  };
}

export function resolveRequest(req: KangposRequest, vars: Record<string, string>): KangposRequest {
  const resolved = deepClone(req);
  resolved.url = interpolateVars(resolved.url || '', vars);
  resolved.name = interpolateVars(resolved.name || '', vars);
  resolved.headers = (resolved.headers || []).map(h => ({ ...h, name: interpolateVars(h.name, vars), value: interpolateVars(h.value, vars) }));
  if (resolved.auth) {
    resolved.auth.basic = {
      username: interpolateVars(resolved.auth.basic.username, vars),
      password: interpolateVars(resolved.auth.basic.password, vars)
    };
    resolved.auth.bearer = { token: interpolateVars(resolved.auth.bearer.token, vars) };
    resolved.auth.apikey = {
      key: interpolateVars(resolved.auth.apikey.key, vars),
      value: interpolateVars(resolved.auth.apikey.value, vars),
      in: resolved.auth.apikey.in
    };
    resolved.auth.oauth2 = {
      ...resolved.auth.oauth2,
      tokenUrl: interpolateVars(resolved.auth.oauth2.tokenUrl, vars),
      clientId: interpolateVars(resolved.auth.oauth2.clientId, vars),
      clientSecret: interpolateVars(resolved.auth.oauth2.clientSecret, vars),
      scope: interpolateVars(resolved.auth.oauth2.scope, vars),
      username: interpolateVars(resolved.auth.oauth2.username, vars),
      password: interpolateVars(resolved.auth.oauth2.password, vars),
      accessToken: interpolateVars(resolved.auth.oauth2.accessToken, vars)
    };
  }
  if (resolved.body) {
    resolved.body.raw = interpolateVars(resolved.body.raw, vars);
    resolved.body.form = (resolved.body.form || []).map(f => ({ ...f, name: interpolateVars(f.name, vars), value: interpolateVars(f.value, vars) }));
    resolved.body.formdata = (resolved.body.formdata || []).map(f => ({ ...f, name: interpolateVars(f.name, vars), value: interpolateVars(f.value, vars) }));
    resolved.body.graphql = {
      query: interpolateVars(resolved.body.graphql.query, vars),
      variables: interpolateVars(resolved.body.graphql.variables, vars)
    };
  }
  if (resolved.tests) {
    resolved.tests = resolved.tests.map(t => ({
      ...t,
      path: interpolateVars(t.path, vars),
      value: interpolateVars(t.value, vars)
    }));
  }
  return resolved;
}

export interface SendOutcome {
  response?: HttpResponse;
  error?: string;
  tests: RunAssertResult[];
  testPassed: number;
  testFailed: number;
}

export async function sendResolvedRequest(
  original: KangposRequest,
  collectionId: string | undefined,
  onEnvSet?: (name: string, value: string) => void,
  activeEnvId?: string
): Promise<SendOutcome> {
  const vars = store.variablesFor(collectionId);
  const resolved = resolveRequest(original, vars);
  let response: HttpResponse | undefined;
  let error: string | undefined;
  try {
    response = await sendRequest(resolved, httpClientConfig());
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const outcomes: RunAssertResult[] = [];
  let sets: { name: string; value: string }[] = [];
  if (response) {
    const result = evaluateAsserts(resolved.tests || [], response, vars);
    outcomes.push(...result.outcomes);
    sets = result.sets;
    if (resolved.script && resolved.script.trim()) {
      const scriptResult = runScript(resolved.script, response, vars);
      outcomes.push(...scriptResult.outcomes);
      sets = sets.concat(scriptResult.sets);
      outcomes.push(...scriptResult.logs.map(log => ({ pass: true, name: 'console.log', message: log })));
    }
  }
  for (const set of sets) {
    if (onEnvSet) onEnvSet(set.name, set.value);
    else if (activeEnvId) store.setVarInto(activeEnvId, set.name, set.value);
  }
  const testPassed = outcomes.filter(o => o.pass).length;
  const testFailed = outcomes.filter(o => !o.pass).length;
  return { response, error, tests: outcomes, testPassed, testFailed };
}

export function runScript(code: string, response: HttpResponse, vars: Record<string, string>): { outcomes: RunAssertResult[]; sets: { name: string; value: string }[]; logs: string[] } {
  const vm = require('vm') as typeof import('vm');
  const outcomes: RunAssertResult[] = [];
  const sets: { name: string; value: string }[] = [];
  const logs: string[] = [];
  let parsedJson: unknown;
  let jsonOk = true;
  try {
    parsedJson = JSON.parse(response.body);
  } catch {
    jsonOk = false;
  }
  const headerObj: Record<string, string> = {};
  for (const h of response.headers) headerObj[h.name] = h.value;
  const sandbox: Record<string, unknown> = {
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: headerObj,
      body: response.body,
      json: jsonOk ? parsedJson : undefined,
      time: Math.round(response.timeMs)
    },
    env: { ...vars },
    console: {
      log: (...args: unknown[]) => logs.push(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
      error: (...args: unknown[]) => logs.push('[error] ' + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
      warn: (...args: unknown[]) => logs.push('[warn] ' + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    }
  };
  sandbox['kangpos'] = {
    setEnvVar: (name: string, value: string): void => {
      if (name) sets.push({ name, value: String(value) });
    },
    getEnvVar: (name: string): string | undefined => vars[name],
    getVar: (name: string): string | undefined => vars[name],
    setVar: (name: string, value: string): void => {
      if (name) sets.push({ name, value: String(value) });
    },
    assert: (condition: unknown, message?: string): void => {
      outcomes.push({ pass: !!condition, name: 'assert', message: message || (condition ? 'assert passed' : 'assert failed') });
    }
  };
  try {
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { timeout: 3000 });
  } catch (e) {
    outcomes.push({ pass: false, name: 'script', message: 'Script error: ' + (e instanceof Error ? e.message : String(e)) });
  }
  return { outcomes, sets, logs };
}

export interface CollectionRunReport {
  collectionName: string;
  startedAt: number;
  finishedAt: number;
  total: number;
  passed: number;
  failed: number;
  results: RunResult[];
}

export async function runCollection(collectionId: string, parallel: boolean, parallelCount?: number): Promise<CollectionRunReport | null> {
  const col = store.getCollection(collectionId);
  if (!col) return null;
  const requests = store.listRequests(collectionId);
  const report: CollectionRunReport = {
    collectionName: col.name,
    startedAt: Date.now(),
    finishedAt: 0,
    total: requests.length,
    passed: 0,
    failed: 0,
    results: []
  };
  if (requests.length === 0) {
    report.finishedAt = Date.now();
    return report;
  }
  const runOne = async (request: KangposRequest): Promise<RunResult> => {
    const outcome = await sendResolvedRequest(request, collectionId, undefined, store.activeEnvId);
    const result: RunResult = {
      name: request.name,
      method: request.method,
      status: outcome.response ? outcome.response.status : 0,
      ok: !outcome.error && outcome.testFailed === 0,
      timeMs: outcome.response ? outcome.response.timeMs : 0,
      error: outcome.error,
      asserts: outcome.tests
    };
    return result;
  };
  if (parallel) {
    const count = Math.max(2, Math.min(10, parallelCount || 4));
    const queue = [...requests.map(r => r.request)];
    const results: RunResult[] = new Array(requests.length);
    let index = 0;
    const worker = async (): Promise<void> => {
      while (true) {
        const current = index++;
        if (current >= queue.length) break;
        results[current] = await runOne(queue[current]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(count, queue.length) }, () => worker()));
    report.results = results;
  } else {
    for (const entry of requests) {
      report.results.push(await runOne(entry.request));
    }
  }
  report.finishedAt = Date.now();
  report.passed = report.results.filter(r => r.ok).length;
  report.failed = report.results.filter(r => !r.ok).length;
  return report;
}

export async function pickCollection(collections: KangposCollection[]): Promise<KangposCollection | undefined> {
  if (collections.length === 0) return undefined;
  const picks = collections.map((c, i) => ({ label: c.name, description: store.listRequests(c._id).length + ' requests', index: i }));
  const chosen = await vscode.window.showQuickPick(picks, { placeHolder: 'Select collection' });
  return chosen ? collections[chosen.index] : undefined;
}
