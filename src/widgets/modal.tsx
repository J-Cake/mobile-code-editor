import * as React from 'react';
import * as dom from 'react-dom/client';

import style from "@css/popup.css?raw";
import {ReactNode} from "react";

export default class Modal extends EventTarget {
    renderer?: dom.Root;
    root?: HTMLDialogElement;
    minimised: boolean = false;

    #header?: ReactNode;

    containerFactory(): HTMLDialogElement {
        return document.querySelector('#modals')!
            .appendChild(document.createElement('dialog'));
    }

    public show(children: React.ReactNode) {
        const modal = this.root = this.containerFactory();

        this.on('minimise', ({detail: isMinimised}: CustomEvent<boolean>) => {
            if (isMinimised)
                modal.classList.add('minimised');
            else
                modal.classList.remove('minimised');
        });

        modal.classList.add('modal');

        modal.addEventListener('click', e => {
            if (e.target == modal)
                this.close();
        })

        this.renderer = dom.createRoot(modal);

        this.renderer.render(<>
            <style scoped>{style}</style>

            {this.#header && <h1 className={"header"}>{this.#header}</h1>}

            {children}
        </>);

        modal.showModal();
    }

    on(event: 'minimise', callback: (this: Modal, e: CustomEvent<boolean>) => void, options?: AddEventListenerOptions): void {
        this.addEventListener(event, callback as any, options);
    }

    header(header: React.ReactNode): this {
        this.#header = header;
        return this;
    }

    minimise() {
        this.dispatchEvent(new CustomEvent('minimise', {detail: this.minimised = true}));
    }

    close() {
        this.root?.animate([
            { transform: 'translateY(0)' },
        ], {
            duration: 100,
            iterations: 1,
            fill: 'forwards'
        }).addEventListener('finish', () => {
            this.root?.close();
            this.root?.remove()
            this.renderer?.unmount();
            this.dispatchEvent(new Event('close'));
        })
    }
}