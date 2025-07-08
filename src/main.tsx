import React from 'react';
import * as DOM from 'react-dom/client';

import mgr, {GlobalState, State} from './state.js';
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
    getStateManager(): GlobalState,
    actionMenu: ContextMenu
}

declare var window: NewWindow & typeof globalThis;

class ActionMenu extends ContextMenu {
    constructor() {
        super();

        mgr.mutate(state => {
            for (const cmd in state.commands.registered)
                this.addOption({ command: cmd });
        });

        this.header('All commands');
        super.show();
        this.minimise();
    }

    containerFactory(): HTMLDialogElement {
        const container = super.containerFactory();
        container.classList.add('minimised');
        return container;
    }

    show() {
        this.root?.showPopover();
    }

    close() {
        this.minimise();
    }
}

mgr.on('state-loaded', ({ detail: state }) => {
    window.getStateManager = () => mgr;

    window.actionMenu = new ActionMenu();

    mgr.registerCommand({
        display: 'Display all commands',
        id: 'command-bar',
        icon: '\uF1F8',
        shortcut: 'ctrl+p',
        run(mgr) {
            window.actionMenu.show();
        },
    });

    root.render(<App/>);
});

export default function App() {
    const directory = mgr.useMask(state => state.directory);

    if (directory)
        return <>
            <Viewport/>

            <section className={"sidebar-statusbar"}>

            </section>
        </>
    else
        return <CentreLayout>
            <p>{"No project is open. Select a directory to begin."}</p>
            <Button icon="&#xe2c8;"
                    variant={"primary"}
                    onActivate={() => window.showDirectoryPicker()
                        .then(dir => mgr.openProject(dir))}>
                {"Open Project"}
            </Button>
        </CentreLayout>;
}