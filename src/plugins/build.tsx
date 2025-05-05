import * as React from 'react';

import Plugin from "../plugin.js";
import {GlobalState, state} from "../state.js";
import {Editor} from "../viewport.js";
import Button from "../widgets/button.js";

import style from "@css/build.css?raw";
import ContextMenu from "../widgets/context-menu.js";

export default class Build extends Plugin {
    buildStepProviders: Array<BuildStepProvider> = [{
        name: "Script",
        render() {
            return <>{"Script"}</>
        }
    }];

    register(mgr: GlobalState): void {
        mgr.registerCommand({
            display: 'Build',
            id: 'build',
            icon: '\uF21A',
            description: 'Edit build commands, and edit structure',
            shortcut: 'ctrl ctrl',
            run: () => mgr.mutate(state => state.viewport.openEditors.open(new BuildGUI())),
        })
    }

    registerBuildStepProvider(provider: BuildStepProvider) {
        this.buildStepProviders.push(provider);
    }
}

export class BuildGUI implements Editor {
    title = "Build";

    render(): React.ReactNode {
        const providers = state.useMask(state => state.plugins.find(i => i instanceof Build)?.buildStepProviders ?? []);

        return <section className={"build-gui"}>
            <style scoped>{style}</style>

            <h1>{ "Build" }</h1>

            <div className={"build-commands"}>

            </div>

            <div className={"floating-buttons"}>
                <Button variant={"primary"} icon={"\uEA13"} onActivate={() => {
                    const options = new ContextMenu();

                    for (const provider of providers)
                        options.addOption({
                            label: provider.name,
                            icon: provider.name,
                            action: () => console.log(provider.name)
                        })

                    options
                        .header("Add build step")
                        .show();
                }} />
            </div>
        </section>;
    }
}

export interface BuildStepProvider {
    name: string,
    render(): React.ReactNode
}