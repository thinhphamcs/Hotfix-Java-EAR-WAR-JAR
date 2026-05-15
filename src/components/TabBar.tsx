import React from 'react'
import type { OpenTab } from '../types'

interface Props {
  tabs: OpenTab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: Props) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeTabId ? 'tab--active' : ''} ${tab.isDirty ? 'tab--dirty' : ''}`}
          onClick={() => onSelect(tab.id)}
          title={tab.path}
        >
          <FileIcon name={tab.name} />
          <span className="tab-name">{tab.name}</span>
          {tab.isDirty && <span className="tab-dirty-dot" />}
          <button
            className="tab-close"
            onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
            title="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const colors: Record<string, string> = {
    java: '#f89820', class: '#f89820',
    xml: '#e8a95a', xhtml: '#e8a95a', tld: '#e8a95a', wsdl: '#e8a95a', xsd: '#e8a95a',
    json: '#f0c674',
    html: '#e34c26', jsp: '#e34c26',
    yml: '#cb171e', yaml: '#cb171e',
    properties: '#8bc34a',
    jar: '#f44336', war: '#ff9800', ear: '#9c27b0',
    sql: '#4db6ac',
    txt: '#9e9e9e', mf: '#9e9e9e', sf: '#9e9e9e'
  }
  const color = colors[ext] || '#9e9e9e'

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginRight: 4, flexShrink: 0 }}>
      <rect width="12" height="12" rx="2" fill={color} opacity="0.8" />
      <text x="6" y="9" textAnchor="middle" fontSize="7" fill="white" fontFamily="monospace">
        {ext.substring(0, 2).toUpperCase()}
      </text>
    </svg>
  )
}
