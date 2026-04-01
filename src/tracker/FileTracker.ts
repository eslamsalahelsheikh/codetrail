import * as vscode from 'vscode';
import * as path from 'path';
import { Session, FileVisit } from '../storage/types';
import { Config } from '../utils/config';
import { minimatch } from '../utils/minimatch';

export class FileTracker implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private activeFile: string | undefined;
  private activeFileOpenedAt: number | undefined;

  constructor(private getSession: () => Session | undefined, private repoRoot: string) {}

  start(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.onEditorChange(editor);
      })
    );

    if (vscode.window.activeTextEditor) {
      this.onEditorChange(vscode.window.activeTextEditor);
    }
  }

  private onEditorChange(editor: vscode.TextEditor | undefined): void {
    if (!Config.trackFiles) {
      return;
    }

    this.closeCurrentFile();

    if (!editor) {
      return;
    }

    const filePath = this.relativePath(editor.document.uri.fsPath);
    if (!filePath || this.isExcluded(filePath)) {
      return;
    }

    this.activeFile = filePath;
    this.activeFileOpenedAt = Date.now();
  }

  flush(): void {
    this.closeCurrentFile();
  }

  private closeCurrentFile(): void {
    if (!this.activeFile || !this.activeFileOpenedAt) {
      return;
    }

    const session = this.getSession();
    if (!session) {
      return;
    }

    const durationMs = Date.now() - this.activeFileOpenedAt;

    if (durationMs < 500) {
      this.activeFile = undefined;
      this.activeFileOpenedAt = undefined;
      return;
    }

    const existing = session.fileVisits.find((v) => v.filePath === this.activeFile);
    if (existing) {
      existing.durationMs += durationMs;
      existing.visitCount++;
      existing.closedAt = new Date().toISOString();
    } else {
      const visit: FileVisit = {
        filePath: this.activeFile,
        openedAt: new Date(this.activeFileOpenedAt).toISOString(),
        closedAt: new Date().toISOString(),
        durationMs,
        visitCount: 1,
      };
      session.fileVisits.push(visit);
    }

    this.activeFile = undefined;
    this.activeFileOpenedAt = undefined;
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
