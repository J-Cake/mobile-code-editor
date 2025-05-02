import * as  React from "react";

import state from "./state.js";
import Button from "./widgets/button.js";
import CentreLayout from "./layouts/centre-layout.js";

export default function() {
    const editors = state.useMask(state => state.viewport.openEditors);
    const [active, setActive] = React.useState(editors[0] ?? null);

    state.on('request-open', e => setActive(e.detail));
    state.on('edit-list-changed', () => {
        if (!Object.values(editors).some(editor => editor === active))
            setActive(editors[0] ?? null);
    });

    let Body = () => active?.render?.call(active) ?? <CentreLayout>
        {"No tabs open."}
    </CentreLayout>;

    return <>
        <div className="tab-layout-tabs">
            {Object.entries(editors).map(([id, editor]) =>
                <div key={`tab-${id}`}
                     className={`tab-layout-tab ${active === editor ? 'active' : ''}`}
                     onClick={() => setActive(editor)}>
                    {editor.title}

                    <Button icon={"\uEB99"} variant={"tertiary"} onActivate={() => state.requestClose(editor)}/>
                </div>)}
        </div>

        <section className="tab-layout">
            <div className="tab-layout-content">
                <Body />
            </div>
        </section>
    </>
}