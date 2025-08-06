import * as React from 'react';

import state from "./state.js";
import If from "./widgets/if.js";

import style from "@css/file-tree.css?raw";
import Button from "./widgets/button.js";
import TextEditor from "./text-editor.js";
import ContextMenu from "./widgets/context-menu.js";
import {File, Directory, DirectoryMetadata, Metadata, Resource, FileMetadata, ResourceUrl} from "./workspace.js";

export const icons = {
    defaultFolder: '\ue2c7',
    defaultFolderOpen: '\ue2c8',
    defaultFile: '\ue66d'
} satisfies Record<string, string>;

export default function FileTree(props: {}) {
    const project = state.useMask(state => state.workspace);

    if (!project)
        return <span>{"Loading..."}</span>;

    return <div className={"file-tree"}>
        <style scoped>{style}</style>

        <div className={"file-tree-contents"}>
            {project.resourceProviders.map(provider => <></>)}
        </div>

        <div className={"button-group force-inline"}>
            <Button icon={"\ue091"}>{"Add File"}</Button>
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
            }} />
        </div>
    </div>;
}

export function Directory(props: { dir: Directory, load?: boolean, depth: number, onContextMenu?: (e: React.MouseEvent) => void }) {
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
                    key={`directory-${props.dir}/${props.dir.name}`}>
        <summary className={"file-tree-directory-entry"}
                 data-icon={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFolder}
                 data-icon-open={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFolderOpen}
                 onContextMenu={e => props.onContextMenu?.(e)}>
            <span className={"ellipsis"}>{props.dir.name}</span>
        </summary>


        {children ? <ul>
            {children.map(entry => {
                if (isDirectory(entry))
                    return <Directory dir={entry.child}
                               depth={props.depth + 1}
                               onContextMenu={e => folderOptions(e, entry)}/>;

                else if (isFile(entry))
                    return <span className={"file-tree-directory-entry"}
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

const isDirectory = (child: { child: Resource, meta: Metadata }): child is { child: Directory, meta: Metadata & DirectoryMetadata } => child.meta.type == 'directory';
const isFile = (child: { child: Resource, meta: Metadata }): child is { child: File, meta: Metadata & FileMetadata } => child.meta.type == 'file';

function fileOptions(e: React.MouseEvent, file: { child: File, meta: Metadata & FileMetadata }) {
    e.preventDefault();
    const menu = new ContextMenu();

    menu.header(file.child.name);

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

    menu.header(folder.child.name);

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
        super('request-open', { cancelable: true });
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