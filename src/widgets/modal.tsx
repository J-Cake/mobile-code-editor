import * as React from 'react';
import * as dom from 'react-dom/client';

import style from "@css/popup.css?raw";
import state from "../state.js";
import { OpenEvent } from '../viewport.js';
import {Gesture} from "../gesture-responder.js";

export default class Modal extends EventTarget {
    renderer?: dom.Root;
    root?: HTMLDialogElement;

    #header?: React.ReactNode;

    containerFactory(): HTMLDialogElement {
        const el = document.querySelector("#modals")!
            .appendChild(document.createElement('dialog'));

        el.setAttribute('popover', 'auto');

        // if (this.minimised)
        //     el.classList.add('minimised');

        return el;
    }

    public show(children: React.ReactNode) {
        const modal = this.root = this.containerFactory();

        this.on('minimise', ({detail: isMinimised}: CustomEvent<boolean>) => {
            if (isMinimised) {
                modal.classList.add('minimised');
                modal.hidePopover();
            } else {
                modal.classList.remove('minimised');
                modal.showPopover();
            }
        });

        modal.classList.add('modal');

        modal.addEventListener('toggle', e => {
            if (e instanceof ToggleEvent && e.newState == 'closed')
                this.close();
            else if (e instanceof ToggleEvent && e.newState == 'open') {
                modal.classList.remove('minimised');
                this.dispatchEvent(new CustomEvent('reveal'));
            }
        });

        modal.addEventListener('touchstart', e => state.beginGesture<ProjectManagementModalGestureState>(e, {
            minimumDuration: 3,

            minYDistance: 0.15,

            onBegin: () => ({
                startedOnFrame: e.target == modal,
                isScrollEvent: false
            }),

            onMove: (_, dy) => modal.style.setProperty('transform', `translateY(${
                modal.classList.contains('minimised') ? Math.min(0, dy) : Math.max(0, dy)
            }px)`),

            onFinish: (state: ProjectManagementModalGestureState) => this.close(),
            onFail: () => modal.style.removeProperty('transform'),
        }));

        this.renderer = dom.createRoot(modal);

        this.renderer.render(<>
            <span className={"handle"}></span>

            <style scoped>{style}</style>

            {this.#header && <h1 className={"header"}>{this.#header}</h1>}

            <div className={"modal-content"}>
                {children}
            </div>
        </>);

        modal.showPopover();
    }

    on(event: 'minimise', callback: (this: Modal, e: CustomEvent<boolean>) => void, options?: AddEventListenerOptions): void {
        this.addEventListener(event, callback as any, options);
    }

    header(header: React.ReactNode): this {
        this.#header = header;
        return this;
    }

    minimise() {
        this.dispatchEvent(new CustomEvent('minimise', {detail: true}));
    }

    close() {
        this.root?.animate([
            {transform: 'translateY(0)'},
        ], {
            duration: 100,
            iterations: 1,
            fill: 'forwards'
        }).addEventListener('finish', () => {
            this.root?.close();
            this.root?.remove()
            this.renderer?.unmount();
            this.dispatchEvent(new Event('close'));
        });
    }
}

export interface ProjectManagementModalGestureState {
    startedOnFrame: boolean,
    isScrollEvent: boolean
}