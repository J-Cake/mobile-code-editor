import * as React from "react";
import * as cm from 'codemirror';
import * as cm_state from '@codemirror/state';

import state, {ChangeNotifier, Cloneable, Command,
    debounce,
    fromPersistent,
    SerialisedObject,
    toPersistent
} from "./state.js";
import {File, readUtf8, ResourceUrl, writeUtf8} from './workspace.js';
import {Editor} from "./viewport.js";

import style from "@css/text-editor.css?raw";

export default class TextEditor implements Editor, Cloneable {
    view: cm.EditorView | null = null;

    async getState(): Promise<cm_state.EditorStateConfig> {
        return {
            doc: await readUtf8(this.file),
            extensions: [
                cm.basicSetup,
                cm.EditorView.updateListener.of(update => update.docChanged && this.save())
            ]
        };
    }

    static async fromUrl(url: ResourceUrl): Promise<TextEditor> {
        return await new Promise(ok => state.mutate(state => state.workspace?.get(url)));
    }

    constructor(protected file: File) {
        state.pushState(state => {
            // TODO: Watch for changes

            return {};
        })
        this.save = debounce(async () => {
            const content = this.view?.state.doc.toString();

            if (typeof content == 'string')
                await writeUtf8(this.file, content);
        }, 2000);
    }

    listContextActions(): Command[] {
        return [];
    }
    async [toPersistent](): Promise<SerialisedObject<ResourceUrl, TextEditor>> {
        return {
            data: this.file.url(),
            async [fromPersistent](file: ResourceUrl): Promise<TextEditor> {
                return await TextEditor.fromUrl(file);
            }
        }
    }


    public get title(): string {
        return this.file.name;
    }

    async beforeClose(): Promise<void> {
        await this.save();
    }

    save: () => Promise<void>;

    render(): React.ReactNode {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            readUtf8(this.file)
                .then(async file => {
                    this.view = new cm.EditorView({
                        parent: ref.current!,
                        state: cm_state.EditorState.create(await this.getState())
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