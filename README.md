# CodeTrail

**Automatic decision memory for developers** — captures *why* you wrote your code, not just *what* you wrote.

---

## The Problem

You wrote code two weeks ago. You made specific choices — used library X instead of Y, structured the data this way instead of that. Now you're staring at it with zero memory of *why*.

Git blame tells you *what* changed. PR descriptions are often shallow. **Nothing captures the real decision-making process.**

## The Solution

CodeTrail is a VS Code extension that **passively watches** your coding activity and uses AI to reconstruct the reasoning behind your code — without you ever having to write anything down.

### What it captures (silently, in the background):

- Which files you open and how long you spend in them
- Which code regions you edit
- What you search for in the editor
- What terminal commands you run
- Which git branch you're on

### What it produces:

- **AI-generated decision summaries** explaining *why* you did what you did
- **Rich PR descriptions** generated from your actual coding journey
- **Hover context** — hover over code you edited to see the context
- **Branch timelines** — visual history of your work on any branch

## Privacy First

- **100% local.** No data ever leaves your machine.
- **No code content captured.** Only metadata (file paths, line numbers, durations).
- **No cloud, no accounts, no telemetry.**
- AI summaries powered by [Ollama](https://ollama.com) running locally on your machine.

## Quick Start

### 1. Install the extension

Search for **CodeTrail** in the VS Code Extensions panel, or:

```bash
code --install-extension codetrail.codetrail
```

### 2. (Optional) Install Ollama for AI summaries

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1
```

Without Ollama, CodeTrail still works — it generates structured rule-based summaries instead of AI-powered ones.

### 3. Start coding

That's it. CodeTrail starts tracking automatically when you open a git repository. Look for the **$(record) CodeTrail** indicator in the status bar.

## Features

### Branch Summary

Run **CodeTrail: Summarize Current Branch** from the command palette to generate a decision summary:

> *"Worked primarily on the authentication flow. Explored both JWT and session-based approaches (searched for both). Settled on JWT — edited auth.py and middleware.py. Ran tests 4 times, fixing a token expiration bug. Also updated config.py for new environment variables."*

### PR Description Generator

Run **CodeTrail: Generate PR Description** to create a rich PR body from your branch activity, automatically copied to your clipboard.

### Sidebar Timeline

Click the CodeTrail icon in the activity bar to see:
- Files you've visited, sorted by time spent
- Recent edits with line numbers
- Terminal commands (with failure highlighting)
- Quick access to other branch sessions

### Hover Context

Hover over code regions you've edited to see inline context: when you edited it, how many times, and the branch summary.

### Pause/Resume

Click the status bar item or run **CodeTrail: Pause/Resume Tracking** to toggle tracking.

## Configuration

All settings are under `codetrail.*` in VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `codetrail.tracking.enabled` | `true` | Master toggle for all tracking |
| `codetrail.tracking.files` | `true` | Track file opens and time spent |
| `codetrail.tracking.edits` | `true` | Track code edit regions |
| `codetrail.tracking.searches` | `true` | Track search queries |
| `codetrail.tracking.terminal` | `true` | Track terminal commands |
| `codetrail.tracking.excludePatterns` | `[node_modules, .git, ...]` | Glob patterns to exclude |
| `codetrail.privacy.retentionDays` | `90` | Auto-delete sessions after N days |
| `codetrail.ai.provider` | `"ollama"` | AI provider (`"ollama"` or `"none"`) |
| `codetrail.ai.ollamaModel` | `"llama3.1"` | Ollama model for summaries |
| `codetrail.ai.autoSummarize` | `false` | Auto-summarize on branch switch |
| `codetrail.ui.showStatusBar` | `true` | Show status bar indicator |
| `codetrail.ui.showHoverContext` | `true` | Show hover tooltips on edited code |

## Commands

| Command | Description |
|---------|-------------|
| `CodeTrail: Summarize Current Branch` | Generate AI/rule-based summary |
| `CodeTrail: Generate PR Description` | Create PR body, copy to clipboard |
| `CodeTrail: Show Branch Timeline` | Open the sidebar panel |
| `CodeTrail: Pause/Resume Tracking` | Toggle tracking on/off |
| `CodeTrail: Clear Current Branch Data` | Delete data for current branch |
| `CodeTrail: Clear All Data` | Delete all stored data |

## How It Works

```
You code normally
        │
        ▼
CodeTrail silently observes
(file visits, edits, searches, terminal)
        │
        ▼
Activity stored as JSON
(one file per branch, in VS Code global storage)
        │
        ▼
When you ask for a summary:
Ollama (local LLM) → AI decision summary
   or
No Ollama → structured rule-based summary
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development

```bash
git clone https://github.com/codetrail/codetrail.git
cd codetrail
npm install
npm run watch
# Press F5 in VS Code to launch Extension Development Host
```

## Roadmap

- [ ] **v0.2** — Branch history browser, file context badges, export to markdown
- [ ] **v0.3** — Smart session detection, related context linking, decision diffs
- [ ] **v1.0** — Encrypted cross-device sync, team shared context, CI/CD integration

## License

[Apache 2.0](LICENSE)

---

**CodeTrail** — Because your future self deserves to know what your past self was thinking.
