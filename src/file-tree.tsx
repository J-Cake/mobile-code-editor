import * as React from 'react';

import state from "./state.js";

import style from "@css/file-tree.css?raw";
import Button from "./widgets/button.js";
import ContextMenu from "./widgets/context-menu.js";
import {
    File,
    Directory,
    DirectoryMetadata,
    Metadata,
    Resource,
    FileMetadata,
    ResourceUrl,
    ResourceProvider,
    isDirectory as asyncIsDirectory
} from "./workspace.js";
import Modal from "./widgets/modal.js";

export const icons = {
    defaultFolder: '\ue2c7',
    defaultFolderOpen: '\ue2c8',
    defaultFile: '\ue66d'
} satisfies Record<string, string>;

export default function FileTree() {
    const project = state.useMask(state => state.workspace);

    if (!project)
        return <span>{"Loading..."}</span>;

    return <div className={"file-tree"}>
        <style scoped>{style}</style>

        <input type={"search"} className={"widget text-edit"} placeholder={"Search for a file"}/>

        <div className={"file-tree-contents"}>
            {project.resourceProviders.map(provider => <Provider key={`provider-${provider.id}`} provider={provider}/>)}
        </div>

        <div className={"button-group force-inline"}>
            <Button icon={"\ue091"} onActivate={() => createFile()}>{"Add File"}</Button>
            <Button symbolic icon={"\ue5d4"} onActivate={() => {
                new ContextMenu()
                    .header("Project Settings")
                    .addOption({
                        label: "New Directory",
                        icon: '\ue2cc',
                        action() {

                        }
                    })
                    .addOption({
                        label: "Close workspace",
                        icon: '\ueb83',
                        action() {
                            // TODO: Close workspace
                        }
                    })
                    .show();
            }}/>
        </div>
    </div>;
}

export function createFile() {
    new Modal()
        .show(<form>

        </form>);
}

export function Provider(props: { provider: ResourceProvider }) {
    const [children, setChildren] = React.useState(null as null | { child: Resource, meta: Metadata }[]);

    React.useEffect(() => void props.provider.get([])
        .then(async res => {
            if (await asyncIsDirectory(res))
                return await (res as Directory).listChildren()

            else
                return [res];
        })
        .then(children => Promise.all(children.map(async child => ({
            child,
            meta: await child.metadata()
        }))))
        .then(children => setChildren(children)), []);

    return <details className={"file-tree-provider file-tree-directory"}
                    style={{"--depth": 0} as React.CSSProperties}
                    key={`provider-${props.provider.id}`}>
        <summary className={"file-tree-directory-entry"}
                 data-icon={props.provider.type().icon}
                 data-icon-open={props.provider.type().icon}
                 onContextMenu={e => providerOptions(e, props.provider)}>
            <span className={"ellipsis"}>{props.provider.type().name}</span>
        </summary>

        {children ? <ul>
            {children.map(entry => {
                if (isDirectory(entry))
                    return <DirectoryEntry dir={entry.child}
                                           key={entry.child.url().toString()}
                                           depth={1}
                                           onContextMenu={e => folderOptions(e, entry)}/>;

                else if (isFile(entry))
                    return <span className={"file-tree-directory-entry"}
                                 key={entry.child.url().toString()}
                                 data-icon={icons[entry.child.url().ext() as keyof typeof icons] ?? icons.defaultFile}
                                 tabIndex={0}
                                 onContextMenu={e => fileOptions(e, entry)}
                                 onClick={() => requestOpen(entry.child)}>
                                <span className={"ellipsis"}>{entry.child.name}</span>
                    </span>;
            })}
        </ul> : <span>{"Loading ..."}</span>}
    </details>;
}

export function DirectoryEntry(props: {
    dir: Directory,
    load?: boolean,
    depth: number,
    onContextMenu?: (e: React.MouseEvent) => void
}) {
    const [children, setChildren] = React.useState(null as null | { child: Resource, meta: Metadata }[]);

    return <details className={"file-tree-directory"}
                    style={{'--depth': props.depth} as React.CSSProperties}
                    onToggle={e => e.currentTarget.open && props.dir
                        .listChildren()
                        .then(children => Promise.all(children.map(async child => ({
                            child,
                            meta: await child.metadata()
                        }))))
                        .then(children => setChildren(children))}
                    key={props.dir.url().toString()}>
        <summary className={"file-tree-directory-entry"}
                 data-icon={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFolder}
                 data-icon-open={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFolderOpen}
                 onContextMenu={e => props.onContextMenu?.(e)}>
            <span className={"ellipsis"}>{props.dir.name}</span>
        </summary>


        {children ? <ul>
            {children.map(entry => {
                if (isDirectory(entry))
                    return <DirectoryEntry dir={entry.child}
                                           depth={props.depth + 1}
                                           key={entry.child.url().toString()}
                                           onContextMenu={e => folderOptions(e, entry)}/>;

                else if (isFile(entry))
                    return <span className={"file-tree-directory-entry"}
                                 key={entry.child.url().toString()}
                                 data-icon={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFile}
                                 tabIndex={0}
                                 onContextMenu={e => fileOptions(e, entry)}
                                 onClick={() => requestOpen(entry.child)}>
                                <span className={"ellipsis"}>{entry.child.name}</span>
                    </span>;
            })}
        </ul> : <span>{"Loading ..."}</span>}
    </details>
}

const isDirectory = (child: { child: Resource, meta: Metadata }): child is {
    child: Directory,
    meta: Metadata & DirectoryMetadata
} => child.meta.type == 'directory';
const isFile = (child: { child: Resource, meta: Metadata }): child is {
    child: File,
    meta: Metadata & FileMetadata
} => child.meta.type == 'file';

function fileOptions(e: React.MouseEvent, file: { child: File, meta: Metadata & FileMetadata }) {
    e.preventDefault();
    const menu = new ContextMenu();

    menu.header(file.child.url().toString());

    menu.addOption({
        label: 'Rename file',
        icon: '\ue3c9',
        action() {

        }
    });

    menu.addOption({
        label: 'Delete file',
        icon: '\ue872',
        action() {

        }
    })

    menu.show();
}

function folderOptions(e: React.MouseEvent, folder: { child: Directory, meta: Metadata & DirectoryMetadata }) {
    e.preventDefault();
    const menu = new ContextMenu();

    menu.header(folder.child.url().toString());

    menu.addOption({
        label: "Create file",
        icon: '\ue89c',
        action() {
            prompt("Create file", "File name", { heading: "Create file", p: "Enter the name for the file." })
                .then(file => folder.child
                    .create(file))
                .then(file => requestOpen(file));
        }
    });

    menu.addOption({
        label: "Create folder",
        icon: '\ue2cc',
        action() {
            prompt("Create folder", "Folder name", { heading: "Create folder", p: "Enter the name for the folder." })
                .then(file => folder.child
                    .createDir(file));
        }
    });

    menu.addSeparator();

    menu.addOption({
        label: 'Fixate directory',
        icon: '\uf2f2',
        action() {

        }
    });

    menu.addOption({
        label: 'Rename directory',
        icon: '\ue3c9',
        action() {
            prompt("Rename directory", "Folder name", {
                heading: "Rename directory",
                p: "Enter the new name for the directory."
            }, false)
                .then(file => folder.child.name = file);
        }
    });

    menu.addOption({
        label: 'Delete directory',
        icon: '\ue872',
        action() {

        }
    })

    menu.show();
}

function providerOptions(e: React.MouseEvent, provider: ResourceProvider) {
    e.preventDefault();
    const menu = new ContextMenu();

    menu.header(provider.type().name);

    menu.addOption({
        label: "Create file",
        icon: '\ue89c',
        action() {
            prompt("Create file", "File name", { heading: "Create file", p: "Enter the name for the file." })
                .then(file => provider
                    .create(ResourceUrl.fromParts(provider.id, []).append(file).components.path))
                .then(file => requestOpen(file));
        }
    });

    menu.addOption({
        label: "Create folder",
        icon: '\ue2cc',
        action() {
            prompt("Create folder", "Folder name", { heading: "Create folder", p: "Enter the name for the folder." })
                .then(file => provider
                    .createDir(ResourceUrl.fromParts(provider.id, []).append(file).components.path));
        }
    });

    menu.addSeparator();

    menu.addOption({
        label: "Remove provider from workspace",
        icon: '\uf4e4',
        action() {

        }
    });

    menu.show();
}

export function prompt(label: string, placeholder: string, text: { heading?: string, p?: string } = {}, allowSeparator = true): Promise<string> {
    const modal = new Modal();
    return new Promise<string>(ok => modal
        .show(<form className={""}
            onSubmit={e => {
            e.preventDefault();
            const name = e.currentTarget.elements.namedItem("name");
            setTimeout(() => modal.close());
            if (name instanceof HTMLInputElement)
                return ok(name.value);
        }}>
            <div className={"header"}>
                <h1>{text?.heading}</h1>
                <p>{text?.p}</p>
            </div>
            <div className={"content"}>
                <label>
                    <span className={"widget-label"}>{placeholder}</span>
                    <input name={"name"}
                           className={"widget text-edit stretch"}
                           placeholder={placeholder}
                           type={"text"}
                           inputMode={"none"}
                           pattern={allowSeparator ? '.*' : '[^/]*'} />
                </label>
            </div>
            <div className={"button-group force-inline actions"}>
                <Button variant={"primary"} icon={"\ue5ca"}>
                    {label}
                </Button>
            </div>
        </form>));
}

export function requestOpen(entry: File) {
    const requestOpenEvent = new RequestOpenEvent(entry);

    if (state.dispatchEvent(requestOpenEvent))
        console.warn(`File of type ${entry.url().ext()} cannot be opened.`);

    // const editor = new TextEditor(entry);
    //
    // this.mutateState(state => {
    //     state.viewport.openEditors[this.nextEditorId] = editor;
    // });
    //
    // this.#emit('request-open', editor);
    // this.#emit('edit-list-changed', Object.values(this.#state.viewport.openEditors));
}

export class RequestOpenEvent extends Event {
    constructor(public file: File) {
        super('request-open', {cancelable: true});
    }
}

export function useDerivedState<T>(initialValue: T, derive: (value: T) => T): [T, (newValue: T) => void, T] {
    const [value, setValue] = React.useState<T>(initialValue);
    const [derivedValue, setDerivedValue] = React.useState<T>(derive(initialValue));

    React.useEffect(() => {
        setDerivedValue(derive(value));
    }, [value, derive]);

    return [value, setValue, derivedValue];
}