import * as vscode from 'vscode';
import { StorageManager } from '../storage/StorageManager';
import { GitService } from '../git/GitService';
import { Session } from '../storage/types';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codetrail.sidebar';
  private view?: vscode.WebviewView;

  constructor(
    private extensionUri: vscode.Uri,
    private storage: StorageManager,
    private git: GitService
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'refresh':
          await this.refresh();
          break;
        case 'openFile':
          if (message.filePath) {
            const repoRoot = this.git.getRepoRoot();
            if (repoRoot) {
              const uri = vscode.Uri.file(`${repoRoot}/${message.filePath}`);
              await vscode.commands.executeCommand('vscode.open', uri);
            }
          }
          break;
      }
    });

    this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }

    const session = this.storage.getCurrentSession();
    const branch = this.git.getCurrentBranch() ?? 'unknown';
    const sessions = await this.storage.listSessions(this.git.getRepoRoot());

    this.view.webview.html = this.buildHTML(session, branch, sessions);
  }

  private buildHTML(
    session: Session | undefined,
    branch: string,
    allSessions: Session[]
  ): string {
    const totalTime = session
      ? session.fileVisits.reduce((sum, v) => sum + v.durationMs, 0)
      : 0;

    const topFiles = session
      ? [...session.fileVisits]
          .sort((a, b) => b.durationMs - a.durationMs)
          .slice(0, 10)
      : [];

    const recentEdits = session
      ? [...session.edits]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)
      : [];

    const recentCommands = session
      ? [...session.terminalCommands]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 8)
      : [];

    const otherBranches = allSessions
      .filter((s) => s.branch !== branch)
      .slice(0, 5);

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    body {
      padding: 0 12px 12px;
      margin: 0;
    }
    h2 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-sideBarSectionHeader-foreground);
      margin: 16px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }
    .branch-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
      padding: 12px 0 4px;
    }
    .stat {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin: 2px 0;
    }
    .summary-box {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 4px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    .file-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .file-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .file-time {
      flex-shrink: 0;
      margin-left: 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }
    .edit-item, .cmd-item {
      font-size: 12px;
      padding: 2px 4px;
      color: var(--vscode-descriptionForeground);
    }
    .cmd-fail {
      color: var(--vscode-errorForeground);
    }
    .empty {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      font-size: 12px;
      padding: 8px 0;
    }
    .branch-link {
      font-size: 12px;
      padding: 3px 4px;
      border-radius: 3px;
      color: var(--vscode-descriptionForeground);
    }
    .branch-link:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .badge {
      display: inline-block;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      margin-left: 6px;
    }
  </style>
</head>
<body>
  <div class="branch-name">${escapeHtml(branch)}</div>
  <div class="stat">${formatDuration(totalTime)} active · ${session?.fileVisits.length ?? 0} files · ${session?.edits.length ?? 0} edits</div>

  ${session?.summary ? `<div class="summary-box">${escapeHtml(session.summary)}</div>` : ''}

  <h2>Files <span class="badge">${topFiles.length}</span></h2>
  ${
    topFiles.length > 0
      ? topFiles
          .map(
            (f) => `
    <div class="file-item" onclick="openFile('${escapeHtml(f.filePath)}')">
      <span class="file-name">${escapeHtml(f.filePath.split('/').pop() ?? f.filePath)}</span>
      <span class="file-time">${formatDuration(f.durationMs)}</span>
    </div>`
          )
          .join('')
      : '<div class="empty">No files tracked yet. Start editing!</div>'
  }

  <h2>Recent Edits <span class="badge">${recentEdits.length}</span></h2>
  ${
    recentEdits.length > 0
      ? recentEdits
          .map(
            (e) =>
              `<div class="edit-item">${escapeHtml(e.filePath.split('/').pop() ?? e.filePath)} :${e.startLine + 1} (+${e.linesAdded}/-${e.linesRemoved})</div>`
          )
          .join('')
      : '<div class="empty">No edits tracked yet.</div>'
  }

  <h2>Terminal <span class="badge">${recentCommands.length}</span></h2>
  ${
    recentCommands.length > 0
      ? recentCommands
          .map(
            (c) =>
              `<div class="cmd-item${c.exitCode && c.exitCode !== 0 ? ' cmd-fail' : ''}">$ ${escapeHtml(c.command)}${c.exitCode !== undefined && c.exitCode !== 0 ? ` (exit ${c.exitCode})` : ''}</div>`
          )
          .join('')
      : '<div class="empty">No terminal commands tracked.</div>'
  }

  ${
    otherBranches.length > 0
      ? `<h2>Other Branches</h2>${otherBranches.map((s) => `<div class="branch-link">${escapeHtml(s.branch)} — ${formatDuration(s.fileVisits.reduce((sum, v) => sum + v.durationMs, 0))}</div>`).join('')}`
      : ''
  }

  <script>
    const vscode = acquireVsCodeApi();
    function openFile(filePath) {
      vscode.postMessage({ type: 'openFile', filePath });
    }
  </script>
</body>
</html>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
