import React from 'react';
import * as DOM from 'react-dom/client';

import state from './state.js';
import Button from "./widgets/button.js";
import CentreLayout from "./layouts/centre-layout.js";

import '@css/main.css';
import layout from '@css/layout.css?raw'
import FileTree from "./file-tree.js";

export const root = DOM.createRoot(document.querySelector('#root')!);

root.render(<CentreLayout>
    <p>{"Loading..."}</p>
</CentreLayout>);

state.addEventListener('state-loaded', () => root.render(<App />));

export default function App() {
    const [directory, viewport] = state.useMask(state => [state.directory, state.viewport]);
    const [active, setActive] = React.useState(viewport.openEditors[0] ?? null);
    const [sidebar, setSidebar] = React.useState({
        left: false,
        right: false
    });

    if (directory)
        return <section className={"sidebar-layout"}>
            <style scoped>{layout}</style>

            <section className={`sidebar-left ${sidebar.left ? 'visible' : ''}`}>
                <div className={"left-button"}>
                    <Button icon={"\uF363"} onActivate={() => setSidebar({ ...sidebar, left: !sidebar.left })}/>
                </div>

                <FileTree />
            </section>

            <div className={"left-button"}>
                <Button icon={"\uEF3E"} onActivate={() => setSidebar({ ...sidebar, left: !sidebar.left })}/>
            </div>

            <div className="tab-layout-tabs">
                {viewport.openEditors.map(editor =>
                    <div key={`tab-${editor.title}`}
                         className={`tab-layout-tab ${active === editor ? 'active' : ''}`}
                         onClick={() => setActive(editor)}>
                        {editor.title}

                        <Button icon={"\uEB99"} variant={"tertiary"} onActivate={() => state.requestClose(editor)} />
                    </div>)}
            </div>

            <section className="tab-layout">
                <div className="tab-layout-content">
                    {active ? active.render.call(active) : <CentreLayout>
                        {"No tabs open."}
                    </CentreLayout>}
                </div>
            </section>

            <div className={"right-button"}>
                <Button icon={"\uEF3E"} onActivate={() => setSidebar({ ...sidebar, right: !sidebar.right })}/>
            </div>

            <section className={`sidebar-right ${sidebar.right ? 'visible' : ''}`}>
                <div className={"right-button"}>
                    <Button icon={"\uF365"} onActivate={() => setSidebar({ ...sidebar, right: !sidebar.right })}/>
                </div>
            </section>

            <section className={"sidebar-statusbar"}>

            </section>
        </section>
    else
        return <CentreLayout>
            <p>{ "No project is open. Select a directory to begin." }</p>
            <Button icon={"\uED58"}
                    variant={"primary"}
                    onActivate={() => window.showDirectoryPicker()
                        .then(dir => state.pushState({ directory: dir }))}>
                {"Open Project"}
            </Button>
        </CentreLayout>
}