import * as React from 'react';
import * as dom from 'react-dom/client';

import style from "@css/popup.css?raw";

export default class Modal {
    public show(children: React.ReactNode) {
        const modal = document.querySelector('#modals')!
            .appendChild(document.createElement('dialog'));

        modal.classList.add('modal');

        dom.createRoot(modal)
            .render(<>
                <style scoped>{style}</style>
                {children}
            </>);

        modal.showModal();
    }
}