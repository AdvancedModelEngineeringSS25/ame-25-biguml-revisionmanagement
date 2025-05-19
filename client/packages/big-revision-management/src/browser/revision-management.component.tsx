/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import type { ReactElement } from 'react';
import { useState, useEffect, useContext } from 'react';
import { ImportTimelineModal } from './ImportTimelineModal.js';
import { ExportTimelineModal } from './ExportTimelineModal.js';
import { ConfirmRestoreModal } from './ConfirmRestoreModal.js';
import { VSCodeContext } from '@borkdominik-biguml/big-components';
import { FileSaveResponse } from '../common/file-save-action.js';
import { type Snapshot } from '../common/snapshot.js';

export function RevisionManagement(): ReactElement {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [timeline, setTimeline] = useState<Snapshot[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

    const { listenAction } = useContext(VSCodeContext);

    // Listen to VSCode file save responses
    useEffect(() => {
        listenAction(action => {
            if (FileSaveResponse.is(action)) {
                setTimeline(action.timeline);
            }
        });
    }, [listenAction]);

    // Listen to window messages for modal triggers
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { data } = event;
            console.log('[Webview] Received message:', data);
            if (data?.action === 'import') {
                setShowImportModal(true);
            } else if (data?.action === 'export') {
                setShowExportModal(true);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <div style={{ padding: '0.25rem 0.5rem', fontFamily: 'var(--vscode-font-family)', color: 'var(--vscode-editor-foreground)' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {timeline.map((snapshot) => {
                    const isExpanded = expandedId === snapshot.id;

                    const handleRestore = (snapshot: Snapshot) => {
                        setSelectedSnapshot(snapshot);
                        setShowRestoreModal(true);
                    };
                    
                    return (
                        <li
                            key={snapshot.id}
                            style={{ marginBottom: '0.5rem', cursor: 'pointer', position: 'relative' }}
                            onClick={() => setExpandedId(isExpanded ? null : snapshot.id)}
                        >
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--vscode-editor-foreground)',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '4px',
                                    left: '-14px'
                                }}
                            />
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.2 }}>
                                {snapshot.message}
                            </div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                {snapshot.author} • {new Date(snapshot.timestamp).toLocaleString()}
                            </div>
                            {isExpanded && (
                                <div style={{ marginTop: '0.4rem' }}>
                                    <svg
                                        width="200"
                                        height="200"
                                        viewBox="0 0 200 200"
                                        style={{
                                            border: '1px solid var(--vscode-editorWidget-border)',
                                            backgroundColor: 'white',
                                            display: 'block'
                                        }}
                                    >
                                        <g dangerouslySetInnerHTML={{ __html: snapshot.svg }} />
                                    </svg>

                                    <div style={buttonRowStyle}>
                                        <button onClick={() => handleRestore(snapshot)} style={cancelButtonStyle}>
                                            Restore
                                        </button>
                                        <button onClick={() => handleExportSnapshot(snapshot)} style={exportButtonStyle}>
                                            Export Snapshot
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {showImportModal && (
                <ImportTimelineModal
                    onClose={() => setShowImportModal(false)}
                    onImport={(file) => {
                        console.log('Imported file:', file.name);
                        // TODO: add logic for importing timeline from file
                    }}
                />
            )}
            {showExportModal && (
                <ExportTimelineModal onClose={() => setShowExportModal(false)} onExport={() => { /* ... */ }} />
            )}
            {showRestoreModal && selectedSnapshot && (
            <ConfirmRestoreModal
                onCancel={() => {
                    setShowRestoreModal(false);
                    setSelectedSnapshot(null);
                }}
                onConfirm={() => {
                    console.log('[Confirmed Restore] Snapshot:', selectedSnapshot.id);
                    setShowRestoreModal(false);
                    setSelectedSnapshot(null);
                    // TODO: Trigger real restore logic here
                }}
            />
        )}

        </div>
    );
}


const handleExportSnapshot = (snapshot: Snapshot) => {
    const blob = new Blob([snapshot.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
};


const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',              
    justifyContent: 'flex-end',       
    alignItems: 'center',
    gap: '0.4rem',
    borderTop: '1px solid var(--vscode-panel-border)',
    paddingTop: '0.75rem',
    marginTop: '1rem'
};

const buttonBaseStyle: React.CSSProperties = {
    fontSize: '13px',                         
    padding: '0.35rem 1.1rem',              
    borderRadius: '3px',
    cursor: 'pointer',
    minWidth: 'auto',
    display: 'inline-block',
    height: 'auto',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    lineHeight: '1.4'
};

const cancelButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'var(--vscode-button-secondaryBackground)',
    color: 'var(--vscode-button-secondaryForeground)',
    border: '1px solid var(--vscode-button-secondaryBorder)'
};

const exportButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: 'none'
};
