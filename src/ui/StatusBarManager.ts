import * as vscode from 'vscode';
import { Config } from '../utils/config';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50
    );
    this.statusBarItem.command = 'codetrail.toggleTracking';
    this.statusBarItem.tooltip = 'CodeTrail — Click to pause/resume tracking';
  }

  show(): void {
    if (Config.showStatusBar) {
      this.update(false);
      this.statusBarItem.show();
    }
  }

  update(paused: boolean): void {
    if (paused) {
      this.statusBarItem.text = '$(debug-pause) CodeTrail';
      this.statusBarItem.tooltip = 'CodeTrail — Paused (click to resume)';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    } else {
      this.statusBarItem.text = '$(record) CodeTrail';
      this.statusBarItem.tooltip = 'CodeTrail — Tracking (click to pause)';
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
