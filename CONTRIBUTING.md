# Contributing to CodeTrail

Thank you for considering contributing to CodeTrail! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18+
- VS Code 1.85+
- Git

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/eslamsalahelsheikh/codetrail.git
   cd codetrail
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the watcher:
   ```bash
   npm run watch
   ```

4. Press **F5** in VS Code to launch the Extension Development Host.

### Project Structure

```
src/
  extension.ts           # Entry point — activation and wiring
  tracker/               # Activity tracking modules
    ActivityTracker.ts    # Orchestrator for all sub-trackers
    FileTracker.ts        # Tracks file opens, time spent
    EditTracker.ts        # Tracks code edits by region
    SearchTracker.ts      # Captures search queries
    TerminalTracker.ts    # Tracks terminal commands
  storage/
    StorageManager.ts     # JSON file persistence layer
    types.ts              # TypeScript interfaces for all data
  git/
    GitService.ts         # Git branch detection and diff
  summarizer/
    LLMSummarizer.ts      # Ollama integration for AI summaries
    FallbackSummarizer.ts # Rule-based summaries (no LLM needed)
    PromptTemplates.ts    # Prompt engineering for summaries
  ui/
    SidebarProvider.ts    # Webview sidebar panel
    HoverProvider.ts      # Code hover tooltips
    StatusBarManager.ts   # Status bar indicator
  commands/
    index.ts              # All command implementations
  utils/
    config.ts             # Configuration helpers
    logger.ts             # Output channel logging
    debounce.ts           # Debounce utility
    minimatch.ts          # Lightweight glob matching
```

## How to Contribute

### Reporting Bugs

- Use the [Bug Report](https://github.com/eslamsalahelsheikh/codetrail/issues/new?template=bug_report.md) template.
- Include your VS Code version, OS, and steps to reproduce.

### Suggesting Features

- Use the [Feature Request](https://github.com/eslamsalahelsheikh/codetrail/issues/new?template=feature_request.md) template.
- Explain the problem you're trying to solve, not just the solution.

### Pull Requests

1. Fork the repository and create a branch from `main`.
2. Make your changes with clear, descriptive commits.
3. Ensure the code builds without errors: `npm run build`
4. Run linting: `npm run lint`
5. Run tests: `npm test`
6. Open a PR with a clear title and description.

### Code Style

- TypeScript strict mode is enabled.
- Use descriptive variable and function names.
- Avoid comments that just narrate what the code does.
- Keep functions focused and reasonably short.

## Architecture Principles

- **Privacy first**: Never capture actual code content. Only track metadata (file paths, line numbers, durations).
- **Local only**: All data stays on the user's machine. No network calls except to the user's own local Ollama instance.
- **Zero config**: The extension should work immediately after install with sensible defaults.
- **Minimal footprint**: Don't slow down the editor. Debounce events, batch writes, keep memory usage low.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
