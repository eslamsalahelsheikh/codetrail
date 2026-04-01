import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Session, createEmptySession } from './types';
import { Config } from '../utils/config';
import { log, logError } from '../utils/logger';

export class StorageManager {
  private storageDir: string;
  private currentSession: Session | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.storageDir = path.join(context.globalStorageUri.fsPath, 'sessions');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    await this.pruneOldSessions();
  }

  async getOrCreateSession(repoPath: string, branch: string): Promise<Session> {
    if (
      this.currentSession &&
      this.currentSession.repoPath === repoPath &&
      this.currentSession.branch === branch
    ) {
      return this.currentSession;
    }

    const existing = await this.loadSession(repoPath, branch);
    if (existing) {
      this.currentSession = existing;
      return existing;
    }

    const session = createEmptySession(repoPath, branch);
    this.currentSession = session;
    await this.saveSession(session);
    log(`Created new session for ${branch} in ${path.basename(repoPath)}`);
    return session;
  }

  getCurrentSession(): Session | undefined {
    return this.currentSession;
  }

  async saveCurrentSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.lastActiveAt = new Date().toISOString();
      await this.saveSession(this.currentSession);
    }
  }

  async listSessions(repoPath?: string): Promise<Session[]> {
    const sessions: Session[] = [];
    try {
      const repoDir = repoPath
        ? path.join(this.storageDir, this.hashPath(repoPath))
        : this.storageDir;

      if (repoPath) {
        sessions.push(...(await this.loadSessionsFromDir(repoDir)));
      } else {
        const repoDirs = await fs.readdir(this.storageDir, { withFileTypes: true });
        for (const entry of repoDirs) {
          if (entry.isDirectory()) {
            const dir = path.join(this.storageDir, entry.name);
            sessions.push(...(await this.loadSessionsFromDir(dir)));
          }
        }
      }
    } catch {
      // storage dir may not exist yet
    }
    return sessions.sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
  }

  async clearSession(repoPath: string, branch: string): Promise<void> {
    const filePath = this.sessionFilePath(repoPath, branch);
    try {
      await fs.unlink(filePath);
      if (
        this.currentSession?.repoPath === repoPath &&
        this.currentSession?.branch === branch
      ) {
        this.currentSession = undefined;
      }
      log(`Cleared session data for ${branch}`);
    } catch {
      // file may not exist
    }
  }

  async clearAllSessions(): Promise<void> {
    try {
      await fs.rm(this.storageDir, { recursive: true, force: true });
      await fs.mkdir(this.storageDir, { recursive: true });
      this.currentSession = undefined;
      log('Cleared all session data');
    } catch (err) {
      logError('Failed to clear all sessions', err);
    }
  }

  private async loadSession(repoPath: string, branch: string): Promise<Session | undefined> {
    const filePath = this.sessionFilePath(repoPath, branch);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as Session;
    } catch {
      return undefined;
    }
  }

  private async saveSession(session: Session): Promise<void> {
    const filePath = this.sessionFilePath(session.repoPath, session.branch);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }

  private async loadSessionsFromDir(dir: string): Promise<Session[]> {
    const sessions: Session[] = [];
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data = await fs.readFile(path.join(dir, file), 'utf-8');
            sessions.push(JSON.parse(data) as Session);
          } catch {
            // skip corrupt files
          }
        }
      }
    } catch {
      // dir may not exist
    }
    return sessions;
  }

  private async pruneOldSessions(): Promise<void> {
    const maxAge = Config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - maxAge;
    const sessions = await this.listSessions();
    let pruned = 0;

    for (const session of sessions) {
      if (new Date(session.lastActiveAt).getTime() < cutoff) {
        await this.clearSession(session.repoPath, session.branch);
        pruned++;
      }
    }

    if (pruned > 0) {
      log(`Pruned ${pruned} sessions older than ${Config.retentionDays} days`);
    }
  }

  private sessionFilePath(repoPath: string, branch: string): string {
    const repoHash = this.hashPath(repoPath);
    const safeBranch = branch.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, repoHash, `${safeBranch}.json`);
  }

  private hashPath(p: string): string {
    let hash = 0;
    for (let i = 0; i < p.length; i++) {
      const char = p.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(36);
  }
}
