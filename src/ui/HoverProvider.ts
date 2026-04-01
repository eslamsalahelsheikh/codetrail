import * as vscode from 'vscode';
import * as path from 'path';
import { StorageManager } from '../storage/StorageManager';
import { Config } from '../utils/config';

export class CodeTrailHoverProvider implements vscode.HoverProvider {
  constructor(
    private storage: StorageManager,
    private repoRoot: string
  ) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    if (!Config.showHoverContext) {
      return undefined;
    }

    const session = this.storage.getCurrentSession();
    if (!session) {
      return undefined;
    }

    const filePath = this.relativePath(document.uri.fsPath);
    if (!filePath) {
      return undefined;
    }

    const relevantEdits = session.edits.filter(
      (e) =>
        e.filePath === filePath &&
        position.line >= e.startLine &&
        position.line <= e.endLine
    );

    if (relevantEdits.length === 0) {
      return undefined;
    }

    const fileVisit = session.fileVisits.find((v) => v.filePath === filePath);
    const totalEdits = relevantEdits.length;
    const totalAdded = relevantEdits.reduce((sum, e) => sum + e.linesAdded, 0);
    const totalRemoved = relevantEdits.reduce((sum, e) => sum + e.linesRemoved, 0);
    const firstEdit = relevantEdits.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )[0];

    const lines: string[] = [
      `**CodeTrail** — Branch: \`${session.branch}\``,
      '',
      `This region was edited **${totalEdits}** time(s) (+${totalAdded}/-${totalRemoved} lines)`,
      `First edit: ${new Date(firstEdit.timestamp).toLocaleString()}`,
    ];

    if (fileVisit) {
      lines.push(`Time in file: ${formatDuration(fileVisit.durationMs)} (${fileVisit.visitCount} visits)`);
    }

    if (session.summary) {
      lines.push('', '---', '', `*${session.summary.substring(0, 200)}${session.summary.length > 200 ? '...' : ''}*`);
    }

    const content = new vscode.MarkdownString(lines.join('\n'));
    content.isTrusted = true;
    return new vscode.Hover(content);
  }

  private relativePath(absPath: string): string | undefined {
    if (!absPath.startsWith(this.repoRoot)) {
      return undefined;
    }
    return path.relative(this.repoRoot, absPath).replace(/\\/g, '/');
  }
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
