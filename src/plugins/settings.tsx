import * as React from 'react';

import { Command, GlobalState} from "../state.js";
import Plugin from "../plugin.js";
import {Editor} from "../viewport.js";

export class SettingsPlugin extends Plugin {
    register(state: GlobalState): void {
        state.registerCommand({
            display: 'Open Settings',
            id: 'settings',
            icon: '\ue8b8',
            description: 'Open the settings window',
            shortcut: 'ctrl+alt+s',

            run: mgr => mgr.mutate(state => state.viewport.openEditors.open(new SettingsEditor())),
        });
    }
}

export class SettingsEditor implements Editor {
    beforeClose?(this: Editor<any>): void | Promise<void> {
        throw new Error('Method not implemented.');
    }
    listContextActions(): Command[] {
        return [];
    }

    title = "Settings";

    render(): React.ReactNode {
        return <div>Settings</div>;
    }
}