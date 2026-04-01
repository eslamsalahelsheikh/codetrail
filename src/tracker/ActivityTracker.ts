import * as vscode from 'vscode';
import { Session } from '../storage/types';
import { StorageManager } from '../storage/StorageManager';
import { GitService } from '../git/GitService';
import { FileTracker } from './FileTracker';
import { EditTracker } from './EditTracker';
import { SearchTracker } from './SearchTracker';
import { TerminalTracker } from './TerminalTracker';
import { Config } from '../utils/config';
import { log } from '../utils/logger';

const AUTO_SAVE_INTERVAL_MS = 30_000;

export class ActivityTracker implements vscode.Disposable {
  private fileTracker: FileTracker | undefined;
  private editTracker: EditTracker | undefined;
  private searchTracker: SearchTracker | undefined;
  private terminalTracker: TerminalTracker | undefined;
  private disposables: vscode.Disposable[] = [];
  private saveInterval: ReturnType<typeof setInterval> | undefined;
  private paused = false;

  constructor(
    private storage: StorageManager,
    private git: GitService
  ) {}

  async start(): Promise<void> {
    const repoRoot = this.git.getRepoRoot();
    const branch = this.git.getCurrentBranch();
    if (!repoRoot || !branch) {
      log('Cannot start tracking: no git repo detected');
      return;
    }

    await this.storage.getOrCreateSession(repoRoot, branch);

    const getSession = (): Session | undefined => {
      if (this.paused || !Config.trackingEnabled) {
        return undefined;
      }
      return this.storage.getCurrentSession();
    };

    this.fileTracker = new FileTracker(getSession, repoRoot);
    this.editTracker = new EditTracker(getSession, repoRoot);
    this.searchTracker = new SearchTracker(getSession);
    this.terminalTracker = new TerminalTracker(getSession);

    this.fileTracker.start();
    this.editTracker.start();
    this.searchTracker.start();
    this.terminalTracker.start();

    this.disposables.push(this.fileTracker, this.editTracker, this.searchTracker, this.terminalTracker);

    // Auto-save periodically
    this.saveInterval = setInterval(() => {
      this.storage.saveCurrentSession();
    }, AUTO_SAVE_INTERVAL_MS);

    // Watch for branch changes
    const branchWatcher = this.git.onBranchChange(async (newBranch) => {
      await this.onBranchSwitch(newBranch);
    });
    this.disposables.push(branchWatcher);

    log(`Tracking started on branch ${branch}`);
  }

  private async onBranchSwitch(newBranch: string): Promise<void> {
    this.flushAll();
    await this.storage.saveCurrentSession();

    const repoRoot = this.git.getRepoRoot();
    if (!repoRoot) {
      return;
    }

    await this.storage.getOrCreateSession(repoRoot, newBranch);
    log(`Switched to branch: ${newBranch}`);
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    if (this.paused) {
      this.flushAll();
    }
    log(`Tracking ${this.paused ? 'paused' : 'resumed'}`);
    return this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  async flush(): Promise<void> {
    this.flushAll();
    await this.storage.saveCurrentSession();
  }

  private flushAll(): void {
    this.fileTracker?.flush();
    this.editTracker?.flush();
  }

  dispose(): void {
    this.flushAll();
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
