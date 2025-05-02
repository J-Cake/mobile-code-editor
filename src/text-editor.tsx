import * as React from "react";
import * as cm from 'codemirror';
import * as cm_state from '@codemirror/state';

import {Editor} from "./state.js";

import style from "@css/text-editor.css?raw";

export default class TextEditor implements Editor {
    public get title(): string {
        return 'Untitled';
    }

    source: string = '';
    state: cm_state.EditorState = cm_state.EditorState.create({
        doc: this.source,
        extensions: [cm.basicSetup]
    });

    async beforeClose(): Promise<void> {
        await this.save();
    }

    async save() {

    }

    render(): React.ReactNode {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            if (!ref.current)
                return;

            const editor = new cm.EditorView({
                state: this.state,
                parent: ref.current
            });

            return () => editor.destroy();
        }, [ref.current]);

        return <div className={"text-editor"}>
            <style scoped>{style}</style>
            <div className={"editor"} ref={ref} enterKeyHint={"enter"} {...{virtualkeyboardpolicy: "manual"}}/>
        </div>;
    }
}