import * as React from 'react';

import { GlobalState } from "../state.js";
import Plugin from "../plugin.js";
import {Editor} from "../viewport.js";

export class SettingsPlugin extends Plugin {
    register(state: GlobalState): void {
        state.registerCommand({
            display: 'Open Settings',
            id: 'settings',
            icon: '\uF0E4',
            description: 'Open the settings window',
            shortcut: 'ctrl+alt+s',

            run: mgr => mgr.mutate(state => state.viewport.openEditors.open(new SettingsEditor())),
        });
    }
}

export class SettingsEditor implements Editor {
    title = "Settings";

    render(): React.ReactNode {
        return <div>Settings</div>;
    }
}