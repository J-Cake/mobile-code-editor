import * as React from 'react';

import state from "./state.js";
import If from "./widgets/if.js";

import style from "@css/file-tree.css?raw";

export default function FileTree(props: {}) {
    const project = state.useMask(state => state.directory);

    return <>
        <style scoped>{style}</style>
        {project ? <Directory parent={'/'} dir={project} load /> : <span>{"Loading..."}</span> }
    </>;
}

export function Directory(props: { parent: string, dir: FileSystemDirectoryHandle, load?: boolean }) {
    const [contents, setContents] = React.useState<null | Array<FileSystemDirectoryHandle | FileSystemFileHandle>>(null);
    
    const load = () => {
        if (!contents)
            Array.fromAsync(props.dir.values())
                .then(entries => setContents(entries.toSorted((a, b) => {
                    if (a instanceof FileSystemDirectoryHandle && b instanceof FileSystemDirectoryHandle || a instanceof FileSystemFileHandle && b instanceof FileSystemFileHandle)
                        return a.name < b.name ? -1 : 1;

                    else
                        return a instanceof FileSystemDirectoryHandle ? -1 : 1;
                })));
    };

    if (props.load)
        load();

    return <details onToggle={e => e.currentTarget.open ? load() : setContents(null)} key={`directory-${props.dir}/${props.dir.name}`}>
        <summary>{props.dir.name}</summary>

        <ul>
            <If condition={!!contents}>{{
                true: () => contents!.map(entry => <li key={entry.name}>
                    {entry instanceof FileSystemDirectoryHandle ? <Directory parent={`${props.parent}/${props.dir.name}`} dir={entry} /> : entry.name}
                </li>),
                false: () => <span>{"Loading..."}</span>
            }}</If>
        </ul>
    </details>
}