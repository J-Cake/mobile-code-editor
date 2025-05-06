import * as cm_state from '@codemirror/state';

import {GlobalState} from "../state.js";
import Plugin from "../plugin.js";
import TextEditor from "../text-editor.js";
import Modal from "../widgets/modal.js";
import FileTree from "../file-tree.js";
import { javascript } from '@codemirror/lang-javascript';

export default class OpenAsText extends Plugin {
    register(mgr: GlobalState) {

        mgr.registerCommand({
            display: "View project files",
            id: "project-files",
            shortcut: 'shift shift',
            icon: '\uED6A',
            run(state: GlobalState, payload?: any) {
                new Modal()
                    .header('Project Files')
                    .show(<>
                        <FileTree />
                    </>)
            }
        });

        mgr.on('request-open', req => {
            mgr.mutate(state => {
                req.preventDefault();
                for (const ext in OpenAsText.extensionMap)
                    if (req.file.name.toLocaleLowerCase().endsWith(ext.toLocaleLowerCase())) {
                        state.viewport.openEditors.open(new TypedTextEditor(req.file, OpenAsText.extensionMap[ext as keyof typeof OpenAsText.extensionMap]));
                        return;
                    }

                state.viewport.openEditors.open(new TextEditor(req.file));
            });
        });
    }

    static extensionMap = {
        js: javascript({
            typescript: true,
            jsx: true
        })
    } satisfies Record<string, cm_state.Extension>;
}

class TypedTextEditor extends TextEditor {
    constructor(file: FileSystemFileHandle, private readonly extension: cm_state.Extension) {
        super(file);
    }

    async getState(): Promise<cm_state.EditorStateConfig> {
        const state = await super.getState();
        state.extensions = Object.values(state.extensions ?? []).concat(this.extension);
        return state;
    }
}