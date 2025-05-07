/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import type { Action, IActionHandler, ICommand } from '@eclipse-glsp/client';
import { injectable } from 'inversify';
import { RequestRevisionManagementAction, RevisionManagementResponse } from '../common/revision-management.action.js';

@injectable()
export class RevisionManagementHandler implements IActionHandler {
    private timeline: string[] = [];

    handle(action: Action): ICommand | Action | void {
        if (RequestRevisionManagementAction.is(action)) {
            this.timeline.push(action.savedFile);
            return RevisionManagementResponse.create({
                timeline: this.timeline
            });
        }
    }
}
