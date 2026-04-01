import * as vscode from 'vscode';

function cfg(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('codetrail');
}

export const Config = {
  get trackingEnabled(): boolean {
    return cfg().get<boolean>('tracking.enabled', true);
  },
  get trackFiles(): boolean {
    return cfg().get<boolean>('tracking.files', true);
  },
  get trackEdits(): boolean {
    return cfg().get<boolean>('tracking.edits', true);
  },
  get trackSearches(): boolean {
    return cfg().get<boolean>('tracking.searches', true);
  },
  get trackTerminal(): boolean {
    return cfg().get<boolean>('tracking.terminal', true);
  },
  get excludePatterns(): string[] {
    return cfg().get<string[]>('tracking.excludePatterns', [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.vscode/**',
    ]);
  },
  get retentionDays(): number {
    return cfg().get<number>('privacy.retentionDays', 90);
  },
  get aiProvider(): string {
    return cfg().get<string>('ai.provider', 'ollama');
  },
  get ollamaEndpoint(): string {
    return cfg().get<string>('ai.ollamaEndpoint', 'http://localhost:11434');
  },
  get ollamaModel(): string {
    return cfg().get<string>('ai.ollamaModel', 'llama3.1');
  },
  get autoSummarize(): boolean {
    return cfg().get<boolean>('ai.autoSummarize', false);
  },
  get showStatusBar(): boolean {
    return cfg().get<boolean>('ui.showStatusBar', true);
  },
  get showHoverContext(): boolean {
    return cfg().get<boolean>('ui.showHoverContext', true);
  },
};
