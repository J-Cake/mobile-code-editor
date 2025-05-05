import * as  React from "react";

import state, {
    Cloneable,
    deserialise,
    fromPersistent,
    GlobalState,
    serialise,
    SerialisedObject,
} from "./state.js";
import Button from "./widgets/button.js";
import CentreLayout from "./layouts/centre-layout.js";

export class OpenEvent extends Event {
    constructor(public view: Editor) {
        super("open");
    }
}

export interface Viewport {
    openEditors: EditorList
}

type EditorId = number;

const toPersistent: typeof import('./state.js')['toPersistent'] = Symbol.for('serialise') as any;

export class EditorList implements Iterable<Editor>, Cloneable<{ editors: Record<EditorId, { editor: Editor, id: EditorId, open: boolean }> }> {

    constructor(private state: GlobalState) {}
    private static [fromPersistent](data: { editors: Record<EditorId, { editor: Editor, id: EditorId, open: boolean }>, nextId: number }): EditorList {
        const ed = new EditorList(state);
        // @ts-expect-error TS2540
        ed.#editors = deserialise(data.editors);
        return ed;
    }

    [toPersistent](this: EditorList, seen: WeakSet<object>): SerialisedObject<{
        editors: Record<EditorId, { editor: Editor, id: EditorId, open: boolean }>,
        nextId: number
    }, EditorList> {
        return {
            data: {
                editors: serialise(this.#editors, seen),
                nextId: this.nextId
            },
            [fromPersistent]: (data: { editors: Record<EditorId, { editor: Editor, id: EditorId, open: boolean }>, nextId: number }): EditorList => EditorList[fromPersistent](data)
        };
    }

    private nextId: number = 0;
    private get nextEditorId(): EditorId {
        return this.nextId = this.nextId + 1;
    }

    readonly #editors: Record<EditorId, { editor: Editor, id: EditorId, open: boolean }> = [];

    *[Symbol.iterator](): Iterator<Editor> {
        for (const editor in this.#editors)
            yield this.#editors[editor].editor;
    }

    open(editor: Editor): EditorId {
        const id: EditorId = this.nextEditorId;
        this.#editors[id] = { editor, id, open: true };
        this.state.dispatchEvent(new CustomEvent('edit-list-changed', { detail: this }))
        return id;
    }

    get newest() {
        return this.#editors[this.nextId]?.editor;
    }

    requestClose(editor: Editor) {
        if (!editor) return;

        if (!this.state.dispatchEvent(new RequestCloseEvent(editor))) return;

        if (editor.beforeClose)
            Promise.resolve(editor.beforeClose())
                .then(_ => this.close(editor));
        else
            this.close(editor);
    }

    close(editor: Editor) {
        const id = Object.values(this.#editors)
            .find(i => i.editor == editor)?.id;

        if (typeof id == 'number' && id in this.#editors)
            delete this.#editors[id];
    }

    findEditorId(editor: Editor): EditorId | undefined {
        const id = Object.values(this.#editors)
            .find(i => i.editor == editor)?.id;

        if (typeof id == 'number' && id in this.#editors)
            return id;
    }
}

export class RequestCloseEvent extends Event {
    constructor(public view: Editor) {
        super('request-close');
    }
}

export interface Editor<T = any> {
    title: string,

    render(this: Editor<T>): React.ReactNode;

    beforeClose?(this: Editor<T>): void | Promise<void>;
}

export default function() {
    const editors = state.useMask(state => state.viewport.openEditors);
    const [active, setActive] = React.useState(editors.newest ?? null);

    state.on('open', e => setActive(e.view));
    state.on('edit-list-changed', _ => {
        if (!Object.values(editors).some(editor => editor === active))
            setActive(editors.newest ?? null);
    });

    let Body = () => active?.render?.call(active) ?? <CentreLayout>
        <p>{"No tabs open."}</p>
        <Button variant={"primary"} icon={"\uECEB"} onActivate={() => state.dispatchCommand('project-files')}>
            {"Open File"}
        </Button>
	</CentreLayout>;

    return <>
        <div className="tab-layout-tabs">
            {[...editors].map(editor =>
                <div key={`tab-${editors.findEditorId(editor) ?? Math.random()}`}
                     className={`tab-layout-tab ${active === editor ? 'active' : ''}`}
                     onClick={() => setActive(editor)}>
                    {editor.title}

                    <Button icon={"\uEB99"} variant={"tertiary"} onActivate={() => editors.requestClose(editor)}/>
                </div>)}
        </div>

        <section className="tab-layout">
            <div className="tab-layout-content">
                <Body />
            </div>
        </section>
    </>
}