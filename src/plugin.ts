import {GlobalState} from "./state.js";

export default abstract class Plugin {
    abstract register(state: GlobalState): void | Promise<void>;
    unregister(state: GlobalState): void | Promise<void> {};
}