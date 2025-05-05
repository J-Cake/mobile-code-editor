import * as React from "react";
import * as cm from 'codemirror';
import * as cm_view from '@codemirror/view';
import * as cm_state from '@codemirror/state';
import {javascript} from "@codemirror/lang-javascript";

import state, {ChangeNotifier, Cloneable, debounce, fromPersistent, SerialisedObject, toPersistent} from "./state.js";
import { Editor } from "./viewport.js";

import style from "@css/text-editor.css?raw";

export default class TextEditor implements Editor, Cloneable {
    view: cm.EditorView | null = null;

    constructor(private file: FileSystemFileHandle) {
        state.pushState(state => {
            if (state.observer instanceof ChangeNotifier)
                state.observer.watch(this.file, async () => {
                    return void this.view?.setState(cm_state.EditorState.create({
                        doc: await this.file.getFile().then(file => file.text()),
                    }));
                });

            return {};
        })
        this.save = debounce(async () => {
            const content = this.view?.state.doc.toString();

            if (typeof content == 'string')
                await this.file.createWritable()
                    .then(async writable => await writable.write(content) ?? writable)
                    .then(res => res.close());
        }, 2000);
    }

    [toPersistent](): SerialisedObject<FileSystemFileHandle, TextEditor> {
        return {
            data: this.file,
            [fromPersistent](file: FileSystemFileHandle): TextEditor {
                return new TextEditor(file);
            }
        }
    }


    public get title(): string {
        return this.file.name;
    }

    async beforeClose(): Promise<void> {
        await this.save();
        state.pushState(state => {
            if (state.observer instanceof ChangeNotifier)
                state.observer.stopWatching(this.file);

            return {};
        })
    }

    save: () => Promise<void>;

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
                            extensions: [
                                cm.basicSetup, javascript(),
                                cm.EditorView.updateListener.of(update => update.docChanged && this.save())
                            ]
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