import React from 'react'
import type { OpenTab } from '../types'

interface Props {
  archivePath: string | null
  activeTab: OpenTab | null
  onOpenFile: () => void
  onSave: () => void
}

export function Toolbar({ archivePath, activeTab, onOpenFile, onSave }: Props) {
  const archiveName = archivePath ? archivePath.split(/[\\/]/).pop() : null

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={onOpenFile} title="Open Archive (Ctrl+O)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/>
          </svg>
          Open
        </button>
        {activeTab && (
          <button
            className={`toolbar-btn ${activeTab.isDirty ? 'toolbar-btn--primary' : ''}`}
            onClick={onSave}
            disabled={!activeTab.isDirty}
            title="Save (Ctrl+S)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4.414A1 1 0 0 0 14.707 4L12 1.293A1 1 0 0 0 11.586 1H2zm5.5 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM3 3h6v2H3V3z"/>
            </svg>
            Save
          </button>
        )}
      </div>

      <div className="toolbar-breadcrumb">
        {archiveName && <span className="breadcrumb-item">{archiveName}</span>}
        {activeTab && (
          <>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-item">{activeTab.name}</span>
            {activeTab.isClass && (
              <span className="badge badge--class" title="Java bytecode decompiled by CFR">
                CFR decompiled
              </span>
            )}
            {activeTab.isDirty && (
              <span className="badge badge--dirty">unsaved</span>
            )}
          </>
        )}
      </div>

      <div className="toolbar-right">
        <span className="toolbar-hint">Ctrl+P go-to-file · Ctrl+Shift+F search</span>
      </div>
    </div>
  )
}
