import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';
import { log, logError } from '../utils/logger';

export class GitService {
  private git: SimpleGit | undefined;
  private repoRoot: string | undefined;
  private currentBranch: string | undefined;

  async initialize(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    try {
      this.git = simpleGit(workspaceFolder.uri.fsPath);
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        log('Workspace is not a git repository');
        return false;
      }

      this.repoRoot = (await this.git.revparse(['--show-toplevel'])).trim();
      this.currentBranch = await this.detectBranch();
      log(`Git initialized: ${this.repoRoot} on branch ${this.currentBranch}`);
      return true;
    } catch (err) {
      logError('Failed to initialize git', err);
      return false;
    }
  }

  async detectBranch(): Promise<string> {
    if (!this.git) {
      return 'unknown';
    }
    try {
      const branch = (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
      this.currentBranch = branch;
      return branch;
    } catch {
      return 'unknown';
    }
  }

  async getBranchDiffSummary(): Promise<BranchDiff | undefined> {
    if (!this.git || !this.currentBranch) {
      return undefined;
    }

    try {
      const mainBranch = await this.findMainBranch();
      if (!mainBranch || mainBranch === this.currentBranch) {
        return undefined;
      }

      const mergeBase = (
        await this.git.raw(['merge-base', mainBranch, 'HEAD'])
      ).trim();

      const diff = await this.git.diffSummary([`${mergeBase}...HEAD`]);

      return {
        baseBranch: mainBranch,
        filesChanged: diff.files.map((f) => ({
          file: f.file,
          insertions: f.insertions,
          deletions: f.deletions,
          binary: f.binary,
        })),
        totalInsertions: diff.insertions,
        totalDeletions: diff.deletions,
      };
    } catch (err) {
      logError('Failed to get branch diff', err);
      return undefined;
    }
  }

  async getRecentCommitMessages(count = 10): Promise<string[]> {
    if (!this.git) {
      return [];
    }
    try {
      const logResult = await this.git.log({ maxCount: count });
      return logResult.all.map((c) => c.message);
    } catch {
      return [];
    }
  }

  getRepoRoot(): string | undefined {
    return this.repoRoot;
  }

  getCurrentBranch(): string | undefined {
    return this.currentBranch;
  }

  onBranchChange(callback: (newBranch: string) => void): vscode.Disposable {
    let lastBranch = this.currentBranch;
    const interval = setInterval(async () => {
      const branch = await this.detectBranch();
      if (branch !== lastBranch) {
        lastBranch = branch;
        callback(branch);
      }
    }, 5000);

    return { dispose: () => clearInterval(interval) };
  }

  private async findMainBranch(): Promise<string | undefined> {
    if (!this.git) {
      return undefined;
    }
    try {
      const branches = await this.git.branchLocal();
      for (const candidate of ['main', 'master', 'develop', 'dev']) {
        if (branches.all.includes(candidate)) {
          return candidate;
        }
      }
      return branches.all[0];
    } catch {
      return undefined;
    }
  }
}

export interface BranchDiff {
  baseBranch: string;
  filesChanged: Array<{
    file: string;
    insertions: number;
    deletions: number;
    binary: boolean;
  }>;
  totalInsertions: number;
  totalDeletions: number;
}
