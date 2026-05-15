export interface ArchiveEntry {
  name: string
  path: string
  archivePath: string
  entryName: string
  isDirectory: boolean
  isArchive: boolean
  size: number
  children?: ArchiveEntry[]
}

export interface OpenTab {
  id: string
  path: string
  archivePath: string
  entryName: string
  name: string
  language: string
  isClass: boolean
  isDirty: boolean
  isDecompiling?: boolean
}

export interface SearchResult {
  path: string
  archivePath: string
  entryName: string
  matchType: 'filename' | 'content'
  lineNumber?: number
  lineContent?: string
}

export interface JavaInfo {
  javaVersion: string | null
  javacVersion: string | null
  javaPath: string | null
  javacPath: string | null
}

export interface Diagnostic {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}
