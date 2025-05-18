/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { BIGReactWebview, type ExperimentalModelState } from '@borkdominik-biguml/big-vscode-integration/vscode';
import { inject, injectable, postConstruct } from 'inversify';
import * as vscode from 'vscode';
import { FileSaveResponse } from '../common/file-save-action.js';
import { type Snapshot } from '../common/snapshot.js';

export const RevisionManagementId = Symbol('RevisionmanagementViewId');
import type { BIGWebviewProviderContext } from '@borkdominik-biguml/big-vscode-integration/vscode';


@injectable()
export class RevisionManagementProvider extends BIGReactWebview {
    @inject(RevisionManagementId)
    viewId: string;

    protected override cssPath = ['revision-management', 'bundle.css'];
    protected override jsPath = ['revision-management', 'bundle.js'];
    protected readonly actionCache = this.actionListener.createCache([
        FileSaveResponse.KIND
    ]);

    private currentModelState: ExperimentalModelState | null = null;
    private timeline: Snapshot[] = [];

    @postConstruct()
    protected override init(): void {
        super.init();
        console.log('Revision Management Provider init');

        const umlWatcher = vscode.workspace.createFileSystemWatcher('**/*.uml');

        this.toDispose.push(
            umlWatcher.onDidChange(uri => {
                console.log('[fswatcher] File changed (saved):', uri.fsPath);
                const affectedResource = this.currentModelState?.getResources().find(resource => this.matchesUri(resource.uri, uri.fsPath));
                if (affectedResource && this.currentModelState) {
                    this.timeline.push({
                        id: this.timeline.length.toString(),
                        timestamp: new Date().toISOString(),
                        author: "User", // todo not necessary
                        message: "File saved", 
                        svg: "", // todo add svg
                        state: this.currentModelState
                    });
                    this.updateTimeline();
                }               
            }),

            umlWatcher.onDidCreate(uri => {
                console.log('[fswatcher] File created:', uri.fsPath);
                // todo: maybe handle file creation
            }),

            umlWatcher
        );
        
        this.toDispose.push(this.actionCache);
    }

    protected override handleConnection(): void {
        super.handleConnection();

        console.log('Revision Management Provider handleConnection');

        this.toDispose.push(
            this.actionCache.onDidChange(message => this.webviewConnector.dispatch(message)),
            this.webviewConnector.onReady(() => {
                console.log('Revision Management Provider webviewConnector onReady');
                this.timeline = [];
                this.updateTimeline();
                this.webviewConnector.dispatch(this.actionCache.getActions());
            }),
            this.webviewConnector.onVisible(() => this.webviewConnector.dispatch(this.actionCache.getActions())),
            this.connectionManager.onDidActiveClientChange(() => {
                console.log('Revision Management Provider webviewConnector onDidActiveClientChange');
                this.timeline = [];
                this.updateTimeline();
            }),
            this.connectionManager.onNoActiveClient(() => {
                console.log('Revision Management Provider webviewConnector onNoActiveClient');
                this.currentModelState = null;
                this.timeline = [];
                this.updateTimeline();
            }),
            this.connectionManager.onNoConnection(() => {
                console.log('Revision Management Provider webviewConnector onNoConnection');
                this.currentModelState = null;
                this.timeline = [];
                this.updateTimeline();
            }),
            this.modelState.onDidChangeModelState((event) => {
                console.log('Revision Management Provider webviewConnector onDidChangeModelState', event.state);
                this.currentModelState = event.state;
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
        console.log('Revision Management Provider updateTimeline', this.currentModelState);
        this.webviewConnector.dispatch(FileSaveResponse.create({
            responseId: '',
            timeline: this.timeline
        }));
    }

    private matchesUri(uri1: string, uri2: string): boolean {
        const normalizedUri1 = this.normalizeUri(uri1);
        const normalizedUri2 = this.normalizeUri(uri2);

        return normalizedUri1 === normalizedUri2;
    }

    private normalizeUri(uri: string): string {
        // 1. Remove file:// prefix if present
        let p = uri.replace(/^file:\/+/, '');

        // 2. Replace backslashes (for Windows) with slashes
        p = p.replace(/\\/g, '/');

        // 3. Collapse multiple slashes
        p = p.replace(/\/{2,}/g, '/');

        // 4. Platform-specific adjustments
        if (process.platform === 'win32') {
            // a. Drop leading slash before drive letter: "/C:/foo" → "C:/foo"
            p = p.replace(/^\/([a-zA-Z]:)/, '$1');

            // b. Lowercase drive letter: "C:/Users" → "c:/Users"
            p = p.replace(/^([A-Z]):/, (_, d) => d.toLowerCase() + ':');
        }

        // 5. Re-add "file:///" for Windows, "file://" for Linux/macOS
        const prefix = process.platform === 'win32' ? 'file:///' : 'file://';
        return prefix + p;
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
    
}
