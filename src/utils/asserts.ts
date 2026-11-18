import { AssertRule, RunAssertResult } from '../types';
import { getJsonPath, interpolateVars } from './utils';

export interface EnvSet {
  name: string;
  value: string;
}

export interface AssertEvalResult {
  outcomes: RunAssertResult[];
  sets: EnvSet[];
  logs: string[];
}

export interface EvaluableResponse {
  status: number;
  statusText: string;
  headers: { name: string; value: string }[];
  body: string;
  timeMs: number;
}

function tryParseJson(text: string): { ok: boolean; value: unknown } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: undefined };
  }
}

function compareValues(actual: unknown, expected: string): boolean {
  if (typeof actual === 'number') return actual === Number(expected);
  if (typeof actual === 'boolean') return String(actual) === expected.toLowerCase();
  return String(actual) === expected;
}

function numericCompare(actual: unknown, expected: number): number | null {
  const n = Number(actual);
  if (isNaN(n)) return null;
  return n;
}

export function evaluateAsserts(
  rules: AssertRule[],
  res: EvaluableResponse,
  vars: Record<string, string>
): AssertEvalResult {
  const outcomes: RunAssertResult[] = [];
  const sets: EnvSet[] = [];
  const logs: string[] = [];
  const parsed = tryParseJson(res.body);
  for (const rule of rules || []) {
    if (rule.disabled) continue;
    const pathVal = interpolateVars(rule.path || '', vars);
    const valueVal = interpolateVars(rule.value || '', vars);
    const headerValue = (name: string): string | undefined => {
      const h = res.headers.find(x => x.name.toLowerCase() === name.toLowerCase());
      return h ? h.value : undefined;
    };
    switch (rule.type) {
      case 'status': {
        const actual = res.status;
        const expected = Number(valueVal);
        let pass = false;
        switch (rule.action) {
          case 'equals':
            pass = actual === expected;
            break;
          case 'not_equals':
            pass = actual !== expected;
            break;
          case 'less':
            pass = actual < expected;
            break;
          case 'greater':
            pass = actual > expected;
            break;
          case 'less_equals':
            pass = actual <= expected;
            break;
          case 'greater_equals':
            pass = actual >= expected;
            break;
          default:
            pass = actual === expected;
        }
        outcomes.push({
          pass,
          name: 'Status Code ' + rule.action,
          message: pass ? 'Status is ' + actual : 'Status ' + actual + ' not matching expected ' + valueVal
        });
        break;
      }
      case 'header': {
        const actual = headerValue(pathVal);
        let pass = false;
        let message = '';
        switch (rule.action) {
          case 'exists':
            pass = actual !== undefined;
            message = pass ? 'Header ' + pathVal + ' exists' : 'Header ' + pathVal + ' not found';
            break;
          case 'not_exists':
            pass = actual === undefined;
            message = pass ? 'Header ' + pathVal + ' does not exist' : 'Header ' + pathVal + ' exists';
            break;
          case 'equals':
            pass = actual !== undefined && actual === valueVal;
            message = pass ? 'Header ' + pathVal + ' equals ' + valueVal : 'Header ' + pathVal + ' is ' + (actual === undefined ? 'missing' : actual);
            break;
          case 'contains':
            pass = actual !== undefined && actual.includes(valueVal);
            message = pass ? 'Header ' + pathVal + ' contains ' + valueVal : 'Header ' + pathVal + ' does not contain ' + valueVal;
            break;
          case 'not_contains':
            pass = actual === undefined || !actual.includes(valueVal);
            message = pass ? 'Header ' + pathVal + ' does not contain ' + valueVal : 'Header ' + pathVal + ' contains ' + valueVal;
            break;
          case 'starts_with':
            pass = actual !== undefined && actual.startsWith(valueVal);
            message = pass ? 'Header ' + pathVal + ' starts with ' + valueVal : 'Header ' + pathVal + ' does not start with ' + valueVal;
            break;
          default:
            pass = false;
            message = 'Unknown action ' + rule.action;
        }
        outcomes.push({ pass, name: 'Header ' + rule.action, message });
        break;
      }
      case 'body': {
        if (!parsed.ok) {
          outcomes.push({ pass: false, name: 'Body ' + rule.action, message: 'Response body is not valid JSON' });
          break;
        }
        const found = getJsonPath(parsed.value, pathVal);
        let pass = false;
        let message = '';
        const actualStr = found.found ? String(found.value) : '';
        switch (rule.action) {
          case 'exists':
            pass = found.found;
            message = pass ? 'Path ' + pathVal + ' exists' : 'Path ' + pathVal + ' not found';
            break;
          case 'not_exists':
            pass = !found.found;
            message = pass ? 'Path ' + pathVal + ' does not exist' : 'Path ' + pathVal + ' exists';
            break;
          case 'equals':
            pass = found.found && compareValues(found.value, valueVal);
            message = pass ? 'Value equals ' + valueVal : 'Value ' + actualStr + ' not equal to ' + valueVal;
            break;
          case 'not_equals':
            pass = found.found && !compareValues(found.value, valueVal);
            message = pass ? 'Value not equal to ' + valueVal : 'Value equals ' + valueVal;
            break;
          case 'contains':
            pass = found.found && actualStr.includes(valueVal);
            message = pass ? 'Value contains ' + valueVal : 'Value does not contain ' + valueVal;
            break;
          case 'not_contains':
            pass = found.found && !actualStr.includes(valueVal);
            message = pass ? 'Value does not contain ' + valueVal : 'Value contains ' + valueVal;
            break;
          case 'starts_with':
            pass = found.found && actualStr.startsWith(valueVal);
            message = pass ? 'Value starts with ' + valueVal : 'Value does not start with ' + valueVal;
            break;
          case 'length_equals': {
            if (Array.isArray(found.value)) pass = found.value.length === Number(valueVal);
            else pass = found.found && actualStr.length === Number(valueVal);
            message = pass ? 'Length equals ' + valueVal : 'Length not equal to ' + valueVal;
            break;
          }
          case 'length_greater': {
            const len = Array.isArray(found.value) ? found.value.length : actualStr.length;
            pass = found.found && len > Number(valueVal);
            message = pass ? 'Length greater than ' + valueVal : 'Length not greater than ' + valueVal;
            break;
          }
          case 'length_less': {
            const len = Array.isArray(found.value) ? found.value.length : actualStr.length;
            pass = found.found && len < Number(valueVal);
            message = pass ? 'Length less than ' + valueVal : 'Length not less than ' + valueVal;
            break;
          }
          case 'greater': {
            const n = numericCompare(found.value, Number(valueVal));
            pass = found.found && n !== null && n > Number(valueVal);
            message = pass ? 'Value greater than ' + valueVal : 'Value not greater than ' + valueVal;
            break;
          }
          case 'less': {
            const n = numericCompare(found.value, Number(valueVal));
            pass = found.found && n !== null && n < Number(valueVal);
            message = pass ? 'Value less than ' + valueVal : 'Value not less than ' + valueVal;
            break;
          }
          default:
            message = 'Unknown action ' + rule.action;
        }
        outcomes.push({ pass, name: 'Body ' + rule.action, message });
        break;
      }
      case 'text': {
        let pass = false;
        let message = '';
        switch (rule.action) {
          case 'contains':
            pass = res.body.includes(valueVal);
            message = pass ? 'Body contains text' : 'Body does not contain text';
            break;
          case 'not_contains':
            pass = !res.body.includes(valueVal);
            message = pass ? 'Body does not contain text' : 'Body contains text';
            break;
          case 'equals':
            pass = res.body.trim() === valueVal;
            message = pass ? 'Body equals text' : 'Body not equal to text';
            break;
          case 'starts_with':
            pass = res.body.trimStart().startsWith(valueVal);
            message = pass ? 'Body starts with text' : 'Body does not start with text';
            break;
          case 'ends_with':
            pass = res.body.trimEnd().endsWith(valueVal);
            message = pass ? 'Body ends with text' : 'Body does not end with text';
            break;
          default:
            message = 'Unknown action ' + rule.action;
        }
        outcomes.push({ pass, name: 'Body Text ' + rule.action, message });
        break;
      }
      case 'time': {
        const expected = Number(valueVal);
        let pass = false;
        let message = '';
        switch (rule.action) {
          case 'less':
            pass = res.timeMs < expected;
            message = pass ? 'Time ' + Math.round(res.timeMs) + 'ms < ' + expected + 'ms' : 'Time ' + Math.round(res.timeMs) + 'ms not less than ' + expected + 'ms';
            break;
          case 'greater':
            pass = res.timeMs > expected;
            message = pass ? 'Time ' + Math.round(res.timeMs) + 'ms > ' + expected + 'ms' : 'Time not greater than ' + expected + 'ms';
            break;
          case 'less_equals':
            pass = res.timeMs <= expected;
            message = pass ? 'Time within ' + expected + 'ms' : 'Time exceeds ' + expected + 'ms';
            break;
          default:
            pass = res.timeMs < expected;
            message = 'Time check';
        }
        outcomes.push({ pass, name: 'Response Time ' + rule.action, message });
        break;
      }
      case 'env': {
        if (!parsed.ok) {
          outcomes.push({ pass: false, name: 'Set Env Var', message: 'Response body is not valid JSON' });
          break;
        }
        const found = getJsonPath(parsed.value, pathVal);
        if (found.found && rule.varName) {
          sets.push({ name: rule.varName, value: String(found.value) });
          outcomes.push({ pass: true, name: 'Set Env Var', message: 'Set {{' + rule.varName + '}} = ' + String(found.value).slice(0, 50) });
        } else if (!rule.varName) {
          outcomes.push({ pass: false, name: 'Set Env Var', message: 'Variable name is empty' });
        } else {
          outcomes.push({ pass: false, name: 'Set Env Var', message: 'Path ' + pathVal + ' not found in body' });
        }
        break;
      }
    }
  }
  return { outcomes, sets, logs };
}
