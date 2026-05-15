import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join, basename } from 'path'
import { tmpdir } from 'os'
import { app } from 'electron'
import { randomBytes } from 'crypto'
import type { ArchiveService } from './archiveService'

export interface JavaInfo {
  javaVersion: string | null
  javacVersion: string | null
  javaPath: string | null
  javacPath: string | null
}

export interface CompileResult {
  success: boolean
  error?: string
  diagnostics?: Diagnostic[]
}

export interface Diagnostic {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

function getCfrJar(): string {
  const prodPath = join(process.resourcesPath || '', 'cfr', 'cfr.jar')
  if (existsSync(prodPath)) return prodPath

  const devPath = join(app.getAppPath(), 'resources', 'cfr', 'cfr.jar')
  if (existsSync(devPath)) return devPath

  throw new Error('cfr.jar not found. Place it at resources/cfr/cfr.jar')
}

function findExecutable(name: string): string | null {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which'
    const result = execSync(`${which} ${name}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
    return result.trim().split('\n')[0].trim() || null
  } catch {
    return null
  }
}

function runVersion(cmd: string): string | null {
  try {
    const result = spawnSync(cmd, ['--version'], { encoding: 'utf-8' })
    const out = (result.stdout || '') + (result.stderr || '')
    const match = out.match(/(\d+(?:\.\d+)*)/)
    return match ? match[1] : out.trim().split('\n')[0]
  } catch {
    return null
  }
}

export class JavaService {
  getJavaInfo(): JavaInfo {
    const javaPath = findExecutable('java')
    const javacPath = findExecutable('javac')
    return {
      javaPath,
      javacPath,
      javaVersion: javaPath ? runVersion('java') : null,
      javacVersion: javacPath ? runVersion('javac') : null
    }
  }

  async decompileClass(
    archivePath: string,
    entryPath: string,
    archiveService: ArchiveService
  ): Promise<{ source: string; error?: string }> {
    const cfrJar = getCfrJar()

    const classData = archiveService.readFileEntry(archivePath, entryPath)
    const tmpDir = join(tmpdir(), 'ear-cfr-' + randomBytes(6).toString('hex'))
    mkdirSync(tmpDir, { recursive: true })

    const { entry } = archiveService.resolveEntry(archivePath, entryPath)
    const classFile = join(tmpDir, basename(entry))
    writeFileSync(classFile, classData)

    try {
      const result = spawnSync('java', ['-jar', cfrJar, classFile, '--silent', 'true'], {
        encoding: 'utf-8',
        cwd: tmpDir,
        timeout: 30000
      })

      const source = result.stdout || ''
      const stderr = result.stderr || ''

      if (result.status !== 0 && !source.trim()) {
        return { source: '', error: stderr || 'CFR decompilation failed' }
      }

      return { source }
    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }
}
