import * as vscode from 'vscode';
import { Session, TerminalEvent } from '../storage/types';
import { Config } from '../utils/config';

export class TerminalTracker implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private getSession: () => Session | undefined) {}

  start(): void {
    this.disposables.push(
      vscode.window.onDidStartTerminalShellExecution?.((e) => {
        this.onShellExecution(e);
      }) ?? { dispose: () => {} }
    );

    this.disposables.push(
      vscode.window.onDidEndTerminalShellExecution?.((e) => {
        this.onShellExecutionEnd(e);
      }) ?? { dispose: () => {} }
    );
  }

  private onShellExecution(e: vscode.TerminalShellExecutionStartEvent): void {
    if (!Config.trackTerminal) {
      return;
    }
    const session = this.getSession();
    if (!session) {
      return;
    }

    const command = e.execution.commandLine?.value;
    if (!command) {
      return;
    }

    // Skip noisy commands
    if (this.shouldSkip(command)) {
      return;
    }

    const event: TerminalEvent = {
      command,
      timestamp: new Date().toISOString(),
    };
    session.terminalCommands.push(event);
  }

  private onShellExecutionEnd(e: vscode.TerminalShellExecutionEndEvent): void {
    if (!Config.trackTerminal) {
      return;
    }
    const session = this.getSession();
    if (!session) {
      return;
    }

    const command = e.execution.commandLine?.value;
    if (!command) {
      return;
    }

    // Find the matching command and update exit code
    const existing = [...session.terminalCommands]
      .reverse()
      .find((c) => c.command === command && c.exitCode === undefined);
    if (existing) {
      existing.exitCode = e.exitCode;
    }
  }

  private shouldSkip(command: string): boolean {
    const noisy = ['clear', 'ls', 'cd', 'pwd', 'echo', 'cat', 'head', 'tail'];
    const firstWord = command.trim().split(/\s+/)[0];
    return noisy.includes(firstWord);
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
