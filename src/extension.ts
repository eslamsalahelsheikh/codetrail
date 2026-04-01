import * as vscode from 'vscode';
import { StorageManager } from './storage/StorageManager';
import { GitService } from './git/GitService';
import { ActivityTracker } from './tracker/ActivityTracker';
import { LLMSummarizer } from './summarizer/LLMSummarizer';
import { SidebarProvider } from './ui/SidebarProvider';
import { StatusBarManager } from './ui/StatusBarManager';
import { CodeTrailHoverProvider } from './ui/HoverProvider';
import { registerCommands } from './commands';
import { log, logError, disposeLogger } from './utils/logger';

let activityTracker: ActivityTracker | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  log('CodeTrail activating...');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    log('No workspace folder found — CodeTrail will not activate.');
    return;
  }

  try {
    // Initialize Git
    const git = new GitService();
    const isGitRepo = await git.initialize(workspaceFolder);
    if (!isGitRepo) {
      log('Not a git repository — CodeTrail will not activate.');
      return;
    }

    // Initialize Storage
    const storage = new StorageManager(context);
    await storage.initialize();

    // Initialize LLM
    const llm = new LLMSummarizer();

    // Initialize UI
    const statusBar = new StatusBarManager();
    context.subscriptions.push(statusBar);
    statusBar.show();

    const sidebar = new SidebarProvider(context.extensionUri, storage, git);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar)
    );

    // Initialize Hover Provider
    const repoRoot = git.getRepoRoot();
    if (repoRoot) {
      const hoverProvider = new CodeTrailHoverProvider(storage, repoRoot);
      context.subscriptions.push(
        vscode.languages.registerHoverProvider({ scheme: 'file' }, hoverProvider)
      );
    }

    // Initialize Activity Tracker
    activityTracker = new ActivityTracker(storage, git);
    context.subscriptions.push(activityTracker);
    await activityTracker.start();

    // Register Commands
    registerCommands(context, {
      storage,
      git,
      tracker: activityTracker,
      llm,
      sidebar,
      statusBar,
    });

    // Refresh sidebar when config changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('codetrail')) {
          sidebar.refresh();
        }
      })
    );

    log('CodeTrail activated successfully');
  } catch (err) {
    logError('Failed to activate CodeTrail', err);
  }
}

export function deactivate(): void {
  log('CodeTrail deactivating...');
  activityTracker?.dispose();
  disposeLogger();
}
