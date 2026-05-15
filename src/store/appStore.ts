import { useState, useCallback, useRef } from 'react'
import type { ArchiveEntry, OpenTab, SearchResult, JavaInfo } from '../types'

export function useAppStore() {
  const [archiveRoot, setArchiveRoot] = useState<ArchiveEntry | null>(null)
  const [archivePath, setArchivePath] = useState<string | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'filename' | 'content'>('filename')
  const [sidebarMode, setSidebarMode] = useState<'tree' | 'search'>('tree')
  const [javaInfo, setJavaInfo] = useState<JavaInfo | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const tabContents = useRef<Map<string, string>>(new Map())

  const activeTab = tabs.find(t => t.id === activeTabId) || null

  const openArchive = useCallback(async (filePath: string) => {
    const root = await window.electronAPI.openArchive(filePath)
    setArchiveRoot(root)
    setArchivePath(filePath)
    setTabs([])
    setActiveTabId(null)
    setSearchResults([])
    setSidebarMode('tree')
    tabContents.current.clear()
  }, [])

  const openTab = useCallback((entry: ArchiveEntry) => {
    if (entry.isDirectory) return

    const existing = tabs.find(t => t.path === entry.path)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }

    const lang = detectLanguage(entry.name)
    const isClass = entry.name.endsWith('.class')
    const tab: OpenTab = {
      id: entry.path,
      path: entry.path,
      archivePath: entry.archivePath,
      entryName: entry.entryName,
      name: entry.name,
      language: lang,
      isClass,
      isDirty: false,
      isDecompiling: isClass
    }

    setTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
  }, [tabs])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      tabContents.current.delete(tabId)
      if (activeTabId === tabId) {
        const nextTab = next[Math.min(idx, next.length - 1)]
        setActiveTabId(nextTab?.id || null)
      }
      return next
    })
  }, [activeTabId])

  const markTabDirty = useCallback((tabId: string, dirty: boolean) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, isDirty: dirty } : t))
  }, [])

  const markTabDecompiled = useCallback((tabId: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, isDecompiling: false, language: 'java' } : t))
  }, [])

  const setTabContent = useCallback((tabId: string, content: string) => {
    tabContents.current.set(tabId, content)
  }, [])

  const getTabContent = useCallback((tabId: string) => {
    return tabContents.current.get(tabId)
  }, [])

  return {
    archiveRoot, archivePath, tabs, activeTabId, activeTab,
    searchResults, isSearching, searchQuery, searchMode,
    sidebarMode, setSidebarMode,
    javaInfo, setJavaInfo,
    statusMessage, setStatusMessage,
    openArchive, openTab, closeTab,
    markTabDirty, markTabDecompiled,
    setTabContent, getTabContent,
    setSearchResults, setIsSearching, setSearchQuery, setSearchMode,
    setActiveTabId
  }
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    java: 'java', class: 'java',
    xml: 'xml', xhtml: 'xml', tld: 'xml', wsdl: 'xml', xsd: 'xml', jspx: 'xml',
    json: 'json',
    html: 'html', htm: 'html', jsp: 'html',
    yml: 'yaml', yaml: 'yaml',
    properties: 'ini',
    sql: 'sql',
    groovy: 'groovy', gradle: 'groovy',
    kt: 'kotlin', kts: 'kotlin',
    js: 'javascript', ts: 'typescript',
    css: 'css', scss: 'scss',
    sh: 'shell', bat: 'bat',
    txt: 'plaintext', md: 'markdown',
    mf: 'plaintext', sf: 'plaintext', cfg: 'ini', conf: 'ini'
  }
  return map[ext] || 'plaintext'
}
