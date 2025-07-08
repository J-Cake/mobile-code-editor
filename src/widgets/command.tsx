import * as React from 'react';

import state, { Command } from '../state.js';
import Button from './button.js';

interface Props {
    command: Command["id"];
    appearance?: 'li' | 'button'
}

export default function Command(props: Props) {
    const cmd = state.useMask(state => Object.values(state.commands.registered).find(cmd => cmd.id == props.command));

    if (cmd)
        return <Button variant={"flat"} onActivate={() => state.dispatchCommand(props.command)} icon={cmd.icon}>
            {cmd.display}
        </Button>
}