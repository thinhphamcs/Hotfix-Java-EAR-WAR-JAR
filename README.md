# EAR Explorer

A desktop app to open, browse, search, edit, and hotfix Java EAR/WAR/JAR archives — without unpacking them. Think VS Code UI but for ZIP-based Java archives.

Born out of too many hours lost digging through nested archives in production incidents.

---

## What it does

- **Browse** nested EAR → WAR → JAR archive trees in a sidebar file explorer
- **Open files** from any depth in a multi-tab Monaco editor (VS Code's editor)
- **Decompile `.class` files** on-the-fly using CFR 0.152 — opens as readable Java
- **Edit and hotfix** decompiled Java → Ctrl+S → `javac` recompiles → `.class` swapped back into the archive chain, no unpacking needed
- **Surface compiler errors** as red squiggles inline in the editor (Monaco markers)
- **Search by filename** (Ctrl+P) across all nested archives
- **Search file contents** (Ctrl+Shift+F) across all text files in all nested archives
- **Drag-and-drop** EAR/WAR/JAR onto the window to open
- Dark VS Code theme throughout

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | comes with Node |
| JDK | 17 | must be on `PATH` — needed for `javac` recompilation |

> CFR decompiler (`cfr.jar`) is bundled under `resources/cfr/` — no separate install needed.
> Java **17** is specifically required because the recompiler targets `--release 17`.

---

## Getting started

```bash
git clone https://github.com/thinhphamcs/Hotfix-Java-EAR-WAR-JAR.git
cd Hotfix-Java-EAR-WAR-JAR
npm install
npm start
```

`npm start` launches Vite dev server + Electron together via `vite-plugin-electron`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev mode — Vite + Electron with HMR |
| `npm run build` | Production build (Vite + tsc for Electron) |
| `npm run build:all` | Full Windows NSIS installer via electron-builder |
| `npm run typecheck` | `tsc --noEmit` — zero errors expected |

---

## Tech stack

| Layer | Tech |
|---|---|
| Shell | Electron 33 |
| UI | React 18 + TypeScript (strict) |
| Bundler | Vite 6 + vite-plugin-electron |
| Editor | Monaco Editor (@monaco-editor/react) |
| Archive I/O | AdmZip — reads/writes nested ZIP chains |
| Decompiler | CFR 0.152 (`resources/cfr/cfr.jar`) via `child_process` |
| Recompiler | `javac --release 17` via `child_process` |
| Packaging | electron-builder → Windows NSIS (x64) |

---

## Project structure

```
├── electron/
│   ├── main.ts                  # Electron main process, IPC handlers
│   ├── preload.ts               # Context bridge — exposes safe IPC to renderer
│   └── services/
│       ├── archiveService.ts    # AdmZip: read/write nested EAR→WAR→JAR chains
│       ├── javaService.ts       # CFR decompile + javac recompile pipeline
│       └── searchService.ts     # Filename and content search across archives
├── src/
│   ├── App.tsx                  # Root layout, IPC wiring, drag-and-drop
│   ├── components/
│   │   ├── Sidebar.tsx          # Container for file tree + search panel
│   │   ├── FileTree.tsx         # Recursive archive tree
│   │   ├── EditorArea.tsx       # Monaco editor, tab management, Ctrl+S save
│   │   ├── TabBar.tsx           # Open file tabs
│   │   ├── Toolbar.tsx          # Open file button, search toggles
│   │   ├── StatusBar.tsx        # Status messages, current file info
│   │   ├── CommandPalette.tsx   # Ctrl+P filename search overlay
│   │   ├── ContentSearch.tsx    # Ctrl+Shift+F full-text search panel
│   │   ├── SearchPanel.tsx      # Search results list
│   │   └── WelcomeScreen.tsx    # Shown when no archive is open
│   ├── store/
│   │   └── appStore.ts          # Global state (open archive, tabs, search)
│   └── types/
│       ├── index.ts             # Shared domain types (ArchiveNode, Tab, etc.)
│       └── electron.d.ts        # Window.electronAPI type declarations
├── resources/
│   └── cfr/
│       └── cfr.jar              # Bundled CFR decompiler
├── tsconfig.json                # Renderer (React) TypeScript config
├── tsconfig.electron.json       # Electron main process TypeScript config
├── tsconfig.node.json           # Vite config TypeScript config
└── vite.config.ts
```

---

## Hotfix pipeline (how edits are saved)

1. User opens a `.class` file → `javaService` runs `java -jar cfr.jar` → decompiled Java shown in Monaco
2. User edits the Java source → Ctrl+S
3. `javaService` writes source to a temp file → runs `javac --release 17` against it
4. On success: `archiveService` writes the new `.class` back into the correct position in the archive chain (JAR inside WAR inside EAR), updating each ZIP layer in-place
5. On failure: `javac` stderr is parsed into line/column diagnostics and set as Monaco error markers (red squiggles)

---

## Branch history

The feature branches were developed linearly and merged into `dev`:

```
main                        ← initial commit only
└── feature/initial-setup   ← Vite/Electron/TS project scaffolding
    └── feature/ui-components        ← React UI + archiveService
        └── feature/functionality-search     ← searchService + Ctrl+P/Ctrl+Shift+F
            └── feature/functionality-decompile  ← CFR integration
                └── feature/recompile            ← javac hotfix pipeline
dev                         ← merges all of the above
```

---

## Known limitations

- Recompilation requires the full classpath to be available (stdlib only for now — external JARs not yet on the classpath)
- Windows only packaging (NSIS); runs in dev mode on Linux/macOS via `npm start`
- Inner resources (images, XML, properties files) are editable as text; binary formats other than `.class` are read-only display
