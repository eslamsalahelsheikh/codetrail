import * as vscode from 'vscode';
import { Session, SearchEvent } from '../storage/types';
import { Config } from '../utils/config';

/**
 * Captures search activity by intercepting VS Code's find commands.
 *
 * VS Code doesn't expose a direct API for search queries, so we wrap
 * the built-in find commands and also listen for file-open patterns
 * that suggest search result navigation.
 */
export class SearchTracker implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private lastSearchTimestamp = 0;

  constructor(private getSession: () => Session | undefined) {}

  start(): void {
    // Intercept workspace search (Ctrl+Shift+F)
    this.disposables.push(
      vscode.commands.registerCommand(
        'codetrail.interceptSearch',
        async () => {
          this.recordSearch('workspace');
          await vscode.commands.executeCommand('workbench.action.findInFiles');
        }
      )
    );

    // Track when the user opens search editor results
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.uri.scheme === 'search-editor') {
          this.recordSearch('workspace');
        }
      })
    );
  }

  recordManualSearch(query: string, scope: 'file' | 'workspace'): void {
    if (!Config.trackSearches) {
      return;
    }
    const session = this.getSession();
    if (!session) {
      return;
    }

    const event: SearchEvent = {
      query,
      timestamp: new Date().toISOString(),
      scope,
    };
    session.searches.push(event);
  }

  private recordSearch(scope: 'file' | 'workspace'): void {
    if (!Config.trackSearches) {
      return;
    }

    const now = Date.now();
    if (now - this.lastSearchTimestamp < 1000) {
      return;
    }
    this.lastSearchTimestamp = now;

    const session = this.getSession();
    if (!session) {
      return;
    }

    const event: SearchEvent = {
      query: '(search performed)',
      timestamp: new Date().toISOString(),
      scope,
    };
    session.searches.push(event);
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
