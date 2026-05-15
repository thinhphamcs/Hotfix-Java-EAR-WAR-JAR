import React, { useState, useCallback } from 'react'
import type { ArchiveEntry } from '../types'

interface Props {
  root: ArchiveEntry
  activeTabPath: string | undefined
  onOpenEntry: (entry: ArchiveEntry) => void
}

export function FileTree({ root, activeTabPath, onOpenEntry }: Props) {
  return (
    <div className="file-tree">
      {root.children?.map(child => (
        <TreeNode
          key={child.path}
          entry={child}
          depth={0}
          activeTabPath={activeTabPath}
          onOpenEntry={onOpenEntry}
        />
      ))}
    </div>
  )
}

interface NodeProps {
  entry: ArchiveEntry
  depth: number
  activeTabPath: string | undefined
  onOpenEntry: (entry: ArchiveEntry) => void
}

function TreeNode({ entry, depth, activeTabPath, onOpenEntry }: NodeProps) {
  const [expanded, setExpanded] = useState(depth === 0 && entry.isDirectory)
  const isActive = entry.path === activeTabPath
  const hasChildren = (entry.children?.length ?? 0) > 0

  const toggle = useCallback(() => {
    if (entry.isDirectory || entry.isArchive) {
      setExpanded(e => !e)
    } else {
      onOpenEntry(entry)
    }
  }, [entry, onOpenEntry])

  return (
    <div>
      <div
        className={`tree-node ${isActive ? 'tree-node--active' : ''} ${entry.isDirectory ? 'tree-node--dir' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={toggle}
        title={entry.path}
      >
        {(entry.isDirectory || entry.isArchive) && (
          <span className={`tree-chevron ${expanded ? 'tree-chevron--open' : ''}`}>▶</span>
        )}
        <EntryIcon entry={entry} />
        <span className="tree-label">{entry.name}</span>
        {!entry.isDirectory && (
          <span className="tree-size">{formatSize(entry.size)}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {entry.children!.map(child => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              activeTabPath={activeTabPath}
              onOpenEntry={onOpenEntry}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EntryIcon({ entry }: { entry: ArchiveEntry }) {
  const ext = entry.name.split('.').pop()?.toLowerCase() || ''

  if (entry.isDirectory) {
    return <span className="tree-icon tree-icon--dir">📁</span>
  }

  const icons: Record<string, string> = {
    ear: '📦', war: '🌐', jar: '☕',
    java: '☕', class: '🔢',
    xml: '📄', xhtml: '📄', tld: '📄', wsdl: '📄', xsd: '📄',
    json: '📋',
    html: '🌐', htm: '🌐', jsp: '🌐',
    yml: '⚙️', yaml: '⚙️',
    properties: '⚙️', cfg: '⚙️', conf: '⚙️',
    sql: '🗄️',
    mf: '📋', sf: '🔒',
    png: '🖼️', jpg: '🖼️', gif: '🖼️', svg: '🖼️',
    zip: '🗜️'
  }

  return <span className="tree-icon">{icons[ext] || '📄'}</span>
}

function formatSize(bytes: number): string {
  if (bytes === 0) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`
}
