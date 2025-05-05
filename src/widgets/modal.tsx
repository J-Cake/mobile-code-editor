import * as React from 'react';
import * as dom from 'react-dom/client';

import style from "@css/popup.css?raw";

export default class Modal extends EventTarget {
    renderer?: dom.Root;
    root?: HTMLDialogElement;

    public show(children: React.ReactNode) {
        const modal = this.root = document.querySelector('#modals')!
            .appendChild(document.createElement('dialog'));

        modal.classList.add('modal');

        modal.addEventListener('click', e => {
            if (e.target == modal)
                this.close();
        })

        this.renderer = dom.createRoot(modal);

        this.renderer.render(<>
            <style scoped>{style}</style>
            {children}
        </>);

        modal.showModal();
    }

    close() {
        this.root?.close();
        this.root?.remove()
        this.renderer?.unmount();
        this.dispatchEvent(new Event('close'));
    }
}