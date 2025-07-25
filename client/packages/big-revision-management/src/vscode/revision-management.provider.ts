/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { MinimapExportSvgAction, RequestMinimapExportSvgAction } from '@borkdominik-biguml/big-minimap';
import type { BIGGLSPVSCodeConnector, BIGWebviewProviderContext } from '@borkdominik-biguml/big-vscode-integration/vscode';
import { BIGReactWebview, TYPES, type ExperimentalModelState } from '@borkdominik-biguml/big-vscode-integration/vscode';
import { RequestExportSvgAction } from '@eclipse-glsp/protocol';
import { inject, injectable, postConstruct } from 'inversify';
import * as vscode from 'vscode';
import { DeleteSnapshotResponseAction } from '../common/actions/delete-snapshot-response-action.js';
import { FileSaveResponse } from '../common/actions/file-save-action.js';
import { RequestChangeSnapshotNameAction } from '../common/actions/request-change-snapshot-name-action.js';
import { RequestDeleteSnapshotAction } from '../common/actions/request-delete-snapshot-action.js';
import { RequestExportSnapshotAction } from '../common/actions/request-export-snapshot-action.js';
import { RequestImportSnapshotAction } from '../common/actions/request-import-snapshot-action.js';
import { RequestRestoreSnapshotAction } from '../common/actions/request-restore-snapshot-action.js';
import { RequestSaveFileAction } from '../common/actions/request-save-file-action.js';
import { RestoreSnapshotResponseAction } from '../common/actions/restore-snapshot-response-action.js';
import { type Snapshot } from '../common/snapshot.js';

export const RevisionManagementId = Symbol('RevisionmanagementViewId');

@injectable()
export class RevisionManagementProvider extends BIGReactWebview {
    @inject(RevisionManagementId)
    viewId: string;

    @inject(TYPES.GLSPVSCodeConnector)
    protected readonly connector!: BIGGLSPVSCodeConnector;

    protected override cssPath = ['revision-management', 'bundle.css'];
    protected override jsPath = ['revision-management', 'bundle.js'];
    protected readonly actionCache = this.actionListener.createCache([FileSaveResponse.KIND]);

    private lastSnapshotTime = 0;
    private currentModelState: ExperimentalModelState | null = null;
    private timeline: Snapshot[] = [];
    private svgRequestId: string | null = null;

    @postConstruct()
    protected override init(): void {
        super.init();
        console.log('Revision Management Provider init');

        const config = vscode.workspace.getConfiguration('bigUML');
        const configPersist = config.get<boolean>('timeline.persist');
    
        if (configPersist === false) {
            this.clearVSCodeStorage();
        }        

        const umlWatcher = vscode.workspace.createFileSystemWatcher('**/*.uml');

        this.toDispose.push(
            umlWatcher.onDidChange(async uri => {
                const configOnSave = config.get<boolean>('timeline.onSave');
                if (configOnSave === false) {
                    return;
                }

                console.log('[fswatcher] File changed (saved):', uri.fsPath);
                if (!this.connectionManager.hasActiveClient()) {
                    console.warn('[Snapshot] No active GLSP client available');
                    return;
                }

                console.log('[Snapshot] Triggering exportSvg via RequestMinimapExportSvgAction');
                this.createSnapshot('File saved');
            }),

            umlWatcher.onDidCreate(uri => {
                console.log('[fswatcher] File created:', uri.fsPath);
            }),

            umlWatcher
        );

        this.toDispose.push(
            this.connector.onClientActionMessage((message: any) => {
                if (MinimapExportSvgAction.is(message.action) && this.svgRequestId !== null) {
                    console.log('[RevisionManagementProvider] Received MinimapExportSvgAction message:', message);
                    const timelineEntry = this.timeline.find(s => s.id === this.svgRequestId);
                    if (timelineEntry) {
                        const { svg = '', bounds } = message.action;
                        timelineEntry.svg = svg;
                        timelineEntry.bounds = bounds;
                        this.svgRequestId = null;
                        this.updateTimeline();
                    }
                    return { kind: 'noop' } as any;
                }
            })
        );

        // Handle ExportSnapshot action triggered by webview button
        this.toDispose.push(
            this.actionListener.handleVSCodeRequest(RequestExportSnapshotAction.KIND, async () => {
                console.log('[RevisionManagementProvider] ExportSnapshot action received');
                this.connector.sendActionToActiveClient(RequestExportSvgAction.create());
                return { kind: 'noop' } as any;
            })
        );


        this.toDispose.push(
            this.actionListener.handleVSCodeRequest(RequestSaveFileAction.KIND, async () => {
                console.log('[RevisionManagementProvider] RequestSaveFileAction received');
                this.createSnapshot('Manual entry');
                return { kind: 'noop' } as any;
            })
        );

        this.toDispose.push(
            this.actionListener.handleVSCodeRequest(RequestImportSnapshotAction.KIND, async (message: any) => {
                console.log('[RevisionManagementProvider] ImportSnapshot action received');
                this.timeline = message.action.importedSnapshots;
                this.updateTimeline();
                 // TODO: needs server extension to update model shown in main window
                return { kind: 'noop' } as any;
            })
        );

        this.toDispose.push(
            this.actionListener.handleVSCodeRequest(RequestChangeSnapshotNameAction.KIND, async (message: any) => {
                console.log('[RevisionManagementProvider] RequestChangeSnapshotNameAction action received');
                const snapshot = this.timeline.find(s => s.id === message.action.snapshotId);
                if (snapshot) {
                    snapshot.message = message.action.name;
                }
                this.updateTimeline();
                return { kind: 'noop' } as any;
            })
        );

        this.toDispose.push(
            this.actionListener.handleVSCodeRequest(RequestRestoreSnapshotAction.KIND, async message => {
                const action = message.action as RequestRestoreSnapshotAction;
                const snapshotId = action.snapshotId;

                console.log(`[RevisionManagementProvider] Restore request received for snapshot ID: ${snapshotId}`);

                const snapshotIndex = this.timeline.findIndex(s => s.id === snapshotId);
                if (snapshotIndex !== -1) {
                    const snapshot = this.timeline[snapshotIndex];

                    console.log(`[RevisionManagementProvider] Restoring snapshot with ID ${snapshotId}:`, snapshot);

                    // restore file (does not work properly - to remove)
                    if (snapshot.resources) {
                        for (const resource of snapshot.resources) {
                            const uri = vscode.Uri.parse(resource.uri);
                            const encoded = new TextEncoder().encode(resource.content);
                            vscode.workspace.fs.writeFile(uri, encoded);
                        }
                    }

                    // todo: restore snapshot properly by dispatching an action to the server using the saved snapshot.model
                    // @haydar: add server action
                    // ... dispatch RestoreModelStateAction(snapshot.model) ...

                    this.timeline = this.timeline.slice(0, snapshotIndex + 1);
                    const key = this.getTimelineKey();
                    await this.extensionContext.globalState.update(key, this.timeline);
                    console.log(
                        `[RevisionManagementProvider] Timeline after restore saved for key: ${key} (entries: ${this.timeline.length})`
                    );

                    this.updateTimeline();

                    // TODO: this doesnt work - need server extension
                }

                return RestoreSnapshotResponseAction.create(action.requestId);
            })
        );


        this.toDispose.push(
            this.actionListener.handleVSCodeRequest(RequestDeleteSnapshotAction.KIND, async message => {
                const action = message.action as RequestDeleteSnapshotAction;
                const snapshotId = action.snapshotId;

                console.log(`[RevisionManagementProvider] Delete request received for snapshot ID: ${snapshotId}`);

                const snapshotIndex = this.timeline.findIndex(s => s.id === snapshotId);
                if (snapshotIndex === -1) {
                    console.warn(`[RevisionManagementProvider] Snapshot with ID ${snapshotId} not found`);
                    return { kind: 'noop' } as any;
                }
                this.timeline = [
                    ...this.timeline.slice(0, snapshotIndex),
                    ...this.timeline.slice(snapshotIndex + 1),
                ];
                const key = this.getTimelineKey();
                await this.extensionContext.globalState.update(key, this.timeline);
                this.updateTimeline();
                // TODO: needs server extension to update model shown in main window if last snapshot is deleted
                return DeleteSnapshotResponseAction.create(action.requestId);
            })
        );

        this.toDispose.push(this.actionCache);
    }

    

    protected override handleConnection(): void {
        super.handleConnection();

        const state = this.modelState.getModelState();
        if (state) {
            console.log('[RevisionManagementProvider] Initial model state loaded via getModelState');
            this.currentModelState = state;

            const key = this.getTimelineKey();
            const stored = this.extensionContext.globalState.get<Snapshot[]>(key) ?? [];
            console.log('[Timeline] Loaded from globalState for', key, ':', stored.length);
            this.timeline = stored;

            this.updateTimeline();
        } else {
            console.log('[RevisionManagementProvider] No initial model state available');
        }

        console.log('Revision Management Provider handleConnection');

        this.toDispose.push(
            this.actionCache.onDidChange(message => this.webviewConnector.dispatch(message)),
            this.webviewConnector.onReady(() => {
                console.log('Revision Management Provider webviewConnector onReady');
                this.webviewConnector.dispatch(this.actionCache.getActions());
            }),
            this.webviewConnector.onVisible(() => {
                this.webviewConnector.dispatch(this.actionCache.getActions());
            }),
            this.connectionManager.onDidActiveClientChange(() => {
                console.log('Revision Management Provider webviewConnector onDidActiveClientChange');
                this.updateTimeline();
            }),
            this.connectionManager.onNoActiveClient(() => {
                console.log('Revision Management Provider webviewConnector onNoActiveClient');
                this.currentModelState = null;
                this.updateTimeline();
            }),
            this.connectionManager.onNoConnection(() => {
                console.log('Revision Management Provider webviewConnector onNoConnection');
                this.currentModelState = null;
                this.updateTimeline();
            }),
            this.modelState.onDidChangeModelState(event => {
                console.log('Revision Management Provider webviewConnector onDidChangeModelState', event.state);
                this.currentModelState = event.state;
                const key = this.getTimelineKey();
                const stored = this.extensionContext.globalState.get<Snapshot[]>(key) ?? [];
                console.log('[Timeline] Loaded from globalState for', key, ':', stored.length);
                this.timeline = stored;
                this.updateTimeline();
            }),
            vscode.commands.registerCommand('timeline.import', () => {
                console.log('timeline.import command triggered');
                this.webviewView?.webview.postMessage({ action: 'import' });
            }),
            vscode.commands.registerCommand('timeline.export', () => {
                console.log('timeline.export command triggered');
                this.webviewView?.webview.postMessage({ action: 'export' });
            })
        );
    }

    protected updateTimeline(): void {
        if (!this.currentModelState) {
            console.warn('[Timeline] Skipped update — no model loaded yet');
            return;
        }

        console.log('Revision Management Provider updateTimeline', this.currentModelState);
        const key = this.getTimelineKey();
        this.extensionContext.globalState.update(key, this.timeline).then(() => {
            console.log('[Timeline] Saved to globalState for', key, ':', this.timeline.length);
        });

        this.webviewConnector.dispatch(
            FileSaveResponse.create({
                responseId: '',
                timeline: this.timeline
            })
        );
    }

    protected getCssUri(webview: vscode.Webview, ...path: string[]): vscode.Uri {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.extensionContext.extensionUri, 'webviews', ...path));
    }

    protected getJsUri(webview: vscode.Webview, ...path: string[]): vscode.Uri {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.extensionContext.extensionUri, 'webviews', ...path));
    }

    protected override resolveHTML(context: BIGWebviewProviderContext): void {
        const webview = context.webviewView.webview;

        const cssUri = this.getCssUri(webview, ...this.cssPath);
        const jsUri = this.getJsUri(webview, ...this.jsPath);

        const html = /* html */ `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Revision Management</title>
                <link rel="stylesheet" type="text/css" href="${cssUri}" />
            </head>
            <body style="margin:0; position:relative;">
            <div id="root"></div>
            <script type="module" src="${jsUri}"></script>
            </body>
            </html>
        `;

        webview.html = html;
    }

    private getTimelineKey(): string {
        const modelId = this.currentModelState?.getSourceModel().id;
        return `revisionTimeline:${modelId ?? 'unknown'}`;
    }

    private async clearVSCodeStorage(): Promise<void> {
        const keys = this.extensionContext.globalState.keys();

        for (const key of keys) {
            await this.extensionContext.globalState.update(key, undefined);
            console.log(`[Timeline] Cleared key: ${key}`);
        }

        console.log('[Timeline] All globalState keys cleared.');
    }

    private createSnapshot(message: string): void {
        if (!this.currentModelState) {
            console.warn('[Snapshot] No current model state available');
            return;
        }

        const affectedResources = this.currentModelState.getResources().filter(resource => resource.format === 'xml');
        if (!affectedResources.length) {
            console.warn('[Snapshot] No XML resources to snapshot');
            return;
        }

        const now = Date.now();
        if (now - this.lastSnapshotTime < 1000) {
            console.log('[Snapshot] Too soon since last snapshot — skipping.');
            return;
        }
        this.lastSnapshotTime = now;

        const snapshotResources = affectedResources.map(resource => ({
            uri: resource.uri,
            content: resource.content
        }));

        const id = this.timeline.length.toString();
        this.timeline.push({
            id,
            timestamp: new Date().toISOString(),
            message,
            resources: snapshotResources,
            model: this.currentModelState.getSourceModel()
        });

        this.svgRequestId = id;
        this.updateTimeline();
        this.connector.sendActionToActiveClient(RequestMinimapExportSvgAction.create());
    }

}
