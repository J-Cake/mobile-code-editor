import * as React from 'react';

import Plugin from "../plugin.js";
import {BuildState, Command, GlobalState, state} from "../state.js";
import {Editor} from "../viewport.js";
import Button from "../widgets/button.js";

import style from "@css/build.css?raw";
import ContextMenu from "../widgets/context-menu.js";
import BuildTriggerEditor from "./build-trigger-editor.js";

export default class Build extends Plugin {
    buildStepProviders: Array<BuildStepProvider> = [{
        name: "Script",
        icon: '\ue86f',
        render() {
            return <>{"Script"}</>
        }
    }];

    register(mgr: GlobalState): void {
        mgr.registerCommand({
            display: 'Build',
            id: 'build',
            icon: '\uf10b',
            description: 'Edit build commands, and edit structure',
            shortcut: 'ctrl ctrl',
            run: () => mgr.mutate(state => state.workspace?.state.viewport.openEditors.open(new BuildGUI())),
        })
    }

    registerBuildStepProvider(provider: BuildStepProvider) {
        this.buildStepProviders.push(provider);
    }
}

export class BuildGUI implements Editor {
    beforeClose?(this: Editor): void | Promise<void> {
        throw new Error('Method not implemented.');
    }
    listContextActions(): Command[] {
        return [];
    }
    title = "Build";

    render(): React.ReactNode {
        const providers = state.useMask(state => state.plugins.find(i => i instanceof Build)?.buildStepProviders ?? []);
        const buildState = state.useMask(state => (state.workspace?.state.build) ?? {
            steps: [],
            triggers: [{
                id: 0,
                label: "Default",
                triggers: []
            }],
            groups: []
        });

        const [build, setBuild] = React.useState(buildState);

        const getNextStepID = () => Math.max(...[
            build.groups
                .reduce((a, i) => Math.max(i.id, a), 0),
            build.steps
                .reduce((a, i) => Math.max(i.id, a), 0)
        ]) + 1;

        return <section className={"build-gui"}>
            <style scoped>{style}</style>

            <div className={"build-commands"}>
                {build.triggers.map(trigger => <div className={"build-object"} key={`trigger-${trigger.id}`}>
                    <div className={"type"}>{}</div>
                    <div className={"label"}>{trigger.label}</div>
                    <div className={"button-group actions"}>
                        <Button symbolic variant={"secondary"} icon={"\ue3c9"} onActivate={() => state.mutate(state => state.workspace?.state.viewport.openEditors.open(new BuildTriggerEditor(trigger)))}/>
                        <Button symbolic variant={"danger"} icon={"\ue872"}/>
                    </div>
                </div>)}
            </div>

            <div className={"floating-buttons"}>
                <Button variant={"primary"} icon={"\uf4fd"} onActivate={() => {
                    const options = new ContextMenu();

                    options.addOption({
                        label: "Add Group",
                        icon: "\uf710",
                        action() {
                            setBuild(prev => ({
                                ...build,
                                groups: [...prev.groups, {
                                    label: "New Group",
                                    steps: [],
                                    id: getNextStepID()
                                }]
                            }))
                        }
                    });

                    options.addSeparator();

                    options.addOption({
                        label: "Add Manual Trigger",
                        icon: '\uf7d0',
                        action() {
                            setBuild(prev => ({
                                ...prev,
                                triggers: [...prev.triggers, {
                                    id: prev.triggers.reduce((a, i) => Math.max(a, i.id), 0),
                                    label: "New Manual Trigger",
                                    triggers: []
                                }]
                            }))
                        }
                    });

                    options.addOption({
                        label: "Add File watcher",
                        icon: "\uf3d5",
                        action() {

                        }
                    });

                    options.addOption({
                        label: "Add Event Trigger",
                        icon: "\ue399",
                        action() {

                        }
                    })

                    options.addSeparator();

                    for (const provider of providers)
                        options.addOption({
                            label: provider.name,
                            icon: provider.icon,
                            action() {
                                setBuild(prev => {
                                    const build = { ...prev };

                                    const id = getNextStepID();

                                    build.steps.push({
                                        id,
                                        label: `New ${provider.name} step`,
                                        payload: undefined,
                                        then: []
                                    });

                                    build.triggers.at(-1)?.triggers.push(id);

                                    return build;
                                });
                            }
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
    icon?: string,
    render(): React.ReactNode
}

export interface BuildStep<Payload> {
    id: StepID,
    label: string,
    payload: Payload,
    then: StepID[],
}

export interface Trigger {
    id: TriggerID,
    label: string,
    triggers: StepID[],
}

export interface Group {
    id: StepID,
    label: string,
    steps: StepID[]
}

export type StepID = number;
export type TriggerID = number;