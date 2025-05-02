import * as React from "react";
import * as cm from 'codemirror';
import * as cm_state from '@codemirror/state';
import {javascript} from "@codemirror/lang-javascript";

import {Editor} from "./state.js";

import style from "@css/text-editor.css?raw";

export default class TextEditor implements Editor {
    view: cm.EditorView | null = null;

    constructor(private file: FileSystemFileHandle) {

    }

    public get title(): string {
        return this.file.name;
    }

    async beforeClose(): Promise<void> {
        await this.save();
    }

    async save() {

    }

    render(): React.ReactNode {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            this.file.getFile()
                .then(file => file.text())
                .then(file => {
                    this.view = new cm.EditorView({
                        parent: ref.current!,
                        state: cm_state.EditorState.create({
                            doc: file,
                            extensions: [cm.basicSetup, javascript()]
                        })
                    });

                    ref.current?.focus();
                });

            return () => this.view?.destroy();
        }, []);

        return <div className={"text-editor"}>
            <style scoped>{style}</style>
            <div className={"editor"} ref={ref} enterKeyHint={"enter"} {...{virtualkeyboardpolicy: "manual"}}/>
        </div>;
    }
}