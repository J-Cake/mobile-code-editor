import * as React from 'react';

import state from "./state.js";
import If from "./widgets/if.js";

import style from "@css/file-tree.css?raw";
import Button from "./widgets/button.js";
import TextEditor from "./text-editor.js";
import ContextMenu from "./widgets/context-menu.js";

export const icons = {
    defaultFolder: '\ue2c7',
    defaultFolderOpen: '\ue2c8',
    defaultFile: '\ue66d'
} satisfies Record<string, string>;

export default function FileTree(props: {}) {
    const project = state.useMask(state => state.directory);

    return <div className={"file-tree"}>
        <style scoped>{style}</style>

        <div className={"file-tree-contents"}>
            {project ? <Directory parent={'/'} dir={project} load depth={0}/> : <span>{"Loading..."}</span>}
        </div>

        <div className={"button-group force-inline"}>
            <Button icon={"\ue091"}>{"Add File"}</Button>
            <Button symbolic icon={"\ue5d4"} />
        </div>
    </div>;
}

export function Directory(props: { parent: string, dir: FileSystemDirectoryHandle, load?: boolean, depth: number, onContextMenu?: (e: React.MouseEvent) => void }) {
    const [contents, setContents] = React.useState<null | Array<FileSystemDirectoryHandle | FileSystemFileHandle>>(null);
    const exclude = state.useMask(state => state.settings.excludeFiles);

    const load = async () => {
        if (!contents) {
            const entries: Array<FileSystemDirectoryHandle | FileSystemFileHandle> = [];

            for await (const entry of props.dir.values()) {
                const path = `${props.dir}/${entry.name}`;

                if (exclude.some(ex => ex instanceof RegExp ? ex.test(path) : (ex === path || ex == entry.name)))
                    continue;

                else entries.push(entry);
            }

            setContents(entries.toSorted((a, b) => {
                if (a instanceof FileSystemDirectoryHandle && b instanceof FileSystemDirectoryHandle || a instanceof FileSystemFileHandle && b instanceof FileSystemFileHandle)
                    return a.name < b.name ? -1 : 1;

                else
                    return a instanceof FileSystemDirectoryHandle ? -1 : 1;
            }));
        }
    };

    if (props.load)
        load();

    return <details className={"file-tree-directory"}
                    style={{'--depth': props.depth} as React.CSSProperties}
                    onToggle={e => e.currentTarget.open && load()}
                    key={`directory-${props.dir}/${props.dir.name}`}>
        <summary className={"file-tree-directory-entry"}
                 data-icon={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFolder}
                 data-icon-open={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFolderOpen}
                 onContextMenu={e => props.onContextMenu?.(e)}>
            <span className={"ellipsis"}>{props.dir.name}</span>
        </summary>

        <ul>
            <If condition={!!contents}>{{
                true: () => contents!.map(entry => <li key={entry.name}>
                    {entry instanceof FileSystemDirectoryHandle ?
                        <Directory parent={`${props.parent}/${props.dir.name}`}
                                   dir={entry}
                                   depth={props.depth + 1}
                                   onContextMenu={e => folderOptions(e, entry as FileSystemDirectoryHandle)}/> :
                        <span className={"file-tree-directory-entry"}
                              data-icon={icons[props.dir.name.split('.').pop()!.toLowerCase() as keyof typeof icons] ?? icons.defaultFile}
                              tabIndex={0}
                              onContextMenu={e => fileOptions(e, entry as FileSystemFileHandle)}
                              onClick={() => requestOpen(entry)}>
                            <span className={"ellipsis"}>{entry.name}</span>
                        </span>}
                </li>),
                false: () => <span>{"Loading..."}</span>
            }}</If>
        </ul>
    </details>
}

function fileOptions(e: React.MouseEvent, file: FileSystemFileHandle) {
    e.preventDefault();
    const menu = new ContextMenu();

    menu.header(file.name);

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
function folderOptions(e: React.MouseEvent, folder: FileSystemDirectoryHandle) {
    e.preventDefault();
    const menu = new ContextMenu();

    menu.header(folder.name);

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

export function requestOpen(entry: FileSystemFileHandle) {
    const requestOpenEvent = new RequestOpenEvent(entry);

    if (state.dispatchEvent(requestOpenEvent))
        console.warn(`File of type ${entry.name.split('.').pop()!.toLowerCase()} cannot be opened.`);

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
    constructor(public file: FileSystemFileHandle) {
        super('request-open', { cancelable: true });
    }
}
