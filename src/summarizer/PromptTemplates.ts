import { Session } from '../storage/types';
import { BranchDiff } from '../git/GitService';

export function buildSummaryPrompt(session: Session, diff?: BranchDiff): string {
  const parts: string[] = [];

  parts.push(
    'You are analyzing a developer\'s coding session to create a concise decision summary.',
    'Focus on the WHY behind their actions, not just WHAT they did.',
    'Write in first person as if the developer is explaining their thought process.',
    'Keep it to 3-8 sentences. Be specific, not generic.',
    ''
  );

  parts.push(`Branch: ${session.branch}`);
  parts.push(`Duration: ${formatDuration(getTotalDuration(session))}`);
  parts.push('');

  if (session.fileVisits.length > 0) {
    parts.push('Files visited (sorted by time spent):');
    const sorted = [...session.fileVisits].sort((a, b) => b.durationMs - a.durationMs);
    for (const visit of sorted.slice(0, 15)) {
      parts.push(`  - ${visit.filePath} (${formatDuration(visit.durationMs)}, ${visit.visitCount} visits)`);
    }
    parts.push('');
  }

  if (session.edits.length > 0) {
    parts.push('Edits made:');
    const editsByFile = groupBy(session.edits, (e) => e.filePath);
    for (const [file, edits] of Object.entries(editsByFile).slice(0, 10)) {
      const totalAdded = edits.reduce((sum, e) => sum + e.linesAdded, 0);
      const totalRemoved = edits.reduce((sum, e) => sum + e.linesRemoved, 0);
      parts.push(`  - ${file}: +${totalAdded}/-${totalRemoved} lines across ${edits.length} edits`);
    }
    parts.push('');
  }

  if (session.searches.length > 0) {
    parts.push('Searches performed:');
    for (const search of session.searches.slice(0, 10)) {
      parts.push(`  - "${search.query}" (${search.scope})`);
    }
    parts.push('');
  }

  if (session.terminalCommands.length > 0) {
    parts.push('Terminal commands:');
    for (const cmd of session.terminalCommands.slice(0, 15)) {
      const status = cmd.exitCode === undefined ? '' : cmd.exitCode === 0 ? ' ✓' : ` ✗ (exit ${cmd.exitCode})`;
      parts.push(`  - ${cmd.command}${status}`);
    }
    parts.push('');
  }

  if (diff) {
    parts.push(`Git diff against ${diff.baseBranch}:`);
    parts.push(`  Total: +${diff.totalInsertions}/-${diff.totalDeletions} lines in ${diff.filesChanged.length} files`);
    for (const f of diff.filesChanged.slice(0, 10)) {
      parts.push(`  - ${f.file}: +${f.insertions}/-${f.deletions}`);
    }
    parts.push('');
  }

  parts.push(
    'Based on the above activity, write a decision summary that explains:',
    '1. What the developer was working on (the goal)',
    '2. Key decisions made and likely reasoning',
    '3. Any notable patterns (debugging cycles, exploration, refactoring)',
    '',
    'Decision summary:'
  );

  return parts.join('\n');
}

export function buildPRDescriptionPrompt(session: Session, diff?: BranchDiff): string {
  const activityContext = buildSummaryPrompt(session, diff);

  return [
    activityContext,
    '',
    'Now write a pull request description in markdown format with these sections:',
    '## Summary',
    '(2-3 sentences explaining what this PR does and why)',
    '',
    '## Changes',
    '(Bullet list of key changes)',
    '',
    '## Decisions & Trade-offs',
    '(Brief notes on any notable technical decisions)',
    '',
    'Write the PR description:',
  ].join('\n');
}

function getTotalDuration(session: Session): number {
  return session.fileVisits.reduce((sum, v) => sum + v.durationMs, 0);
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

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    (groups[key] ??= []).push(item);
  }
  return groups;
}
