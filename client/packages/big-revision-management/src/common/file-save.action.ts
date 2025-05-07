/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import { Action, RequestAction, type ResponseAction } from '@eclipse-glsp/protocol';

export interface RequestFileSaveAction extends RequestAction<FileSaveResponse> {
    kind: typeof RequestFileSaveAction.KIND;
    savedFile: string;
}

export namespace RequestFileSaveAction {
    export const KIND = 'requestFileSave';

    export function is(object: unknown): object is RequestFileSaveAction {
        return RequestAction.hasKind(object, KIND);
    }

    export function create(options: Omit<RequestFileSaveAction, 'kind' | 'requestId'>): RequestFileSaveAction {
        return {
            kind: KIND,
            requestId: '',
            ...options
        };
    }
}

export interface FileSaveResponse extends ResponseAction {
    kind: typeof FileSaveResponse.KIND;
    timeline: string[];
}
export namespace FileSaveResponse {
    export const KIND = 'fileSaveResponse';

    export function is(object: unknown): object is FileSaveResponse {
        return Action.hasKind(object, KIND);
    }

    export function create(
        options?: Omit<FileSaveResponse, 'kind' | 'responseId'> & { responseId?: string }
    ): FileSaveResponse {
        return {
            kind: KIND,
            responseId: '',
            timeline: [],
            ...options
        };
    }
}
