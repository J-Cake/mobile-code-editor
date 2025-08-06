import React from 'react';

export function ListBox(props: { children: React.ReactNode[] }) {
    return <div tabIndex={0} className={"list-box widget"}>
        {props.children}
    </div>;
}