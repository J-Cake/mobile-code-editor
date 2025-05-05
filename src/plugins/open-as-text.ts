import {GlobalState} from "../state.js";
import Plugin from "../plugin.js";
import TextEditor from "../text-editor.js";

export default class OpenAsText extends Plugin {
    register(mgr: GlobalState) {
        mgr.on('request-open', req => {
            req.preventDefault();
            mgr.mutate(state => state.viewport.openEditors.open(new TextEditor(req.file)));
        });
    }
}