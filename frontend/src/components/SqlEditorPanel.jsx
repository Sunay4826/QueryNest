import Editor from '@monaco-editor/react';

export default function SqlEditorPanel({ value, onChange, onExecute, onHint, loadingQuery, loadingHint }) {
  return (
    <div className="editor-panel">
      <Editor
        height="240px"
        defaultLanguage="sql"
        value={value}
        onChange={(next) => onChange(next || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on'
        }}
      />
      <div className="editor-panel__actions">
        <button className="btn btn--primary" type="button" onClick={onExecute} disabled={loadingQuery}>
          {loadingQuery ? 'Running...' : 'Execute Query'}
        </button>
        <button className="btn btn--ghost" type="button" onClick={onHint} disabled={loadingHint}>
          {loadingHint ? 'Thinking...' : 'Get Hint'}
        </button>
      </div>
    </div>
  );
}
