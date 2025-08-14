import React from 'react';
import * as DOM from 'react-dom/client';

import mgr, {Command, GlobalState} from './state.js';
import Button from "./widgets/button.js";
import CentreLayout from "./layouts/centre-layout.js";
import Viewport from './viewport.js';

import '@css/main.css';
import ContextMenu, {MenuOption} from "./widgets/context-menu.js";
import {ListBox} from "./widgets/list-box.js";
import Drawer from "./widgets/drawer.js";

export const root = DOM.createRoot(document.querySelector('#root')!);

root.render(<CentreLayout>
    <p>{"Loading..."}</p>
</CentreLayout>);

interface NewWindow {
    getStateManager(): GlobalState,
    actionMenu: Drawer
}

declare var window: NewWindow & typeof globalThis;

class ActionMenu extends Drawer {

    cx: ContextMenu;

    constructor() {
        super();

        this.cx = new ContextMenu();

        mgr.mutate(state => {
            for (const cmd in state.commands.registered)
                this.cx.addOption({ command: cmd });
        });

        this.header('All commands');
        this.show();
        this.minimise();
    }

    containerFactory(): HTMLDialogElement {
        const container = super.containerFactory();
        container.classList.add('minimised');
        return container;
    }

    show() {
        super.show(this.cx.content());
    }

    close() {
        this.minimise();
    }
}

mgr.on('state-loaded', () => {
    window.getStateManager = () => mgr;

    window.actionMenu = new ActionMenu();

    mgr.registerCommand({
        display: 'Display all commands',
        id: 'command-bar',
        icon: '\uF1F8',
        shortcut: 'ctrl+p',
        run() {
            window.actionMenu.maximise();
        },
    });

    root.render(<App/>);
});

export default function App() {
    const state = mgr.useMask(state => state);

    if (state.workspace)
        return <>
            <Viewport/>

            <section className={"sidebar-statusbar"}>

            </section>
        </>
    else
        return <CentreLayout>
            <p>{"No workspace is open."}</p>
            <Button icon="&#xe2c8;"
                    variant={"primary"}
                    onActivate={() => mgr.createAndActivateWorkspace()}>
                {"Create workspace"}
            </Button>

            <ListBox>
                {state.availableWorkspaces.map(workspace => <Button variant="tertiary">
                    {workspace.label}
                </Button>)}
            </ListBox>
        </CentreLayout>;
}