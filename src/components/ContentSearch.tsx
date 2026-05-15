import React, { useState, useRef, useEffect } from 'react'
import type { SearchResult } from '../types'

interface Props {
  archivePath: string
  onClose: () => void
  onSelect: (result: SearchResult) => void
}

export function ContentSearch({ archivePath, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const runSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await window.electronAPI.searchContent(archivePath, query)
      setResults(r)
    } finally {
      setSearching(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette palette--wide" onClick={e => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="palette-header">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.6 }}>
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search file contents across entire archive..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="palette-search-btn" onClick={runSearch} disabled={searching}>
            {searching ? '⟳' : 'Search'}
          </button>
        </div>

        <div className="palette-results">
          {searching && <div className="palette-empty">Searching... (may take a moment for large archives)</div>}
          {!searching && results.length === 0 && query && (
            <div className="palette-empty">No matches found for "{query}"</div>
          )}
          {results.map((r, i) => {
            const filename = r.path.split('!').pop() || r.path
            return (
              <div
                key={i}
                className="palette-result palette-result--content"
                onClick={() => onSelect(r)}
                title={r.path}
              >
                <div className="palette-result-name">{filename}</div>
                <div className="palette-result-container">{r.path}</div>
                {r.lineNumber !== undefined && (
                  <div className="palette-result-line">
                    <span className="palette-result-linenum">Line {r.lineNumber}: </span>
                    <span className="palette-result-linetext">{r.lineContent}</span>
                  </div>
                )}
              </div>
            )
          })}
          {results.length === 500 && (
            <div className="palette-empty" style={{ color: '#f0c674' }}>Showing first 500 matches</div>
          )}
        </div>
      </div>
    </div>
  )
}
