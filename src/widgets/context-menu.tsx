import * as React from 'react';
import * as dom from 'react-dom/client';

export default class ContextMenu {
    private options: Array<MenuOption | ContextMenu | 'separator'> = [];
    public addOption(option: MenuOption): ContextMenu {
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

    public show() {
        const modal = document.querySelector('#modals')!
            .appendChild(document.createElement('dialog'));

        dom.createRoot(modal)
            .render(<ul>
                {this.options.map(option => {
                    if (option === 'separator')
                        return <li className={"context-menu-separator"} />;
                    else if (isSubmenu(option))
                        return <li className={"context-menu-submenu"} data-icon={option.icon}>{option.label}</li>;
                    else if (isMenu(option))
                        return <li className={"context-menu-option"} data-icon={option.icon ?? ''}>
                            {option.label}
                        </li>;
                })}
            </ul>);
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