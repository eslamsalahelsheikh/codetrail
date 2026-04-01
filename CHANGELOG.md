# Changelog

All notable changes to CodeTrail will be documented in this file.

## [0.1.0] - 2026-03-31

### Added
- Passive file visit tracking (which files you open, time spent, visit count)
- Edit tracking (which code regions you modify, lines added/removed)
- Search query capture
- Terminal command tracking with exit codes
- Branch-scoped sessions (all activity tied to the current git branch)
- AI-powered summary generation via Ollama (local LLM)
- Fallback rule-based summaries when no LLM is available
- PR description generator (one-click, copied to clipboard)
- Sidebar panel with timeline view of branch activity
- Hover tooltips showing edit context on code regions
- Status bar indicator with pause/resume toggle
- Auto-save every 30 seconds
- Automatic branch switch detection
- Configurable tracking (toggle files, edits, searches, terminal independently)
- File exclusion patterns (node_modules, .git, dist, etc.)
- Data retention policy (auto-prune sessions older than N days)
- Clear data per-branch or all at once
