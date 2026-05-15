import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { ArchiveEntry, SearchResult } from '../types'

interface Props {
  archivePath: string
  onClose: () => void
  onSelect: (entry: ArchiveEntry) => void
}

export function CommandPalette({ archivePath, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    window.electronAPI.searchFilename(archivePath, q).then(r => {
      setResults(r)
      setSelected(0)
      setSearching(false)
    })
  }, [archivePath])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) {
      const r = results[selected]
      onSelect({
        name: r.path.split('!').pop() || r.path,
        path: r.path,
        archivePath: r.archivePath,
        entryName: r.entryName,
        isDirectory: false,
        isArchive: false,
        size: 0
      })
    }
  }

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="palette-header">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.6 }}>
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Go to file..."
            value={query}
            onChange={handleInput}
          />
          {searching && <span className="palette-spinner">⟳</span>}
        </div>
        <div className="palette-results">
          {results.map((r, i) => {
            const parts = r.path.split('!')
            const filename = parts.pop() || ''
            const container = parts.join(' › ')
            return (
              <div
                key={i}
                className={`palette-result ${i === selected ? 'palette-result--active' : ''}`}
                onClick={() => onSelect({
                  name: filename,
                  path: r.path,
                  archivePath: r.archivePath,
                  entryName: r.entryName,
                  isDirectory: false,
                  isArchive: false,
                  size: 0
                })}
              >
                <span className="palette-result-name">{filename}</span>
                {container && <span className="palette-result-container">{container}</span>}
              </div>
            )
          })}
          {!searching && query && results.length === 0 && (
            <div className="palette-empty">No files match "{query}"</div>
          )}
        </div>
      </div>
    </div>
  )
}
