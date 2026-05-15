import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { ArchiveService } from './services/archiveService'
import { JavaService } from './services/javaService'
import { SearchService } from './services/searchService'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
const archiveService = new ArchiveService()
const javaService = new JavaService()
const searchService = new SearchService(archiveService)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#252526',
      symbolColor: '#cccccc',
      height: 32
    },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    show: false,
    icon: join(__dirname, '..', 'resources', 'icons', 'icon.ico')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: File open ──────────────────────────────────────────────────────────

ipcMain.handle('dialog:openArchive', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Open Archive',
    filters: [
      { name: 'Java Archives', extensions: ['ear', 'war', 'jar'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('archive:open', async (_event, filePath: string) => {
  return archiveService.openArchive(filePath)
})

ipcMain.handle('archive:readFile', async (_event, archivePath: string, entryPath: string) => {
  return archiveService.readFileEntry(archivePath, entryPath)
})

ipcMain.handle('archive:saveFile', async (
  _event,
  archivePath: string,
  entryPath: string,
  content: string,
  isClass: boolean
) => {
  if (isClass) {
    return javaService.recompileAndSave(archivePath, entryPath, content, archiveService)
  }
  return archiveService.saveFileEntry(archivePath, entryPath, Buffer.from(content, 'utf-8'))
})

// ── IPC: Search ─────────────────────────────────────────────────────────────

ipcMain.handle('search:filename', async (_event, archivePath: string, query: string) => {
  return searchService.searchByFilename(archivePath, query)
})

ipcMain.handle('search:content', async (_event, archivePath: string, query: string) => {
  return searchService.searchByContent(archivePath, query)
})

// ── IPC: Java info ──────────────────────────────────────────────────────────

ipcMain.handle('java:getInfo', async () => {
  return javaService.getJavaInfo()
})

ipcMain.handle('java:decompile', async (_event, archivePath: string, entryPath: string) => {
  return javaService.decompileClass(archivePath, entryPath, archiveService)
})

// ── IPC: Shell ──────────────────────────────────────────────────────────────

ipcMain.handle('shell:showInExplorer', async (_event, filePath: string) => {
  if (existsSync(filePath)) shell.showItemInFolder(filePath)
})
