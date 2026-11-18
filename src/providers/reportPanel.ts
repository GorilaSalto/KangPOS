import * as vscode from 'vscode';
import { CollectionRunReport } from '../data/runCollection';
import { formatBytes, formatDuration, methodColor } from '../utils/utils';

export class ReportPanel {
  private static panel: vscode.WebviewPanel | undefined;
  private static report: CollectionRunReport | null = null;

  static show(report: CollectionRunReport): void {
    ReportPanel.report = report;
    if (!ReportPanel.panel) {
      const panel = vscode.window.createWebviewPanel(
        'kangposReport',
        'Kangpos · Run Report',
        { viewColumn: vscode.ViewColumn.Active },
        { enableScripts: true, retainContextWhenHidden: false }
      );
      ReportPanel.panel = panel;
      panel.onDidDispose(() => {
        ReportPanel.panel = undefined;
      });
      panel.webview.onDidReceiveMessage(async (msg: { command: string }) => {
        if (msg.command === 'save' && ReportPanel.report) {
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(ReportPanel.report.collectionName.replace(/[^\w\-]+/g, '_') + '-report.json')
          });
          if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(ReportPanel.report, null, 2), 'utf8'));
            void vscode.window.showInformationMessage('Kangpos: Report saved to ' + uri.fsPath);
          }
        }
      });
    }
    ReportPanel.panel.title = 'Kangpos · Run Report · ' + report.collectionName;
    ReportPanel.panel.webview.html = reportHtml(report);
    ReportPanel.panel.reveal();
  }
}

export function reportHtml(report: CollectionRunReport): string {
  const duration = formatDuration(report.finishedAt - report.startedAt);
  const rows = report.results
    .map(r => {
      const color = methodColor(r.method);
      const statusPill = r.error
        ? '<span class="pill err">ERR</span>'
        : '<span class="pill ' + (r.status >= 200 && r.status < 300 ? 'ok' : r.status >= 300 && r.status < 400 ? 'warn' : 'err') + '">' + r.status + '</span>';
      const resultIcon = r.ok ? '<span class="rpass">&#10004;</span>' : '<span class="rfail">&#10008;</span>';
      const asserts = r.asserts.length
        ? '<ul class="asserts">' +
          r.asserts
            .map(a => '<li class="' + (a.pass ? 'apass' : 'afail') + '">' + (a.pass ? '&#10004;' : '&#10008;') + ' ' + esc(a.name) + ' — ' + esc(a.message) + '</li>')
            .join('') +
          '</ul>'
        : '';
      const error = r.error ? '<div class="rerror">' + esc(r.error) + '</div>' : '';
      return '<tr>' +
        '<td>' + resultIcon + '</td>' +
        '<td><span class="method" style="background:' + color + '">' + esc(r.method) + '</span></td>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td>' + statusPill + '</td>' +
        '<td class="num">' + Math.round(r.timeMs) + ' ms</td>' +
        '</tr>' +
        (error || asserts ? '<tr class="detail"><td colspan="5">' + error + asserts + '</td></tr>' : '');
    })
    .join('');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; color: var(--vscode-editor-foreground, #ccc); background: var(--vscode-editor-background, #1e1e1e); font-family: var(--vscode-font-family, sans-serif); font-size: 13px; }
.summary { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.big { font-size: 15px; font-weight: 700; }
.passed { color: #66bb6a; }
.failed { color: #ef5350; }
.muted { color: var(--vscode-descriptionForeground, #888); }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--vscode-panel-border, #444); color: var(--vscode-descriptionForeground, #999); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
td { padding: 6px 10px; border-bottom: 1px solid rgba(128,128,128,0.12); vertical-align: top; }
.method { color: #fff; border-radius: 3px; padding: 1px 7px; font-size: 10px; font-weight: 700; font-family: var(--vscode-editor-font-family, monospace); }
.pill { border-radius: 10px; padding: 1px 9px; font-size: 10px; font-weight: 700; color: #fff; }
.pill.ok { background: #2e7d32; }
.pill.warn { background: #ef6c00; }
.pill.err { background: #c62828; }
.rpass { color: #66bb6a; font-weight: 700; }
.rfail { color: #ef5350; font-weight: 700; }
.num { text-align: right; white-space: nowrap; }
.asserts { margin: 4px 0 0; padding-left: 18px; }
.asserts li { margin: 2px 0; }
.apass { color: #66bb6a; }
.afail { color: #ef5350; }
.rerror { color: #ef5350; margin-bottom: 4px; font-family: var(--vscode-editor-font-family, monospace); }
button { background: #29b6f6; color: #fff; border: none; border-radius: 2px; padding: 5px 14px; cursor: pointer; font-size: 12px; }
</style>
</head>
<body>
<div class="summary">
  <span class="big">${esc(report.collectionName)}</span>
  <span class="passed">${report.passed} passed</span>
  <span class="failed">${report.failed} failed</span>
  <span class="muted">${report.total} requests · ${esc(duration)}</span>
  <div style="flex:1"></div>
  <button id="saveBtn">Save Report</button>
</div>
<table>
<thead><tr><th></th><th>Method</th><th>Request</th><th>Status</th><th>Time</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<script>
var vscode = acquireVsCodeApi();
document.getElementById('saveBtn').addEventListener('click', function () {
  vscode.postMessage({ command: 'save' });
});
</script>
</body>
</html>`;
}

function esc(s: string): string {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
