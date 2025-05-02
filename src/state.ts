import * as React from 'react';
import * as idb from 'idb';

import TextEditor from "./text-editor.js";

export interface State {
    viewport: Viewport;
    directory: FileSystemDirectoryHandle | null,
}

export interface Viewport {
    openEditors: Editor[]
}

export interface Editor<T = any> {
    source: string,
    title: string,
    render(this: Editor<T>): React.ReactNode;

    beforeClose(this: Editor<T>): void | Promise<void>;
}

export default new class GlobalState extends EventTarget {
    #state: State = {
        directory: null,
        viewport: {
            openEditors: []
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
                this.addEventListener('state-loaded', () => this.#save(), { once: true });
        }, 2000);
    }

    async #restore() {
        const db = await idb.openDB('code-editor', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('state'))
                    db.createObjectStore('state');
            }
        });

        this.#dbHandle = db;

        const saved = await db.get('state', 'app-state');

        this.#state = saved ?? this.#state;
        this.#emit('state-loaded', this.#state);
    }

    readonly #save: () => void;

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
        this.#emit('state-change', this.#state);
        // TODO implement state change hooks
    }
    
    public mutateState(mut: (state: State) => void): void {
        // const prev = deepClone(this.#state);
        mut(this.#state);
        this.#save();
        this.#emit('state-change', this.#state);
    }

    public useMask<T>(callback: (state: State) => T): T {
        const [mask, setMask] = React.useState(callback(this.#state));

        this.addEventListener('state-change', e => {
            if (e instanceof CustomEvent)
                setMask(callback(e.detail));
        });

        return mask;
    }

    public requestClose(editor: Editor) {
        const remove = () => this.mutateState(state => {
            state.viewport.openEditors.splice(state.viewport.openEditors.indexOf(editor), 1);
        });

        const before = editor.beforeClose?.call(editor);

        if (this.#state.viewport.openEditors.includes(editor)) {
            if (before instanceof Promise)
                before.then(remove);
            else
                remove();

        }
    }

    #emit(event: string, data: any) {
        this.dispatchEvent(new CustomEvent(String(event), { detail: data }));
    }
}

const deepClone = <T extends object>(obj: T): T => Object.fromEntries(Object.entries(obj)
    .map(([k, v]) => [
        k,
        v && (typeof v === 'object' ? Object.assign(deepClone(v), { __proto: v.__proto }) : v)
    ] as const)) as T;

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function (this: any, ...args: any[]) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    } as T;
}