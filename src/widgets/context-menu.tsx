import * as React from 'react';
import * as dom from 'react-dom/client';

import { Command } from '../state.js';
import style from "@css/popup.css?raw";
import Cmd from './command.js';
import Modal from './modal.js';
import Button from './button.js';

export default class ContextMenu extends Modal {
    private options: Array<MenuOption | { command: Command['id'] } | ContextMenu | 'separator'> = [];
    public addOption(option: MenuOption | { command: Command['id'] }): ContextMenu {
        this.options.push(option);
        return this;
    }

    public addSubmenu(menu: Submenu): ContextMenu {
        this.options.push(menu);
        return this;
    }

    public addSeparator(): ContextMenu {
        this.options.push('separator');
        return this;
    }

    containerFactory(): HTMLDialogElement {
        const container = super.containerFactory();
        container.classList.add('context-menu');
        return container;
    }

    public show() {
        super.show(this.content())
    }

    content() {
        return this.options.map((option, a) => {
            if (option === 'separator')
                return <div className={"context-menu-item context-menu-separator"} key={`option-${a}`} />;
            else if (typeof option == 'object' && 'command' in option)
                return <div className={"context-menu-item context-menu-command"}  key={`option-${a}`}>
                    <Cmd command={option.command} />
                </div>;
            else if (isSubmenu(option))
                return <div className={"context-menu-item context-menu-submenu"} data-icon={option.icon} key={`option-${a}`}>{option.label}</div>;
            else if (isMenu(option))
                return <div className={"context-menu-item context-menu-option"} key={`option-${a}`}>
                    <Button variant={"flat"} onActivate={option.action} icon={option.icon}>
                        {option.label}
                    </Button>
                </div>;
        });
    }
}

const isSubmenu = (option: MenuOption | ContextMenu | 'separator'): option is Submenu => typeof option == 'object' && 'submenu' in option && !(option instanceof ContextMenu);
const isMenu = (option: MenuOption | ContextMenu | 'separator'): option is MenuOption => typeof option == 'object' && !isSubmenu(option) && !Object.keys(option)
    .some(key => !['label', 'icon', 'action', 'more'].includes(key));

export interface MenuOption {
    label: string,
    icon?: string,
    action?: () => void,
    more?: { icon: string } | { shortcut: string } | { checked: boolean, name?: string }
}

export interface Submenu {
    label: string,
    icon?: string,
    submenu: ContextMenu
}