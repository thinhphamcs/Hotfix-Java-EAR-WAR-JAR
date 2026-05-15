import type { ArchiveEntry, SearchResult, JavaInfo, CompileResult } from './index'

interface ElectronAPI {
  openArchiveDialog: () => Promise<string | null>
  openArchive: (filePath: string) => Promise<ArchiveEntry>
  readFile: (archivePath: string, entryPath: string) => Promise<Buffer>
  saveFile: (
    archivePath: string,
    entryPath: string,
    content: string,
    isClass: boolean
  ) => Promise<{ success: boolean; error?: string; diagnostics?: any[] }>
  searchFilename: (archivePath: string, query: string) => Promise<SearchResult[]>
  searchContent: (archivePath: string, query: string) => Promise<SearchResult[]>
  getJavaInfo: () => Promise<JavaInfo>
  decompileClass: (archivePath: string, entryPath: string) => Promise<{ source: string; error?: string }>
  showInExplorer: (filePath: string) => Promise<void>
  onOpenFile: (callback: (filePath: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
