export interface Session {
  id: string;
  repoPath: string;
  branch: string;
  startedAt: string;
  lastActiveAt: string;
  summary?: string;
  fileVisits: FileVisit[];
  edits: EditEvent[];
  searches: SearchEvent[];
  terminalCommands: TerminalEvent[];
}

export interface FileVisit {
  filePath: string;
  openedAt: string;
  closedAt?: string;
  durationMs: number;
  visitCount: number;
}

export interface EditEvent {
  filePath: string;
  timestamp: string;
  startLine: number;
  endLine: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface SearchEvent {
  query: string;
  timestamp: string;
  scope: 'file' | 'workspace';
  resultsCount?: number;
}

export interface TerminalEvent {
  command: string;
  timestamp: string;
  exitCode?: number;
}

export interface SessionSummary {
  branch: string;
  totalTimeMs: number;
  filesVisited: number;
  editsCount: number;
  searchesCount: number;
  commandsCount: number;
  topFiles: Array<{ filePath: string; durationMs: number }>;
  summary?: string;
}

export function createEmptySession(repoPath: string, branch: string): Session {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    repoPath,
    branch,
    startedAt: now,
    lastActiveAt: now,
    fileVisits: [],
    edits: [],
    searches: [],
    terminalCommands: [],
  };
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
