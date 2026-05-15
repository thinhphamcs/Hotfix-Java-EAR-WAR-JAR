import React, { useState, useCallback, useRef } from 'react'
import type { useAppStore } from '../store/appStore'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'

type Store = ReturnType<typeof useAppStore>

interface Props {
  store: Store
}

export function Sidebar({ store }: Props) {
  const [width, setWidth] = useState(280)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = width

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return
      setWidth(Math.max(160, Math.min(600, startW + me.clientX - startX)))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width])

  const handleSearch = useCallback(async (query: string) => {
    if (!store.archivePath || !query.trim()) return
    store.setSearchQuery(query)
    store.setIsSearching(true)
    try {
      let results
      if (store.searchMode === 'filename') {
        results = await window.electronAPI.searchFilename(store.archivePath, query)
      } else {
        results = await window.electronAPI.searchContent(store.archivePath, query)
      }
      store.setSearchResults(results)
    } finally {
      store.setIsSearching(false)
    }
  }, [store.archivePath, store.searchMode])

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab-btn ${store.sidebarMode === 'tree' ? 'active' : ''}`}
          onClick={() => store.setSidebarMode('tree')}
          title="File Explorer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1.5A1.5 1.5 0 0 1 2.5 0h3.672a1.5 1.5 0 0 1 1.06.44l.823.823A.5.5 0 0 0 8.41 1.5H12.5A1.5 1.5 0 0 1 14 3v8.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5V3H1.5A.5.5 0 0 1 1 2.5v-1z"/>
          </svg>
        </button>
        <button
          className={`sidebar-tab-btn ${store.sidebarMode === 'search' ? 'active' : ''}`}
          onClick={() => store.setSidebarMode('search')}
          title="Search (Ctrl+Shift+F)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
          </svg>
        </button>
      </div>

      <div className="sidebar-content">
        {store.sidebarMode === 'tree' ? (
          <>
            <div className="sidebar-section-header">
              {store.archivePath
                ? store.archivePath.split(/[\\/]/).pop()
                : 'No archive open'}
            </div>
            {store.archiveRoot ? (
              <FileTree
                root={store.archiveRoot}
                activeTabPath={store.activeTab?.path}
                onOpenEntry={store.openTab}
              />
            ) : (
              <div className="sidebar-empty">Drop an EAR/WAR/JAR here or use Open</div>
            )}
          </>
        ) : (
          <SearchPanel
            query={store.searchQuery}
            mode={store.searchMode}
            results={store.searchResults}
            isSearching={store.isSearching}
            archiveRoot={store.archiveRoot}
            onSearch={handleSearch}
            onModeChange={store.setSearchMode}
            onSelectResult={(result) => {
              if (store.archiveRoot) {
                const entry = findEntry(store.archiveRoot, result.path)
                if (entry) store.openTab(entry)
              }
            }}
          />
        )}
      </div>

      <div className="sidebar-resize-handle" onMouseDown={onMouseDown} />
    </div>
  )
}

function findEntry(root: any, path: string): any {
  if (root.path === path) return root
  if (root.children) {
    for (const c of root.children) {
      const f = findEntry(c, path)
      if (f) return f
    }
  }
  return null
}
