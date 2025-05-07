/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { BIGReactWebview } from '@borkdominik-biguml/big-vscode-integration/vscode';
import { inject, injectable, postConstruct } from 'inversify';
import * as vscode from 'vscode';
import { FileSaveResponse } from '../common/file-save.action.js';

export const RevisionManagementId = Symbol('RevisionmanagementViewId');

@injectable()
export class FileSaveProvider extends BIGReactWebview {
    @inject(RevisionManagementId)
    viewId: string;

    protected override cssPath = ['revision-management', 'bundle.css'];
    protected override jsPath = ['revision-management', 'bundle.js'];
    protected readonly actionCache = this.actionListener.createCache([FileSaveResponse.KIND]);

    @postConstruct()
    protected override init(): void {
        super.init();

        this.toDispose.push(this.actionCache);
    }

    protected override handleConnection(): void {
        super.handleConnection();

        vscode.workspace.onDidSaveTextDocument(doc => {
            console.log('File saved:', doc.fileName);
        });

        this.toDispose.push(
            this.actionCache.onDidChange(message => this.webviewConnector.dispatch(message)),
            this.webviewConnector.onReady(() => {
                this.timeline();
                this.webviewConnector.dispatch(this.actionCache.getActions());
            }),
            this.webviewConnector.onVisible(() => this.webviewConnector.dispatch(this.actionCache.getActions())),
            this.connectionManager.onDidActiveClientChange(() => {
                this.timeline();
            }),
            this.connectionManager.onNoActiveClient(() => {
                // Send a message to the webview when there is no active client
                this.webviewConnector.dispatch(FileSaveResponse.create());
            }),
            this.connectionManager.onNoConnection(() => {
                // Send a message to the webview when there is no glsp client
                this.webviewConnector.dispatch(FileSaveResponse.create());
            }),
            this.modelState.onDidChangeModelState(() => {
                this.timeline();
            })
        );
    }

    protected timeline(): void {
        this.actionDispatcher.dispatch(
            FileSaveResponse.create({
                timeline: []
            })
        );
    }
}
