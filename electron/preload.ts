import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openArchiveDialog: () => ipcRenderer.invoke('dialog:openArchive'),
  openArchive: (filePath: string) => ipcRenderer.invoke('archive:open', filePath),
  readFile: (archivePath: string, entryPath: string) =>
    ipcRenderer.invoke('archive:readFile', archivePath, entryPath),
  saveFile: (archivePath: string, entryPath: string, content: string, isClass: boolean) =>
    ipcRenderer.invoke('archive:saveFile', archivePath, entryPath, content, isClass),
  searchFilename: (archivePath: string, query: string) =>
    ipcRenderer.invoke('search:filename', archivePath, query),
  searchContent: (archivePath: string, query: string) =>
    ipcRenderer.invoke('search:content', archivePath, query),
  getJavaInfo: () => ipcRenderer.invoke('java:getInfo'),
  decompileClass: (archivePath: string, entryPath: string) =>
    ipcRenderer.invoke('java:decompile', archivePath, entryPath),
  showInExplorer: (filePath: string) => ipcRenderer.invoke('shell:showInExplorer', filePath),

  onOpenFile: (callback: (filePath: string) => void) => {
    ipcRenderer.on('open-file', (_event, filePath) => callback(filePath))
    return () => ipcRenderer.removeAllListeners('open-file')
  }
})
