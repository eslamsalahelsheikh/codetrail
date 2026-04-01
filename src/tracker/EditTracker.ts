import * as vscode from 'vscode';
import * as path from 'path';
import { Session, EditEvent } from '../storage/types';
import { Config } from '../utils/config';
import { minimatch } from '../utils/minimatch';
import { debounce } from '../utils/debounce';

export class EditTracker implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private pendingEdits = new Map<string, PendingEdit>();
  private flushDebounced: ReturnType<typeof debounce>;

  constructor(private getSession: () => Session | undefined, private repoRoot: string) {
    this.flushDebounced = debounce(() => this.flushPending(), 2000);
  }

  start(): void {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        this.onDocumentChange(e);
      })
    );
  }

  private onDocumentChange(e: vscode.TextDocumentChangeEvent): void {
    if (!Config.trackEdits) {
      return;
    }

    if (e.document.uri.scheme !== 'file') {
      return;
    }

    const filePath = this.relativePath(e.document.uri.fsPath);
    if (!filePath || this.isExcluded(filePath)) {
      return;
    }

    for (const change of e.contentChanges) {
      const startLine = change.range.start.line;
      const endLine = change.range.end.line;
      const newLines = change.text.split('\n').length - 1;
      const removedLines = endLine - startLine;

      const key = `${filePath}:${startLine}`;
      const existing = this.pendingEdits.get(key);
      if (existing) {
        existing.linesAdded += newLines;
        existing.linesRemoved += removedLines;
        existing.endLine = Math.max(existing.endLine, startLine + newLines);
      } else {
        this.pendingEdits.set(key, {
          filePath,
          startLine,
          endLine: startLine + newLines,
          linesAdded: newLines,
          linesRemoved: removedLines,
          timestamp: Date.now(),
        });
      }
    }

    this.flushDebounced();
  }

  flush(): void {
    this.flushDebounced.cancel();
    this.flushPending();
  }

  private flushPending(): void {
    const session = this.getSession();
    if (!session) {
      return;
    }

    for (const [, edit] of this.pendingEdits) {
      const event: EditEvent = {
        filePath: edit.filePath,
        timestamp: new Date(edit.timestamp).toISOString(),
        startLine: edit.startLine,
        endLine: edit.endLine,
        linesAdded: edit.linesAdded,
        linesRemoved: edit.linesRemoved,
      };
      session.edits.push(event);
    }
    this.pendingEdits.clear();
  }

  private relativePath(absPath: string): string | undefined {
    if (!absPath.startsWith(this.repoRoot)) {
      return undefined;
    }
    return path.relative(this.repoRoot, absPath).replace(/\\/g, '/');
  }

  private isExcluded(filePath: string): boolean {
    return Config.excludePatterns.some((pattern) => minimatch(filePath, pattern));
  }

  dispose(): void {
    this.flush();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

interface PendingEdit {
  filePath: string;
  startLine: number;
  endLine: number;
  linesAdded: number;
  linesRemoved: number;
  timestamp: number;
}
