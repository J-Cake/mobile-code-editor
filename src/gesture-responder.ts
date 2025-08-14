import {CustomEventTarget, state} from "./state.js";

export default class GestureResponder extends EventTarget {
    gestures: RunningGesture<object>[] = [];

    constructor() {
        super();

        document.addEventListener('touchmove', e => this.#update(e));
        document.addEventListener('touchend', e => {
            const gesture = this.gestures.shift();
            if (!gesture || gesture.samples < gesture.gesture.minimumDuration) return;

            const event = gesture.gesture.onFinish(gesture.state);

            if (event)
            state.dispatchCommand(event.event, event.payload);
        });
    }

    #update(e: TouchEvent) {
        if (this.gestures[0]) {
            Object.assign(this.gestures[0], {
                distanceX: this.gestures[0].distanceX + (e.touches[0].clientX - this.gestures[0].prevX),
                distanceY: this.gestures[0].distanceY + (e.touches[0].clientY - this.gestures[0].prevY),

                samples: (this.gestures[0].samples ?? 0) + 1,

                prevX: e.touches[0].clientX,
                prevY: e.touches[0].clientY,
            } as Partial<RunningGesture<any>>);

            Object.assign(this.gestures[0].state, this.gestures[0].gesture.onMove(this.gestures[0].distanceX, this.gestures[0].distanceY));
        }
    }

    beginGesture(e: TouchEvent, gesture: Gesture<object>) {
        if (e.touches?.[0])
            this.gestures.push({
                distanceX: 0,
                distanceY: 0,

                samples: 0,

                prevX: e.touches[0].clientX,
                prevY: e.touches[0].clientY,

                gesture,

                state: {}
            });
    }
}

export interface Gesture<State extends object> {
    distanceX?: number;
    distanceY?: number;

    minimumDuration: number;

    onBegin(): void | State,
    onMove(x: number, y: number): void | State;
    onFinish(state: State): void | EmitEvent;

}

export interface RunningGesture<State extends object> {
    distanceX: number;
    distanceY: number;

    prevX: number;
    prevY: number;

    samples: number;

    state: State;

    gesture: Gesture<State>
}

export interface EmitEvent<Cmd extends keyof CustomEventTarget = keyof CustomEventTarget> {
    event: Cmd,
    payload: CustomEventTarget[Cmd]
}