/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { VSCodeContext } from '@borkdominik-biguml/big-components';
import { useContext, useEffect, useState } from 'react';
import { RevisionManagementResponse } from '../common/index.js';

export function RevisionManagement(): React.ReactElement {
    const { listenAction } = useContext(VSCodeContext);
    const [timeline, setTimeline] = useState(["File saved", "File saved"]);

    useEffect(() => {
        listenAction(action => {
            if (RevisionManagementResponse.is(action)) {
                setTimeline(action.timeline);
            }
        });
    }, [listenAction]);

    return (
        <div>
            <div style={{ width: '100%', fontSize: '1em' }}>
                {timeline.map((item, index) => (
                    <div
                        className="timeline-item"
                        key={index}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '3px 6px',
                            borderBottom: index < timeline.length - 1 ? '1px solid #333' : 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <span style={{ whiteSpace: 'nowrap' }}>{item}</span>

                    </div>
                ))}
            </div>
        </div>
    );
}
