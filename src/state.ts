import * as React from 'react';
import * as idb from 'idb';

import TextEditor from "./text-editor.js";

export interface Settings {
    excludeFiles: (string | RegExp)[]
}

export interface Viewport {
    openEditors: Record<EditorId, Editor>
}

type EditorId = string;

export interface Editor<T = any> {
    title: string,

    render(this: Editor<T>): React.ReactNode;

    beforeClose(this: Editor<T>): void | Promise<void>;
}

interface CustomEventTarget {
    'request-open': Editor,
    'request-close': Editor
    'state-loaded': State,
    'state-changed': State,
    'edit-list-changed': Editor[],
    'open-project': FileSystemDirectoryHandle,
    'close-project': void,
}

export interface State {
    viewport: Viewport;
    directory: FileSystemDirectoryHandle | null,
    observer: ChangeNotifier | null,
    settings: Settings
}

export default new class GlobalState extends EventTarget {
    #state: State = {
        directory: null,
        observer: null,
        viewport: {
            openEditors: {}
        },
        settings: {
            excludeFiles: [
                /\/\./
            ]
        }
    }

    #dbHandle?: idb.IDBPDatabase;

    constructor() {
        super();

        this.#restore();
        this.#save = debounce(async () => {
            if (this.#dbHandle)
                await this.#dbHandle.put('state', this.#state, 'app-state');
            else
                this.on('state-loaded', () => this.#save(), {once: true});
        }, 2000);
    }

    async #restore() {
        const db = await idb.openDB('code-editor', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('state'))
                    db.createObjectStore('state');
            },
        });

        this.#dbHandle = db;

        const saved = await db.get('state', 'app-state');

        this.#state = saved ?? this.#state;
        this.#emit('state-loaded', this.#state);
    }

    readonly #save: () => void;

    get nextEditorId(): EditorId {
        return Object.keys(this.#state.viewport.openEditors).length.toString();
    }

    public pushState(state: Partial<State> | ((state: State) => Partial<State>)) {
        // const prev = deepClone(this.#state);

        if (typeof state === 'function')
            this.#state = {
                ...this.#state,
                ...state(this.#state)
            };
        else
            this.#state = {
                ...this.#state,
                ...state
            };

        this.#save();
        this.#emit('state-changed', this.#state);
        // TODO implement state change hooks
    }

    public mutateState(mut: (state: State) => void): void {
        mut(this.#state);
        this.#save();
        this.#emit('state-changed', this.#state);
    }

    public useMask<T>(callback: (state: State) => T): T {
        const [mask, setMask] = React.useState(callback(this.#state));

        this.on('state-changed', e => {
            if (e instanceof CustomEvent)
                setMask(callback(e.detail));
        });

        return mask;
    }

    public requestClose(editor: Editor) {
        const remove = () => this.mutateState(state => {
            const id = Object.entries(state.viewport.openEditors).find(([id, ed]) => ed === editor)?.[0];
            if (id)
                delete state.viewport.openEditors[id];
        });

        Promise.resolve(editor.beforeClose?.call(editor))
            .then(remove)
            .then(() => {
                this.#emit('request-close', editor);
                this.#emit('edit-list-changed', Object.values(this.#state.viewport.openEditors));
            });

    }

    public requestOpen(file: FileSystemFileHandle) {
        const editor = new TextEditor(file);

        this.mutateState(state => {
            state.viewport.openEditors[this.nextEditorId] = editor;
        });

        this.#emit('request-open', editor);
        this.#emit('edit-list-changed', Object.values(this.#state.viewport.openEditors));
    }

    public openProject(dir: FileSystemDirectoryHandle) {
        this.mutateState(state => {
            state.directory = dir;
            state.observer = new ChangeNotifier(dir);
        });

        this.#emit('open-project', dir);
    }

    public closeProject() {
        this.mutateState(state => {
            state.directory = null;
        });

        this.#emit('close-project');
    }

    #emit<Event extends keyof CustomEventTarget>(event: Event, data?: CustomEventTarget[Event]) {
        this.dispatchEvent(new CustomEvent(String(event), {detail: data}));
    }

    public on<K extends keyof CustomEventTarget>(type: K, callback: (event: CustomEvent<CustomEventTarget[K]>) => void, options?: AddEventListenerOptions) {
        this.addEventListener(type, callback as EventListener, options);
    }
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function (this: any, ...args: any[]) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    } as T;
}

export class ChangeNotifier {
    #watchers: {
        file: FileSystemFileHandle,
        callback: () => void
    }[] = [];

    #observer: FileSystemObserver;

    constructor(dir: FileSystemDirectoryHandle) {
        const observer = this.#observer = new FileSystemObserver(results => {
            for (const record of results)
                if (record.changedHandle instanceof FileSystemFileHandle)
                    for (const file of this.#watchers)
                        if (file.file == record.changedHandle)
                            file.callback();
        });

        console.log(observer);

        observer.observe(dir, { recursive: true });
    }

    public watch(file: FileSystemFileHandle, callback: () => void) {
        this.#watchers.push({ file, callback })
    }

    public stopWatching(file: FileSystemFileHandle) {
        for (let index = this.#watchers.findIndex(i => i.file == file); index > -1; index = this.#watchers.findIndex(i => i.file == file))
            this.#watchers.splice(index, 1);
    }
}