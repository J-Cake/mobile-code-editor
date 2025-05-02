import React from 'react';

import style from "@css/button.css?raw";

export interface ButtonProps {
    icon?: string,
    disabled?: boolean,

    variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning';

    children?: React.ReactNode;

    onActivate?: () => void
}

export default function Button(props: ButtonProps) {
    return <button className={`button ${props.variant ?? 'secondary'}`}
       {...{ disabled: props.disabled, 'data-icon': props.icon }} onClick={e => props.onActivate?.()}>
        <style scoped>{style}</style>
        {props.children}
    </button>
}