import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'fs'
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

function getVineflowerJar(): string {
  const prodPath = join(process.resourcesPath || '', 'vineflower', 'vineflower.jar')
  if (existsSync(prodPath)) return prodPath

  const devPath = join(app.getAppPath(), 'resources', 'vineflower', 'vineflower.jar')
  if (existsSync(devPath)) return devPath

  throw new Error('vineflower.jar not found. Place it at resources/vineflower/vineflower.jar')
}

function findFirstJavaFile(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = findFirstJavaFile(full)
      if (found) return found
    } else if (entry.name.endsWith('.java')) {
      return full
    }
  }
  return null
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
    const vineflowerJar = getVineflowerJar()

    const classData = archiveService.readFileEntry(archivePath, entryPath)
    const tmpDir = join(tmpdir(), 'ear-vf-' + randomBytes(6).toString('hex'))
    mkdirSync(tmpDir, { recursive: true })

    const { entry } = archiveService.resolveEntry(archivePath, entryPath)
    const classFile = join(tmpDir, basename(entry))
    writeFileSync(classFile, classData)

    const outDir = join(tmpDir, 'out')
    mkdirSync(outDir, { recursive: true })

    try {
      const result = spawnSync('java', ['-jar', vineflowerJar, classFile, outDir], {
        encoding: 'utf-8',
        timeout: 30000
      })

      if (result.error) {
        return { source: '', error: `Failed to launch java: ${result.error.message}` }
      }

      if (result.status !== 0) {
        const detail = result.stderr || `Vineflower exited with code ${result.status}`
        return { source: '', error: detail }
      }

      const javaFile = findFirstJavaFile(outDir)
      if (!javaFile) {
        return { source: '', error: 'Vineflower produced no output' }
      }

      return { source: readFileSync(javaFile, 'utf-8') }
    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }

  async recompileAndSave(
    archivePath: string,
    entryPath: string,
    javaSource: string,
    archiveService: ArchiveService
  ): Promise<CompileResult> {
    const javacPath = findExecutable('javac')
    if (!javacPath) {
      return { success: false, error: 'javac not found on PATH. Install a JDK to enable recompilation.' }
    }

    const tmpDir = join(tmpdir(), 'ear-javac-' + randomBytes(6).toString('hex'))
    mkdirSync(tmpDir, { recursive: true })

    try {
      const classNameMatch = javaSource.match(/(?:public\s+)?(?:class|interface|enum|record)\s+(\w+)/)
      const packageMatch = javaSource.match(/^package\s+([\w.]+)\s*;/m)
      const packageDir = packageMatch ? packageMatch[1].replace(/\./g, '/') : ''
      const className = classNameMatch ? classNameMatch[1] : 'Unknown'

      const srcDir = join(tmpDir, 'src')
      const outDir = join(tmpDir, 'out')
      mkdirSync(join(srcDir, packageDir), { recursive: true })
      mkdirSync(outDir, { recursive: true })

      const javaFile = join(srcDir, packageDir, `${className}.java`)
      writeFileSync(javaFile, javaSource, 'utf-8')

      // Use all JARs extracted from the archive as classpath
      const classpathJars = archiveService.extractAllJars(archivePath)
      const classpath = classpathJars.join(process.platform === 'win32' ? ';' : ':')

      const args = [
        '-d', outDir,
        '-encoding', 'UTF-8',
        '--release', '17',
        ...(classpath ? ['-cp', classpath] : []),
        javaFile
      ]

      const result = spawnSync(javacPath, args, { encoding: 'utf-8', timeout: 60000 })
      const stderr = result.stderr || ''

      if (result.status !== 0) {
        return { success: false, error: stderr, diagnostics: this.parseDiagnostics(stderr) }
      }

      const expectedClass = packageDir
        ? join(outDir, packageDir, `${className}.class`)
        : join(outDir, `${className}.class`)

      if (!existsSync(expectedClass)) {
        return { success: false, error: `Compiled class not found: ${expectedClass}` }
      }

      const classData = readFileSync(expectedClass)
      const saveResult = archiveService.saveFileEntry(archivePath, entryPath, classData)

      return saveResult.success
        ? { success: true }
        : { success: false, error: saveResult.error }
    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }

  private parseDiagnostics(stderr: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = []
    const lineRe = /\.java:(\d+):\s*(error|warning):\s*(.+)/g
    let match: RegExpExecArray | null
    while ((match = lineRe.exec(stderr)) !== null) {
      diagnostics.push({
        line: parseInt(match[1], 10),
        column: 1,
        message: match[3].trim(),
        severity: match[2] as 'error' | 'warning'
      })
    }
    return diagnostics
  }
}
