import {GlobalState} from "../state.js";
import Plugin from "../plugin.js";
import TextEditor from "../text-editor.js";
import Modal from "../widgets/modal.js";
import FileTree from "../file-tree.js";

export default class OpenAsText extends Plugin {
    register(mgr: GlobalState) {

        mgr.registerCommand({
            display: "View project files",
            id: "project-files",
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
            req.preventDefault();
            mgr.mutate(state => state.viewport.openEditors.open(new TextEditor(req.file)));
        });
    }
}