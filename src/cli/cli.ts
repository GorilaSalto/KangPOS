import * as fs from 'fs';
import * as path from 'path';
import { HttpClientConfig, KangposCollection, KangposEnv, KangposRequest, RunResult } from '../types';
import { evaluateAsserts } from '../utils/asserts';
import { sendRequest } from '../utils/http';
import { interpolateVars, prettyJson } from '../utils/utils';

interface CliArgs {
  collectionPath: string;
  envPath: string;
  envName: string;
  delay: number;
  reportPath: string;
  parallel: number;
  insecure: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    collectionPath: '',
    envPath: '',
    envName: '',
    delay: 0,
    reportPath: '',
    parallel: 0,
    insecure: false,
    help: false
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
      i++;
      return argv[i] !== undefined ? argv[i] : '';
    };
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '-c' || a === '--collection') args.collectionPath = next();
    else if (a === '-e' || a === '--environment') args.envPath = next();
    else if (a === '-n' || a === '--env-name') args.envName = next();
    else if (a === '-d' || a === '--delay') args.delay = parseInt(next(), 10) || 0;
    else if (a === '-o' || a === '--output') args.reportPath = next();
    else if (a === '-p' || a === '--parallel') args.parallel = parseInt(next(), 10) || 0;
    else if (a === '--insecure') args.insecure = true;
  }
  return args;
}

function usage(): void {
  console.log(`
Kangpos CLI - run Kangpos collections from the terminal

Usage: kangpos-cli -c <collection.json> [options]

Options:
  -c, --collection <file>    Kangpos collection JSON file (required)
  -e, --environment <file>   Environment file (.kangpos/environments.json or variables JSON)
  -n, --env-name <name>      Select environment by name when environments file has multiple
  -d, --delay <ms>           Delay between requests in milliseconds
  -o, --output <file>        Write report to JSON file
  -p, --parallel <n>         Run n requests in parallel
  --insecure                 Disable SSL certificate verification
  -h, --help                 Show this help
`);
}

function loadVariables(envPath: string, envName: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!envPath) return vars;
  const raw = JSON.parse(fs.readFileSync(path.resolve(envPath), 'utf8'));
  if (Array.isArray(raw)) {
    for (const v of raw as { name: string; value: string }[]) {
      if (v.name) vars[v.name] = v.value;
    }
    return vars;
  }
  if (raw.variables && Array.isArray(raw.variables)) {
    for (const v of raw.variables) {
      if (v.name) vars[v.name] = v.value;
    }
    return vars;
  }
  if (raw.environments && Array.isArray(raw.environments)) {
    const envs = raw.environments as KangposEnv[];
    const global = envs.find(e => e.type === 'g');
    if (global) {
      for (const v of global.variables) if (v.name) vars[v.name] = v.value;
    }
    let selected: KangposEnv | undefined;
    if (envName) selected = envs.find(e => e.name === envName);
    if (!selected && raw.activeEnvId) selected = envs.find(e => e._id === raw.activeEnvId);
    if (!selected) selected = envs.find(e => e.type !== 'g');
    if (selected) {
      for (const v of selected.variables) if (v.name) vars[v.name] = v.value;
    }
    return vars;
  }
  for (const key of Object.keys(raw)) {
    if (typeof raw[key] === 'string' || typeof raw[key] === 'number') vars[key] = String(raw[key]);
  }
  return vars;
}

function flatten(collection: KangposCollection): KangposRequest[] {
  const out: KangposRequest[] = [];
  const walk = (items: KangposCollection['items']): void => {
    for (const item of items) {
      if ((item as { type?: string }).type === 'folder') {
        walk((item as { items: KangposCollection['items'] }).items);
      } else {
        out.push(item as unknown as KangposRequest);
      }
    }
  };
  walk(collection.items || []);
  return out;
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return '\x1b[32m' + status + '\x1b[0m';
  if (status >= 300 && status < 400) return '\x1b[33m' + status + '\x1b[0m';
  return '\x1b[31m' + status + '\x1b[0m';
}

async function runSequential(requests: KangposRequest[], vars: Record<string, string>, config: HttpClientConfig, delay: number, results: RunResult[]): Promise<void> {
  for (const request of requests) {
    results.push(await runOne(request, vars, config));
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function runParallel(requests: KangposRequest[], vars: Record<string, string>, config: HttpClientConfig, count: number, results: RunResult[]): Promise<void> {
  let index = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const current = index++;
      if (current >= requests.length) break;
      results[current] = await runOne(requests[current], vars, config);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(2, count), 10), }, () => worker()));
}

async function runOne(request: KangposRequest, vars: Record<string, string>, config: HttpClientConfig): Promise<RunResult> {
  const resolved = cloneRequest(request);
  resolved.url = interpolateVars(resolved.url || '', vars);
  resolved.headers = (resolved.headers || []).map(h => ({ ...h, name: interpolateVars(h.name, vars), value: interpolateVars(h.value, vars) }));
  if (resolved.auth) {
    resolved.auth.basic.username = interpolateVars(resolved.auth.basic.username, vars);
    resolved.auth.basic.password = interpolateVars(resolved.auth.basic.password, vars);
    resolved.auth.bearer.token = interpolateVars(resolved.auth.bearer.token, vars);
    resolved.auth.apikey.key = interpolateVars(resolved.auth.apikey.key, vars);
    resolved.auth.apikey.value = interpolateVars(resolved.auth.apikey.value, vars);
  }
  if (resolved.body) {
    resolved.body.raw = interpolateVars(resolved.body.raw, vars);
    resolved.body.form = (resolved.body.form || []).map(f => ({ ...f, name: interpolateVars(f.name, vars), value: interpolateVars(f.value, vars) }));
    resolved.body.graphql.query = interpolateVars(resolved.body.graphql.query, vars);
    resolved.body.graphql.variables = interpolateVars(resolved.body.graphql.variables, vars);
  }
  const tests = (resolved.tests || []).map(t => ({ ...t, path: interpolateVars(t.path, vars), value: interpolateVars(t.value, vars) }));
  let response;
  let error: string | undefined;
  try {
    response = await sendRequest(resolved, config);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  let asserts: RunResult['asserts'] = [];
  if (response) {
    const outcome = evaluateAsserts(tests, response, vars);
    asserts = outcome.outcomes;
  }
  return {
    name: request.name,
    method: request.method,
    status: response ? response.status : 0,
    ok: !error && asserts.every(a => a.pass),
    timeMs: response ? response.timeMs : 0,
    error,
    asserts
  };
}

function cloneRequest(req: KangposRequest): KangposRequest {
  return JSON.parse(JSON.stringify(req)) as KangposRequest;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (args.help || !args.collectionPath) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  const collectionFile = path.resolve(args.collectionPath);
  if (!fs.existsSync(collectionFile)) {
    console.error('Collection file not found: ' + collectionFile);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(collectionFile, 'utf8'));
  const collections: KangposCollection[] = Array.isArray(raw) ? raw : raw.type === 'kangpos' && raw.collections ? raw.collections : [raw];
  const collection = collections[0];
  if (!collection) {
    console.error('No collection found in file');
    process.exit(1);
  }
  const requests = flatten(collection);
  if (requests.length === 0) {
    console.log('Collection "' + collection.name + '" has no requests');
    process.exit(0);
  }
  const vars = loadVariables(args.envPath, args.envName);
  const config: HttpClientConfig = {
    timeout: 30000,
    followRedirects: true,
    maxRedirects: 10,
    verifySsl: !args.insecure,
    proxy: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
  };
  console.log('\nKangpos CLI · Running collection "' + collection.name + '" · ' + requests.length + ' requests\n');
  const results: RunResult[] = [];
  const started = Date.now();
  if (args.parallel > 0) {
    await runParallel(requests, vars, config, args.parallel, results);
  } else {
    await runSequential(requests, vars, config, args.delay, results);
  }
  const duration = Date.now() - started;
  for (const r of results) {
    const icon = r.ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m';
    const status = r.error ? '\x1b[31mERR\x1b[0m' : statusColor(r.status);
    const time = Math.round(r.timeMs) + 'ms';
    console.log(icon + '  ' + r.method.padEnd(7) + ' ' + status + '  ' + time.padStart(9) + '  ' + r.name);
    if (r.error) console.log('        \x1b[31m' + r.error + '\x1b[0m');
    for (const a of r.asserts) {
      const mark = a.pass ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m';
      console.log('    ' + mark + ' ' + a.name + ' — ' + a.message);
    }
  }
  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log('\n' + passed + ' passed, ' + failed + ' failed · ' + results.length + ' total · ' + duration + 'ms\n');
  if (args.reportPath) {
    const report = {
      type: 'kangpos-report',
      version: 1,
      collection: collection.name,
      startedAt: started,
      finishedAt: Date.now(),
      total: results.length,
      passed,
      failed,
      results
    };
    fs.writeFileSync(path.resolve(args.reportPath), JSON.stringify(report, null, 2), 'utf8');
    console.log('Report written to ' + path.resolve(args.reportPath));
  } else if (process.env.KANGPOS_REPORT) {
    const report = {
      type: 'kangpos-report',
      version: 1,
      collection: collection.name,
      startedAt: started,
      finishedAt: Date.now(),
      total: results.length,
      passed,
      failed,
      results
    };
    console.log(prettyJson(JSON.stringify(report)));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
