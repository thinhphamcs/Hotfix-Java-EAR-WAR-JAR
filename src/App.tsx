import React, { useEffect, useCallback, useRef } from 'react'
import { useAppStore } from './store/appStore'
import { Sidebar } from './components/Sidebar'
import { EditorArea } from './components/EditorArea'
import { TabBar } from './components/TabBar'
import { StatusBar } from './components/StatusBar'
import { Toolbar } from './components/Toolbar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { CommandPalette } from './components/CommandPalette'
import { ContentSearch } from './components/ContentSearch'
import './styles/app.css'

export default function App() {
  const store = useAppStore()
  const [showCmdPalette, setShowCmdPalette] = React.useState(false)
  const [showContentSearch, setShowContentSearch] = React.useState(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Load Java info on startup
  useEffect(() => {
    window.electronAPI.getJavaInfo().then(store.setJavaInfo)
  }, [])

  // Listen for file opened from main process (drag onto dock/taskbar)
  useEffect(() => {
    const cleanup = window.electronAPI.onOpenFile((filePath) => {
      store.openArchive(filePath)
    })
    return cleanup
  }, [store.openArchive])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        if (store.archivePath) setShowCmdPalette(true)
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        if (store.archivePath) setShowContentSearch(true)
      }
      if (e.key === 'Escape') {
        setShowCmdPalette(false)
        setShowContentSearch(false)
      }
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        handleOpenDialog()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store.archivePath])

  // Drag-and-drop onto window
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) {
        const filePath = (file as any).path
        if (filePath) store.openArchive(filePath)
      }
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [store.openArchive])

  const handleOpenDialog = useCallback(async () => {
    const filePath = await window.electronAPI.openArchiveDialog()
    if (filePath) store.openArchive(filePath)
  }, [store.openArchive])

  return (
    <div className="app-root" ref={dropZoneRef}>
      <Toolbar
        archivePath={store.archivePath}
        activeTab={store.activeTab}
        onOpenFile={handleOpenDialog}
        onSave={async () => {
          if (!store.activeTab) return
          const content = store.getTabContent(store.activeTabId!)
          if (content === undefined) return
          const tab = store.activeTab
          store.setStatusMessage('Saving...')
          const result = await window.electronAPI.saveFile(
            tab.archivePath, tab.entryName, content, tab.isClass
          )
          if (result.success) {
            store.markTabDirty(tab.id, false)
            store.setStatusMessage('Saved successfully')
          } else {
            store.setStatusMessage(`Save failed: ${result.error}`)
          }
        }}
      />

      <div className="app-body">
        <Sidebar store={store} />
        <div className="editor-column">
          {store.tabs.length > 0 && (
            <TabBar
              tabs={store.tabs}
              activeTabId={store.activeTabId}
              onSelect={store.setActiveTabId}
              onClose={store.closeTab}
            />
          )}
          {store.archivePath ? (
            store.tabs.length > 0 ? (
              <EditorArea store={store} />
            ) : (
              <div className="editor-empty">
                <span>Select a file from the tree to open it</span>
              </div>
            )
          ) : (
            <WelcomeScreen onOpen={handleOpenDialog} />
          )}
        </div>
      </div>

      <StatusBar
        archivePath={store.archivePath}
        activeTab={store.activeTab}
        javaInfo={store.javaInfo}
        statusMessage={store.statusMessage}
      />

      {showCmdPalette && (
        <CommandPalette
          archivePath={store.archivePath!}
          onClose={() => setShowCmdPalette(false)}
          onSelect={(entry) => {
            store.openTab(entry)
            setShowCmdPalette(false)
          }}
        />
      )}

      {showContentSearch && (
        <ContentSearch
          archivePath={store.archivePath!}
          onClose={() => setShowContentSearch(false)}
          onSelect={(result) => {
            // Open the file at the matching entry
            if (store.archiveRoot) {
              const entry = findEntryByPath(store.archiveRoot, result.path)
              if (entry) store.openTab(entry)
            }
            setShowContentSearch(false)
          }}
        />
      )}
    </div>
  )
}

function findEntryByPath(root: any, path: string): any {
  if (root.path === path) return root
  if (root.children) {
    for (const child of root.children) {
      const found = findEntryByPath(child, path)
      if (found) return found
    }
  }
  return null
}
