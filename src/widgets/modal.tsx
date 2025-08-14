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
        const el = document.querySelector('#modals')!
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
            minimumDuration: 50,

            onBegin: () => ({
                startedOnFrame: e.target == modal,
                isScrollEvent: false
            }),

            onMove: (_, dy) => modal.style.setProperty('transform', `translateY(${dy}px)`),

            onFinish(state: ProjectManagementModalGestureState) {
                modal.classList.toggle('minimised');
            }
        }));






        // let gesture: ({ start: null } | {
        //     start: number,
        //     scrollSamples: number,
        //     distance: number,
        //     scrollEvents: boolean,
        //     startedOnFrame: boolean
        // }) = {start: null};
        // modal.addEventListener('touchstart', function (this: Modal, e: TouchEvent) {
        //     gesture = {
        //         start: Math.min(window.innerHeight, Math.max(e.changedTouches[0].clientY)),
        //         distance: 0,
        //         scrollSamples: 0,
        //         scrollEvents: false,
        //         startedOnFrame: e.target == modal
        //     };
        // }.bind(this), {passive: true});
        // modal.addEventListener('touchmove', function (this: Modal, e: TouchEvent) {
        //     if (typeof gesture.start == 'number')
        //         gesture.scrollSamples++;
        //
        //     if (typeof gesture.start == 'number' && !gesture.scrollEvents && (gesture.startedOnFrame || gesture.scrollSamples > 3)) {
        //         gesture.distance = e.changedTouches[0].clientY - gesture.start; // Math.min(window.innerHeight, Math.max(e.changedTouches[0].clientY))// - gesture.start;
        //
        //         if (modal.classList.contains('minimised'))
        //             modal.style.setProperty('transform', `translateY(${gesture.distance}px)`);
        //         else
        //             modal.style.setProperty('transform', `translateY(calc(${gesture.distance}px))`);
        //     }
        // }.bind(this), {passive: true});
        // modal.addEventListener('touchend', function (this: Modal, e: TouchEvent) {
        //     if (typeof gesture.start == 'number')
        //         if (gesture.distance > 50)
        //             this.minimise();
        //         else if (gesture.distance < -50)
        //             this.root?.showPopover();
        //
        //     Object.assign(gesture, {start: null});
        //
        //     modal.style.removeProperty('transform');
        // }.bind(this), {passive: true});
        // modal.addEventListener('scroll', function () {
        //     if (typeof gesture.start == 'number')
        //         gesture.scrollEvents = true;
        // })

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