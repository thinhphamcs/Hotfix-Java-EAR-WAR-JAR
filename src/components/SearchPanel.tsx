import React, { useRef, useEffect } from 'react'
import type { SearchResult, ArchiveEntry } from '../types'

interface Props {
  query: string
  mode: 'filename' | 'content'
  results: SearchResult[]
  isSearching: boolean
  archiveRoot: ArchiveEntry | null
  onSearch: (query: string) => void
  onModeChange: (mode: 'filename' | 'content') => void
  onSelectResult: (result: SearchResult) => void
}

export function SearchPanel({
  query, mode, results, isSearching, archiveRoot,
  onSearch, onModeChange, onSelectResult
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch(inputRef.current?.value || '')
  }

  return (
    <div className="search-panel">
      <div className="search-mode-toggle">
        <button
          className={mode === 'filename' ? 'active' : ''}
          onClick={() => onModeChange('filename')}
        >
          By name
        </button>
        <button
          className={mode === 'content' ? 'active' : ''}
          onClick={() => onModeChange('content')}
        >
          By content
        </button>
      </div>

      <div className="search-input-row">
        <input
          ref={inputRef}
          className="search-input"
          placeholder={mode === 'filename' ? 'Search filenames...' : 'Search file contents...'}
          defaultValue={query}
          onKeyDown={handleKey}
          disabled={!archiveRoot}
        />
        <button
          className="search-go-btn"
          onClick={() => onSearch(inputRef.current?.value || '')}
          disabled={!archiveRoot || isSearching}
        >
          {isSearching ? '⟳' : '↵'}
        </button>
      </div>

      <div className="search-results">
        {isSearching && <div className="search-status">Searching...</div>}
        {!isSearching && results.length === 0 && query && (
          <div className="search-status">No results</div>
        )}
        {results.map((r, i) => (
          <div
            key={i}
            className="search-result"
            onClick={() => onSelectResult(r)}
            title={r.path}
          >
            <div className="search-result-path">
              {r.path.split('!').pop() || r.path}
            </div>
            {r.lineNumber !== undefined && (
              <div className="search-result-line">
                <span className="search-result-linenum">:{r.lineNumber}</span>
                <span className="search-result-content">{r.lineContent}</span>
              </div>
            )}
          </div>
        ))}
        {results.length === 500 && (
          <div className="search-status search-status--warn">Showing first 500 results</div>
        )}
      </div>
    </div>
  )
}
