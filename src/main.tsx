import React from 'react';
import * as DOM from 'react-dom/client';

import state, {GlobalState, State} from './state.js';
import Button from "./widgets/button.js";
import CentreLayout from "./layouts/centre-layout.js";

import FileTree from "./file-tree.js";
import Viewport from './viewport.js';

import '@css/main.css';
import Modal from './widgets/modal.js';
import ContextMenu from "./widgets/context-menu.js";

export const root = DOM.createRoot(document.querySelector('#root')!);

root.render(<CentreLayout>
    <p>{"Loading..."}</p>
</CentreLayout>);

interface NewWindow {
    getStateManager(): GlobalState
}

declare var window: NewWindow & typeof globalThis;

state.on('state-loaded', () => {
    window.getStateManager = () => state;

    state.registerCommand({
        display: 'Display all commands',
        id: 'command-bar',
        icon: '\uF1F8',
        shortcut: 'ctrl+p',
        run(mgr) {
            mgr.mutate(state => Object.keys(state.commands.registered)
                .reduce((a, i) => a.addOption({ command: i }), new ContextMenu())
                .header('All commands')
                .show());
        },
    });

    state.dispatchCommand('command-bar');

    root.render(<App/>);
});

export default function App() {
    const directory = state.useMask(state => state.directory);

    if (directory)
        return <>
            <Viewport/>

            <section className={"sidebar-statusbar"}>

            </section>
        </>
    else
        return <CentreLayout>
            <p>{"No project is open. Select a directory to begin."}</p>
            <Button icon={"\uED58"}
                    variant={"primary"}
                    onActivate={() => window.showDirectoryPicker()
                        .then(dir => state.openProject(dir))}>
                {"Open Project"}
            </Button>
        </CentreLayout>;
}

export function LeftSidebar() {
    const [sidebar, setSidebar] = React.useState(false);

    state.on('edit-list-changed', () => setSidebar(false));

    return <>
        <section className={`sidebar-left ${sidebar ? 'visible' : ''}`}>
            <div className={"left-button"}>
                <Button icon={"\uF363"} onActivate={() => setSidebar(!sidebar)}/>
            </div>

            <FileTree/>
        </section>

        <div className={"left-button"}>
            <Button icon={"\uEF3E"} onActivate={() => setSidebar(!sidebar)}/>
        </div>
    </>;
}

export function RightSidebar() {
    const [sidebar, setSidebar] = React.useState(false);

    return <>
        <div className={"right-button"}>
            <Button icon={"\uEF3E"} onActivate={() => setSidebar(!sidebar)}/>
        </div>

        <section className={`sidebar-right ${sidebar ? 'visible' : ''}`}>
            <div className={"right-button"}>
                <Button icon={"\uF365"} onActivate={() => setSidebar(!sidebar)}/>
            </div>
        </section>
    </>
}