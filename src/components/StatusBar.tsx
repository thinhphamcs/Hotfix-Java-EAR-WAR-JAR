import React from 'react'
import type { OpenTab, JavaInfo } from '../types'

interface Props {
  archivePath: string | null
  activeTab: OpenTab | null
  javaInfo: JavaInfo | null
  statusMessage: string
}

export function StatusBar({ archivePath, activeTab, javaInfo, statusMessage }: Props) {
  const archiveName = archivePath ? archivePath.split(/[\\/]/).pop() : null

  return (
    <div className="status-bar">
      <div className="status-left">
        {archiveName && (
          <span className="status-item status-item--archive" title={archivePath || ''}>
            📦 {archiveName}
          </span>
        )}
        {statusMessage && (
          <span className="status-item status-item--message">{statusMessage}</span>
        )}
      </div>

      <div className="status-right">
        {activeTab && (
          <>
            <span className="status-item">{activeTab.language.toUpperCase()}</span>
            {activeTab.isClass && (
              <span className="status-item status-item--badge">CFR decompiled</span>
            )}
          </>
        )}
        <JavaStatus javaInfo={javaInfo} />
      </div>
    </div>
  )
}

function JavaStatus({ javaInfo }: { javaInfo: JavaInfo | null }) {
  if (!javaInfo) return <span className="status-item">Checking Java...</span>

  if (!javaInfo.javaPath) {
    return <span className="status-item status-item--warn" title="Java not found on PATH">⚠ No Java</span>
  }

  return (
    <span
      className={`status-item ${javaInfo.javacPath ? 'status-item--ok' : 'status-item--warn'}`}
      title={`java: ${javaInfo.javaPath}\njavac: ${javaInfo.javacPath || 'not found'}`}
    >
      ☕ Java {javaInfo.javaVersion}
      {javaInfo.javacPath ? '' : ' (no javac)'}
    </span>
  )
}
