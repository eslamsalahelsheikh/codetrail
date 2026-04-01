import * as vscode from 'vscode';
import { StorageManager } from '../storage/StorageManager';
import { GitService } from '../git/GitService';
import { ActivityTracker } from '../tracker/ActivityTracker';
import { LLMSummarizer } from '../summarizer/LLMSummarizer';
import { buildSummaryPrompt, buildPRDescriptionPrompt } from '../summarizer/PromptTemplates';
import { generateFallbackSummary } from '../summarizer/FallbackSummarizer';
import { SidebarProvider } from '../ui/SidebarProvider';
import { StatusBarManager } from '../ui/StatusBarManager';
import { log } from '../utils/logger';

interface CommandDependencies {
  storage: StorageManager;
  git: GitService;
  tracker: ActivityTracker;
  llm: LLMSummarizer;
  sidebar: SidebarProvider;
  statusBar: StatusBarManager;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  deps: CommandDependencies
): void {
  const { storage, git, tracker, llm, sidebar, statusBar } = deps;

  context.subscriptions.push(
    vscode.commands.registerCommand('codetrail.summarizeBranch', async () => {
      await tracker.flush();
      const session = storage.getCurrentSession();
      if (!session) {
        vscode.window.showWarningMessage('CodeTrail: No active session to summarize.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'CodeTrail: Generating summary...',
          cancellable: false,
        },
        async () => {
          const diff = await git.getBranchDiffSummary();
          const isLLMAvailable = await llm.isAvailable();

          let summary: string;
          if (isLLMAvailable) {
            const prompt = buildSummaryPrompt(session, diff);
            const aiSummary = await llm.summarize(prompt);
            summary = aiSummary ?? generateFallbackSummary(session, diff);
          } else {
            summary = generateFallbackSummary(session, diff);
          }

          session.summary = summary;
          await storage.saveCurrentSession();
          sidebar.refresh();
          log(`Summary generated for branch ${session.branch}`);
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codetrail.generatePRDescription', async () => {
      await tracker.flush();
      const session = storage.getCurrentSession();
      if (!session) {
        vscode.window.showWarningMessage('CodeTrail: No active session.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'CodeTrail: Generating PR description...',
          cancellable: false,
        },
        async () => {
          const diff = await git.getBranchDiffSummary();
          const isLLMAvailable = await llm.isAvailable();

          let description: string;
          if (isLLMAvailable) {
            const prompt = buildPRDescriptionPrompt(session, diff);
            description = (await llm.summarize(prompt)) ?? buildFallbackPR(session, diff);
          } else {
            description = buildFallbackPR(session, diff);
          }

          await vscode.env.clipboard.writeText(description);
          vscode.window.showInformationMessage(
            'CodeTrail: PR description copied to clipboard!'
          );
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codetrail.showTimeline', () => {
      vscode.commands.executeCommand('codetrail.sidebar.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codetrail.toggleTracking', () => {
      const paused = tracker.togglePause();
      statusBar.update(paused);
      vscode.window.showInformationMessage(
        `CodeTrail: Tracking ${paused ? 'paused' : 'resumed'}`
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codetrail.clearBranchData', async () => {
      const branch = git.getCurrentBranch();
      const repoRoot = git.getRepoRoot();
      if (!branch || !repoRoot) {
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Clear all CodeTrail data for branch "${branch}"?`,
        { modal: true },
        'Clear'
      );
      if (confirm === 'Clear') {
        await storage.clearSession(repoRoot, branch);
        await storage.getOrCreateSession(repoRoot, branch);
        sidebar.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codetrail.clearAllData', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Clear ALL CodeTrail data for every branch and repo?',
        { modal: true },
        'Clear Everything'
      );
      if (confirm === 'Clear Everything') {
        await storage.clearAllSessions();
        sidebar.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codetrail.refreshSidebar', () => {
      sidebar.refresh();
    })
  );
}

function buildFallbackPR(
  session: import('../storage/types').Session,
  diff?: import('../git/GitService').BranchDiff
): string {
  const lines: string[] = ['## Summary', ''];

  const editFiles = new Set(session.edits.map((e) => e.filePath));
  lines.push(`Changes across ${editFiles.size} files on branch \`${session.branch}\`.`);
  lines.push('');

  if (diff && diff.filesChanged.length > 0) {
    lines.push('## Changes', '');
    for (const f of diff.filesChanged) {
      lines.push(`- \`${f.file}\`: +${f.insertions}/-${f.deletions}`);
    }
    lines.push('');
  }

  lines.push('## Context', '');
  lines.push(
    `Developer spent ${formatDuration(session.fileVisits.reduce((s, v) => s + v.durationMs, 0))} working on this branch.`
  );

  if (session.searches.length > 0) {
    lines.push(`Performed ${session.searches.length} searches during development.`);
  }

  if (session.terminalCommands.length > 0) {
    lines.push(`Ran ${session.terminalCommands.length} terminal commands.`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generated by [CodeTrail](https://github.com/eslamsalahelsheikh/codetrail)*');

  return lines.join('\n');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
