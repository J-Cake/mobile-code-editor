import React from 'react';
import * as DOM from 'react-dom/client';

import state from './state.js';
import Button from "./widgets/button.js";
import CentreLayout from "./layouts/centre-layout.js";

import FileTree from "./file-tree.js";
import Viewport from './viewport.js';

import '@css/main.css';

export const root = DOM.createRoot(document.querySelector('#root')!);

root.render(<CentreLayout>
    <p>{"Loading..."}</p>
</CentreLayout>);

state.on('state-loaded', () => root.render(<App/>));

export default function App() {
    const directory = state.useMask(state => state.directory);
    const [sidebar, setSidebar] = React.useState({
        left: false,
        right: false
    });

    if (directory)
        return <>
            <LeftSidebar/>

            <Viewport/>

            <RightSidebar />

            <section className={"sidebar-statusbar"}>

            </section>
        </>
    else
        return <CentreLayout>
            <p>{"No project is open. Select a directory to begin."}</p>
            <Button icon={"\uED58"}
                    variant={"primary"}
                    onActivate={() => window.showDirectoryPicker()
                        .then(dir => state.pushState({directory: dir}))}>
                {"Open Project"}
            </Button>
        </CentreLayout>
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