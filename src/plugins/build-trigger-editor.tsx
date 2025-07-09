import * as React from "react";

import {Editor} from "../viewport.js";
import Build, {BuildGUI, BuildStep, Group, Trigger} from "./build.js";
import {BuildState, Command, state} from "../state.js";
import Button from "../widgets/button.js";

import style from "@css/build.css?raw";

export default class BuildTriggerEditor implements Editor {
    get title(): string {
        return `Edit Trigger '${this.trigger.label}'`;
    }

    constructor(readonly trigger: Trigger) {

    }

    beforeClose(): void | Promise<void> {
        return undefined;
    }

    listContextActions(): Command[] {
        return [];
    }

    render(): React.ReactNode {
        const build = state.useMask(state => (state.directory && state.projectSpecific.get(state.directory))?.build);

        if (!build)
            return <h1>{"No project is open."}</h1>;

        return <section className={"build-gui"}>
            <style scoped>{style}</style>

            {/*<h1>{this.trigger.label}</h1>*/}

            <div className={"build-commands"}>
                {build.steps.map(step => <div className={"build-object"}>
                    <div className={"type"}></div>
                    <div className={"label"}>{step.label}</div>
                    <div className={"button-group actions"}>
                        <Button symbolic variant={"secondary"} icon={"\ue3c9"} />
                        <Button symbolic variant={"danger"} icon={"\ue872"} />
                    </div>
                </div>)}
            </div>

            <div className={"floating-buttons"}>
                <Button variant={"primary"} icon={"\uf4fd"} onActivate={() => {}} />
            </div>
        </section>;
    }

}