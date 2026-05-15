import React from 'react'

interface Props {
  onOpen: () => void
}

export function WelcomeScreen({ onOpen }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-logo">📦</div>
        <h1 className="welcome-title">EAR Explorer</h1>
        <p className="welcome-sub">Open, browse, search, edit, and hotfix Java EAR/WAR/JAR archives</p>

        <button className="welcome-open-btn" onClick={onOpen}>
          Open Archive
          <span className="welcome-shortcut">Ctrl+O</span>
        </button>

        <div className="welcome-drop-hint">or drag and drop an EAR / WAR / JAR file here</div>

        <div className="welcome-features">
          <div className="welcome-feature">
            <span className="welcome-feature-icon">🔍</span>
            <div>
              <strong>Search across archives</strong>
              <div>Filename or content search inside nested JARs</div>
            </div>
          </div>
          <div className="welcome-feature">
            <span className="welcome-feature-icon">☕</span>
            <div>
              <strong>CFR decompiler built-in</strong>
              <div>.class files shown as readable Java</div>
            </div>
          </div>
          <div className="welcome-feature">
            <span className="welcome-feature-icon">⚡</span>
            <div>
              <strong>Hotfix in place</strong>
              <div>Edit → javac recompile → .class swapped back</div>
            </div>
          </div>
          <div className="welcome-feature">
            <span className="welcome-feature-icon">⌨️</span>
            <div>
              <strong>Keyboard-first</strong>
              <div>Ctrl+P go-to-file · Ctrl+Shift+F content search · Ctrl+S save</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
