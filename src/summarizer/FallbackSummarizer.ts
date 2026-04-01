import { Session } from '../storage/types';
import { BranchDiff } from '../git/GitService';

/**
 * Rule-based summarizer used when no LLM is available.
 * Produces a structured but non-AI summary from session data.
 */
export function generateFallbackSummary(session: Session, diff?: BranchDiff): string {
  const parts: string[] = [];
  const totalTime = session.fileVisits.reduce((sum, v) => sum + v.durationMs, 0);

  parts.push(`**Branch:** \`${session.branch}\``);
  parts.push(`**Total active time:** ${formatDuration(totalTime)}`);
  parts.push('');

  if (session.fileVisits.length > 0) {
    parts.push(`**Files explored** (${session.fileVisits.length}):`);
    const sorted = [...session.fileVisits].sort((a, b) => b.durationMs - a.durationMs);
    for (const visit of sorted.slice(0, 8)) {
      parts.push(`- \`${visit.filePath}\` — ${formatDuration(visit.durationMs)} (${visit.visitCount} visits)`);
    }
    if (sorted.length > 8) {
      parts.push(`- ...and ${sorted.length - 8} more files`);
    }
    parts.push('');
  }

  if (session.edits.length > 0) {
    const editFiles = new Set(session.edits.map((e) => e.filePath));
    const totalAdded = session.edits.reduce((sum, e) => sum + e.linesAdded, 0);
    const totalRemoved = session.edits.reduce((sum, e) => sum + e.linesRemoved, 0);
    parts.push(`**Edits:** ${session.edits.length} changes across ${editFiles.size} files (+${totalAdded}/-${totalRemoved} lines)`);
    parts.push('');
  }

  if (session.terminalCommands.length > 0) {
    const failed = session.terminalCommands.filter((c) => c.exitCode !== undefined && c.exitCode !== 0);
    parts.push(`**Terminal:** ${session.terminalCommands.length} commands run`);
    if (failed.length > 0) {
      parts.push(`- ${failed.length} failed commands (possible debugging):`);
      for (const cmd of failed.slice(0, 5)) {
        parts.push(`  - \`${cmd.command}\` (exit ${cmd.exitCode})`);
      }
    }
    parts.push('');
  }

  if (session.searches.length > 0) {
    parts.push(`**Searches:** ${session.searches.length} queries`);
    const meaningful = session.searches.filter((s) => s.query !== '(search performed)');
    for (const search of meaningful.slice(0, 5)) {
      parts.push(`- "${search.query}"`);
    }
    parts.push('');
  }

  if (diff) {
    parts.push(`**Git changes** vs \`${diff.baseBranch}\`: +${diff.totalInsertions}/-${diff.totalDeletions} in ${diff.filesChanged.length} files`);
  }

  parts.push('');
  parts.push('*Install Ollama for AI-powered decision summaries: https://ollama.com*');

  return parts.join('\n');
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
