import AdmZip from 'adm-zip'
import { extname } from 'path'
import type { ArchiveService } from './archiveService'

export interface SearchResult {
  path: string
  archivePath: string
  entryName: string
  matchType: 'filename' | 'content'
  lineNumber?: number
  lineContent?: string
}

const TEXT_EXTS = new Set([
  '.java', '.xml', '.properties', '.yml', '.yaml', '.json', '.txt',
  '.html', '.htm', '.jsp', '.jspx', '.xhtml', '.tld', '.wsdl', '.xsd',
  '.mf', '.cfg', '.conf', '.ini', '.sql', '.gradle', '.groovy', '.kt',
  '.MF', '.SF'
])

function isTextEntry(name: string): boolean {
  const ext = extname(name).toLowerCase()
  const base = name.split('/').pop() || ''
  return TEXT_EXTS.has(ext) || TEXT_EXTS.has(extname(name)) ||
    base === 'MANIFEST.MF' || base.endsWith('.properties')
}

export class SearchService {
  constructor(private archiveService: ArchiveService) {}

  searchByFilename(archivePath: string, query: string): SearchResult[] {
    const results: SearchResult[] = []
    const lower = query.toLowerCase()
    this.walkEntries(archivePath, archivePath, '', (entryName, file, logical) => {
      const base = entryName.split('/').pop() || entryName
      if (base.toLowerCase().includes(lower)) {
        results.push({
          path: logical,
          archivePath: file,
          entryName,
          matchType: 'filename'
        })
      }
    })
    return results.slice(0, 500)
  }

  searchByContent(archivePath: string, query: string): SearchResult[] {
    const results: SearchResult[] = []
    const lower = query.toLowerCase()
    this.walkEntries(archivePath, archivePath, '', (entryName, file, logical) => {
      if (!isTextEntry(entryName)) return
      try {
        const zip = new AdmZip(file)
        const data = zip.readFile(entryName)
        if (!data) return
        const text = data.toString('utf-8')
        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lower)) {
            results.push({
              path: logical,
              archivePath: file,
              entryName,
              matchType: 'content',
              lineNumber: i + 1,
              lineContent: lines[i].trim().substring(0, 200)
            })
            if (results.length >= 500) return
          }
        }
      } catch {}
    })
    return results
  }

  private walkEntries(
    rootPath: string,
    archiveFile: string,
    prefix: string,
    callback: (entryName: string, file: string, logical: string) => void
  ) {
    try {
      const zip = new AdmZip(archiveFile)
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue
        const logical = prefix ? `${prefix}!${entry.entryName}` : entry.entryName
        callback(entry.entryName, archiveFile, logical)

        const ext = extname(entry.entryName).toLowerCase()
        if (['.ear', '.war', '.jar', '.zip'].includes(ext)) {
          try {
            const data = zip.readFile(entry)
            if (!data) continue
            const { tempFile } = this.extractToTempForSearch(archiveFile, entry.entryName, data)
            this.walkEntries(rootPath, tempFile, logical, callback)
          } catch {}
        }
      }
    } catch {}
  }

  private tempFiles: string[] = []

  private extractToTempForSearch(archiveFile: string, entryName: string, data: Buffer) {
    const { join } = require('path')
    const { mkdirSync, writeFileSync } = require('fs')
    const { tmpdir } = require('os')
    const { randomBytes } = require('crypto')

    const dir = join(tmpdir(), 'ear-search-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    const tempFile = join(dir, require('path').basename(entryName))
    writeFileSync(tempFile, data)
    this.tempFiles.push(dir)
    return { tempFile }
  }
}
