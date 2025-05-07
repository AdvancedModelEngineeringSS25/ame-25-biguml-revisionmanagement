/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import * as vscode from 'vscode';

export function watchCurrentSave() {
    console.log('Watching for file save...');
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const target = editor.document;

  vscode.workspace.onDidSaveTextDocument(doc => {
    if (doc === target) {
      console.log('File saved:', doc.fileName);
    }
  });
}