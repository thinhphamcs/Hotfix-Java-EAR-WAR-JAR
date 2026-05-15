import React, { useEffect, useRef, useCallback } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import type { useAppStore } from '../store/appStore'
import type { editor } from 'monaco-editor'

type Store = ReturnType<typeof useAppStore>

interface Props {
  store: Store
}

export function EditorArea({ store }: Props) {
  const monaco = useMonaco()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const activeTab = store.activeTab

  // Load file content when active tab changes
  useEffect(() => {
    if (!activeTab) return
    const tabId = activeTab.id

    const existing = store.getTabContent(tabId)
    if (existing !== undefined) return  // already loaded

    if (activeTab.isClass) {
      // Decompile via CFR
      window.electronAPI.decompileClass(activeTab.archivePath, activeTab.entryName)
        .then(({ source, error }) => {
          const content = error
            ? `// Decompilation failed: ${error}\n// Raw bytecode cannot be displayed as text.`
            : source
          store.setTabContent(tabId, content)
          store.markTabDecompiled(tabId)
          if (editorRef.current && store.activeTabId === tabId) {
            editorRef.current.setValue(content)
          }
        })
    } else {
      // Read raw bytes and decode as UTF-8
      window.electronAPI.readFile(activeTab.archivePath, activeTab.entryName)
        .then((data) => {
          const buf = data instanceof Uint8Array ? data : new Uint8Array(Object.values(data as any))
          const content = new TextDecoder('utf-8', { fatal: false }).decode(buf)
          store.setTabContent(tabId, content)
          if (editorRef.current && store.activeTabId === tabId) {
            editorRef.current.setValue(content)
          }
        })
    }
  }, [activeTab?.id])

  // Ctrl+S inside editor
  useEffect(() => {
    if (!monaco || !editorRef.current) return
    const disposable = editorRef.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      async () => {
        if (!activeTab) return
        const content = store.getTabContent(activeTab.id) ?? ''
        store.setStatusMessage('Saving...')
        const result = await window.electronAPI.saveFile(
          activeTab.archivePath, activeTab.entryName, content, activeTab.isClass
        )
        if (result.success) {
          store.markTabDirty(activeTab.id, false)
          store.setStatusMessage('Saved')
          if (monaco && result.diagnostics?.length === 0) {
            const model = editorRef.current?.getModel()
            if (model) monaco.editor.setModelMarkers(model, 'javac', [])
          }
        } else {
          store.setStatusMessage(`Save failed: ${result.error}`)
          // Show compile errors as markers
          if (result.diagnostics && monaco && editorRef.current) {
            const model = editorRef.current.getModel()
            if (model) {
              const markers = result.diagnostics.map((d: any) => ({
                severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
                startLineNumber: d.line,
                startColumn: d.column,
                endLineNumber: d.line,
                endColumn: 999,
                message: d.message,
                source: 'javac'
              }))
              monaco.editor.setModelMarkers(model, 'javac', markers)
            }
          }
        }
      }
    )
    // addCommand returns a string ID, nothing to dispose
  }, [monaco, activeTab?.id])

  const handleEditorDidMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed

    // Load content for current tab on mount
    if (activeTab) {
      const content = store.getTabContent(activeTab.id)
      if (content !== undefined) {
        ed.setValue(content)
      }
    }
  }, [])

  const handleChange = useCallback((value: string | undefined) => {
    if (!activeTab || value === undefined) return
    const prev = store.getTabContent(activeTab.id)
    store.setTabContent(activeTab.id, value)
    if (prev !== undefined && value !== prev) {
      store.markTabDirty(activeTab.id, true)
    }
  }, [activeTab?.id])

  if (!activeTab) return null

  const content = store.getTabContent(activeTab.id) ?? ''
  const isLoading = activeTab.isDecompiling && content === ''

  return (
    <div className="editor-area">
      {isLoading && (
        <div className="editor-loading">
          <span>Decompiling with CFR...</span>
        </div>
      )}
      <Editor
        height="100%"
        language={activeTab.language}
        value={isLoading ? '' : content}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          automaticLayout: true,
          readOnly: isLoading
        }}
        onMount={handleEditorDidMount}
        onChange={handleChange}
      />
    </div>
  )
}
