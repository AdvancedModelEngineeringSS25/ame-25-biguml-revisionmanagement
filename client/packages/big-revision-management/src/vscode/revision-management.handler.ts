/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import {
    EXPERIMENTAL_TYPES,
    TYPES,
    type ActionDispatcher,
    type ActionListener,
    type Disposable,
    type ExperimentalGLSPServerModelState
} from '@borkdominik-biguml/big-vscode-integration/vscode';
import { DisposableCollection } from '@eclipse-glsp/protocol';
import { inject, injectable, postConstruct } from 'inversify';
import { RequestRevisionManagementAction, RevisionManagementResponse } from '../common/revision-management.action.js';

// Handle the action within the server and not the glsp client / server
@injectable()
export class RevisionManagementHandler implements Disposable {
    @inject(TYPES.ActionDispatcher)
    protected readonly actionDispatcher: ActionDispatcher;
    @inject(TYPES.ActionListener)
    protected readonly actionListener: ActionListener;
    @inject(EXPERIMENTAL_TYPES.GLSPServerModelState)
    protected readonly modelState: ExperimentalGLSPServerModelState;

    private readonly toDispose = new DisposableCollection();
    private timeline: string[] = [];


    @postConstruct()
    protected init(): void {
        this.toDispose.push(
            this.actionListener.handleVSCodeRequest<RequestRevisionManagementAction>(RequestRevisionManagementAction.KIND, async message => {
                this.timeline.push(message.action.savedFile);
                console.log(`Hello World from the GLSP Client for Revision Management: ${this.timeline}`);
                return RevisionManagementResponse.create({
                    timeline: this.timeline
                });
            })
        );
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}
