import * as React from 'react';

export default function If(props: { condition: boolean, children: { true: () => React.ReactNode, false?: () => React.ReactNode } }) {
    if (props.condition)
        return <>{props.children.true()}</>;
    else if (props.children.false)
        return <>{props.children.false() ?? null}</>;
}