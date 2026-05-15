import AdmZip from 'adm-zip'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

export interface ArchiveEntry {
  name: string
  path: string       // full path inside the outermost archive, e.g. "WEB-INF/lib/foo.jar!com/acme/Foo.class"
  archivePath: string // path to the containing archive on disk (may be a temp extracted file)
  entryName: string  // entry name inside archivePath
  isDirectory: boolean
  isArchive: boolean
  size: number
  children?: ArchiveEntry[]
}

const ARCHIVE_EXTS = new Set(['.ear', '.war', '.jar', '.zip'])

function isArchiveExt(name: string) {
  return ARCHIVE_EXTS.has(extname(name).toLowerCase())
}

export class ArchiveService {
  // Map from logical archive path → temp directory where it was extracted
  private tempDirs = new Map<string, string>()

  openArchive(filePath: string): ArchiveEntry {
    this.cleanup(filePath)
    return this.buildTree(filePath, filePath, '')
  }

  private buildTree(rootArchivePath: string, archiveFilePath: string, prefix: string): ArchiveEntry {
    const zip = new AdmZip(archiveFilePath)
    const entries = zip.getEntries()

    const root: ArchiveEntry = {
      name: basename(archiveFilePath),
      path: prefix || basename(archiveFilePath),
      archivePath: archiveFilePath,
      entryName: '',
      isDirectory: true,
      isArchive: true,
      size: 0,
      children: []
    }

    // Build directory skeleton
    const nodeMap = new Map<string, ArchiveEntry>()
    nodeMap.set('', root)

    const sorted = entries.slice().sort((a, b) => a.entryName.localeCompare(b.entryName))

    for (const entry of sorted) {
      const name = entry.entryName.replace(/\/$/, '')
      const parts = name.split('/')
      let current = root

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const partPath = parts.slice(0, i + 1).join('/')
        const fullLogical = prefix ? `${prefix}!${partPath}` : partPath

        if (!nodeMap.has(partPath)) {
          const isDir = entry.isDirectory && i === parts.length - 1
          const isArch = !isDir && isArchiveExt(part)
          const node: ArchiveEntry = {
            name: part,
            path: fullLogical,
            archivePath: archiveFilePath,
            entryName: partPath,
            isDirectory: isDir || (i < parts.length - 1),
            isArchive: isArch,
            size: entry.header.size,
            children: isDir || i < parts.length - 1 ? [] : undefined
          }
          nodeMap.set(partPath, node)
          current.children = current.children || []
          current.children.push(node)
        }
        current = nodeMap.get(partPath)!
      }
    }

    // Expand nested archives
    for (const entry of sorted) {
      if (entry.isDirectory) continue
      const entryName = entry.entryName.replace(/\/$/, '')
      if (!isArchiveExt(entryName)) continue

      const node = nodeMap.get(entryName)
      if (!node) continue

      const tempDir = this.getTempDir(archiveFilePath + '!' + entryName)
      const tempFile = join(tempDir, basename(entryName))
      const data = zip.readFile(entry)
      if (!data) continue
      writeFileSync(tempFile, data)

      const logicalPrefix = prefix ? `${prefix}!${entryName}` : entryName
      const nested = this.buildTree(rootArchivePath, tempFile, logicalPrefix)
      node.isDirectory = true
      node.isArchive = true
      node.children = nested.children
      node.archivePath = tempFile
      node.entryName = ''
    }

    return root
  }

  readFileEntry(archivePath: string, entryPath: string): Buffer {
    // entryPath may be "some/path!nested.jar!com/Foo.class"
    // archivePath is the outermost file on disk
    const { file, entry } = this.resolveEntry(archivePath, entryPath)
    const zip = new AdmZip(file)
    const data = zip.readFile(entry)
    if (!data) throw new Error(`Entry not found: ${entry} in ${file}`)
    return data
  }

  saveFileEntry(archivePath: string, entryPath: string, data: Buffer): { success: boolean; error?: string } {
    try {
      this.writeEntryRecursive(archivePath, entryPath, data)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // Resolves a logical entryPath to { file: string on disk, entry: string inside that file }
  // The entryPath uses '!' as separator between archive boundaries
  resolveEntry(archivePath: string, entryPath: string): { file: string; entry: string } {
    // entryPath relative to archivePath — split on first '!' boundary at archive level
    const parts = entryPath.split('!')
    let currentFile = archivePath

    for (let i = 0; i < parts.length - 1; i++) {
      const tempDir = this.getTempDir(currentFile + '!' + parts[i])
      currentFile = join(tempDir, basename(parts[i]))
    }

    return { file: currentFile, entry: parts[parts.length - 1] }
  }

  private writeEntryRecursive(archiveFile: string, logicalEntry: string, data: Buffer): void {
    const bangIdx = logicalEntry.indexOf('!')
    if (bangIdx === -1) {
      // Entry is directly inside archiveFile
      const zip = new AdmZip(archiveFile)
      zip.updateFile(logicalEntry, data)
      // If not found, add it
      if (!zip.getEntry(logicalEntry)) {
        zip.addFile(logicalEntry, data)
      }
      zip.writeZip(archiveFile)
      return
    }

    const outerEntry = logicalEntry.substring(0, bangIdx)
    const innerPath = logicalEntry.substring(bangIdx + 1)

    // Extract outerEntry to temp, recurse, re-pack
    const zip = new AdmZip(archiveFile)
    const entryData = zip.readFile(outerEntry)
    if (!entryData) throw new Error(`Entry not found: ${outerEntry}`)

    const tempDir = this.getTempDir(archiveFile + '!' + outerEntry)
    const tempFile = join(tempDir, basename(outerEntry))
    writeFileSync(tempFile, entryData)

    this.writeEntryRecursive(tempFile, innerPath, data)

    const updatedData = readFileSync(tempFile)
    zip.updateFile(outerEntry, updatedData)
    zip.writeZip(archiveFile)
  }

  private getTempDir(key: string): string {
    if (!this.tempDirs.has(key)) {
      const dir = join(tmpdir(), 'ear-explorer-' + randomBytes(6).toString('hex'))
      mkdirSync(dir, { recursive: true })
      this.tempDirs.set(key, dir)
    }
    return this.tempDirs.get(key)!
  }

  cleanup(archivePath?: string) {
    if (archivePath) {
      // Clean entries that belong to this archive
      for (const [key, dir] of this.tempDirs.entries()) {
        if (key.startsWith(archivePath)) {
          try { rmSync(dir, { recursive: true, force: true }) } catch {}
          this.tempDirs.delete(key)
        }
      }
    } else {
      for (const dir of this.tempDirs.values()) {
        try { rmSync(dir, { recursive: true, force: true }) } catch {}
      }
      this.tempDirs.clear()
    }
  }

  extractToTemp(archiveFile: string, entryName: string): string {
    const zip = new AdmZip(archiveFile)
    const data = zip.readFile(entryName)
    if (!data) throw new Error(`Cannot extract ${entryName}`)
    const tempDir = this.getTempDir(archiveFile + '!extract!' + entryName)
    const outPath = join(tempDir, basename(entryName))
    writeFileSync(outPath, data)
    return outPath
  }

  extractAllJars(archiveFile: string): string[] {
    const results: string[] = []
    const zip = new AdmZip(archiveFile)
    for (const entry of zip.getEntries()) {
      if (!entry.isDirectory && isArchiveExt(entry.entryName)) {
        const data = zip.readFile(entry)
        if (!data) continue
        const tempDir = this.getTempDir(archiveFile + '!jars!' + entry.entryName)
        const outPath = join(tempDir, basename(entry.entryName))
        writeFileSync(outPath, data)
        results.push(outPath)
      }
    }
    return results
  }
}
