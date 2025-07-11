import React from 'react';

import style from "@css/button.css?raw";

export interface ButtonProps {
	icon?: string,
	disabled?: boolean,

	symbolic?: boolean

	variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'flat';

	children?: React.ReactNode;

	onActivate?: () => void
}

export default function Button(props: ButtonProps) {
	return <button className={`button ${props.variant ?? 'secondary'} ${props.symbolic ? 'symbolic' : ''}`}
				   onClick={e => props.onActivate?.()}
				   {...{disabled: props.disabled, 'data-icon': props.icon}}>
		<style scoped>{style}</style>
		{props.symbolic ? null : props.children}
	</button>
}