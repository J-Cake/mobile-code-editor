import * as React from 'react';
import * as idb from 'idb';
import mousetrap from 'mousetrap';

import {RequestOpenEvent} from "./file-tree.js";
import {Editor, EditorList, OpenEvent, Viewport} from "./viewport.js";
import Plugin from "./plugin.js";
import OpenAsText from "./plugins/open-as-text.js";
import {SettingsPlugin} from "./plugins/settings.js";
import Build, {BuildStep, Group, Trigger} from "./plugins/build.js";

export interface Settings {
    excludeFiles: (string | RegExp)[]
}

interface CustomEventTarget {
    'open': OpenEvent,
    'request-open': RequestOpenEvent,
    'request-close': CustomEvent<Editor>
    'state-loaded': CustomEvent<State>,
    'state-changed': CustomEvent<State>,
    'edit-list-changed': CustomEvent<EditorList>,
    'open-project': CustomEvent<FileSystemDirectoryHandle>,
    'close-project': CustomEvent<void>,
    'register-command': CustomEvent<Command>,
}

export interface State {
    viewport: Viewport;
    directory: FileSystemDirectoryHandle | null,
    observer: ChangeNotifier | null,
    settings: Settings,
    plugins: Plugin[],

    projectSpecific: Map<FileSystemDirectoryHandle, ProjectState>,

    commands: {
        registered: {
            [id in Command['id']]: Command
        },
        keybindings: {
            [key: string]: Command['id']
        }
    }
}

export interface ProjectState {
    build?: BuildState
}

export interface BuildState {
    groups: Group[],
    steps: BuildStep<any>[],
    triggers: Trigger[]
}

export interface Command {
    display: string,
    id: string,
    run: (state: GlobalState, payload?: any) => void,
    shortcut?: string,
    icon?: string,
    description?: string,
}

export const toPersistent = Symbol.for('serialise');
export const fromPersistent = Symbol.for('deserialise');

export interface Cloneable<Serialised = any, Self = any> {
    [toPersistent](seen?: WeakSet<object>): SerialisedObject<Serialised, Self>;
}

export interface SerialisedObject<Data = any, Self = any> {
    data: Data,
    [fromPersistent](data: Data): Self;
}

const isCloneable = (obj: any): obj is Cloneable => obj && typeof obj[toPersistent] === 'function';

export function serialise(obj: any, seen: WeakSet<object> = new WeakSet<object>()): any {
    if (seen.has(obj))
        return;

    let clone: any;
    if (isCloneable(obj))
        clone = obj[Symbol.for("serialise") as typeof toPersistent].call(obj, seen);
    else if (typeof obj === 'object' && obj !== null)
        clone = Object.create(Object.getPrototypeOf(obj), Object.entries(obj)
            .reduce((a, [key, value]) => ({
                ...a,
                [key]: {
                    value: serialise(value, seen),
                    writable: true,
                    enumerable: true,
                }
            }), {}));
    else
        clone = obj;

    if (typeof clone === 'object' && clone !== null)
        seen.add(obj);

    return clone;
}

export function deserialise(obj: any): any {
    if (typeof obj == 'object' && obj && fromPersistent in obj)
        return obj[fromPersistent](obj);
    else if (typeof obj === 'object' && obj !== null)
        return Object.create(Object.getPrototypeOf(obj), Object.entries(obj)
            .reduce((a, [key, value]) => ({
                ...a,
                [key]: {
                    value,
                    writable: true,
                    enumerable: true,
                } satisfies PropertyDescriptor
            }), {}));
    else
        return obj;
}

export class GlobalState extends EventTarget {
    #state: State = {
        directory: null,
        observer: null,
        viewport: {
            openEditors: new EditorList(this)
        },
        settings: {
            excludeFiles: [
                /\/\./
            ]
        },
        plugins: [new OpenAsText, new SettingsPlugin, new Build],
        projectSpecific: new Map(),
        commands: {
            registered: {},
            keybindings: {}
        }
    }

    #dbHandle?: idb.IDBPDatabase;

    protected constructor() {
        super();

        this.#restore();
        this.#save = debounce(async () => {
            if (this.#dbHandle)
                await this.#dbHandle.put('state', {
                    directory: this.#state.directory,
                    projectSpecific: this.#state.projectSpecific,
                }, 'app-state');
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

        // this.#state = deserialise(saved ?? this.#state);
        this.#state.directory = saved?.directory ?? null;
        this.#state.projectSpecific = saved?.projectSpecific ?? null;

        await this.#loadPlugins();
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
        this.#emit('state-changed', this.#state);
        // TODO implement state change hooks
    }

    public mutate(mut: (state: State) => void): void {
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

    public openProject(dir: FileSystemDirectoryHandle) {
        this.mutate(state => {
            state.directory = dir;
            if (!state.projectSpecific.has(dir))
                state.projectSpecific.set(dir, {});

            // state.observer = new ChangeNotifier(dir);
        });

        this.#emit('open-project', dir);
    }

    public closeProject() {
        this.mutate(state => {
            state.directory = null;
        });

        this.#emit('close-project');
    }

    public loadPlugin(plugin: Plugin) {
        this.mutate(state => {
            state.plugins.push(plugin);
        });
    }

    public registerCommand(command: Command) {
        this.mutate(state => {
            if (command.id in state.commands.registered)
                console.warn(`Command with id ${command.id} already registered`);

            state.commands.registered[command.id] = command;

            if (!command.shortcut)
                return;

            const shortcuts = Object.keys(state.commands.keybindings)
                .filter(key => state.commands.keybindings[key] == command.id);

            if (shortcuts.length <= 0 && command.shortcut)
                shortcuts.push(command.shortcut);

            mousetrap.bind(shortcuts, e => {
                e.preventDefault()
                command.run(this);
            });
        });

        this.#emit('register-command', command);
    }

    public dispatchCommand(command: Command['id'], payload?: any) {
        if (command in this.#state.commands.registered)
            this.#state.commands.registered[command].run(this, payload);
        else
            console.warn(`Command ${command} not found`);
    }

    #emit<Event extends keyof CustomEventTarget>(event: Event, data?: CustomEventTarget[Event] extends CustomEvent<infer K> ? K : never) {
        this.dispatchEvent(new CustomEvent(String(event), {detail: data}));
    }

    public on<K extends keyof CustomEventTarget>(type: K, callback: (event: CustomEventTarget[K]) => void, options?: AddEventListenerOptions) {
        this.addEventListener(type, callback as EventListener, options);
    }

    async #loadPlugins() {
        await Promise.all(this.#state.plugins.map(plugin => plugin.register(this)));
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

export const state =  new class extends GlobalState {
    constructor() {
        super();
    }
};
export default state;