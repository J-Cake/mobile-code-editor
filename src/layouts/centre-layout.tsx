import * as React from "react";

import style from "@css/centre-layout.css?raw";

export default function CentreLayout(props: { children: React.ReactNode }) {
    return <div className={"centre-layout"}>
        <style scoped>{style}</style>

        {props.children}
    </div>;
}