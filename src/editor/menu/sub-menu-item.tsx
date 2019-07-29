import React from "react";

import Menu from "./menu";
import { MenuItemProps } from "./menu-item";
import SubMenu from "./sub-menu";
import { cx } from "./util";
import { useDataSource } from "../with-data-source";

export function renderShortcut(shortcut: Menu.KeyboardShortcut) {
    const parts: string[] = [];

    if (shortcut.ctrl) {
        parts.push('Ctrl');
    }

    if (shortcut.shift) {
        parts.push('Shift');
    }

    if (shortcut.alt) {
        parts.push('Alt');
    }

    parts.push(shortcut.key);

    return parts.join(' + ');
}

export interface SubMenuItemProps extends MenuItemProps {
    active: boolean;

    onOpen: () => void;

    onClose: () => void;
}

function useChainCallback<T extends any[]>(
    ...callbacks: (((...args: T) => void) | undefined)[]):
    (...args: T) => void {
    return React.useCallback((...args: T): void => {
        for (const callback of callbacks) {
            if (typeof callback !== 'undefined') {
                callback(...args);
            }
        }
    }, callbacks);
}

export default React.memo(function SubMenuItem(props: SubMenuItemProps) {
    const children = useDataSource(props, Menu.Item);

    const handleClick = useChainCallback(props.onClick, props.onClose);

    const extra = React.useMemo(() => {
        if (children.length !== 0) {
            return (
                <div className={cx('sub-menu-item-arrow')}>&gt;</div>
            );
        } else if (props.shortcut) {
            return (
                <div className={cx('sub-menu-item-shortcut')}>
                    {props.shortcut.map(renderShortcut).join(' ')}
                </div>
            );
        } else {
            return null;
        }
    }, [children, props.shortcut]);

    return (
        <div className={cx('sub-menu-item', children.length !== 0 && props.active && 'active')}>
            <div
                className={cx('sub-menu-item-content')}
                onClick={children.length !== 0 ? props.onOpen : handleClick}
                onMouseEnter={props.onMouseEnter}
                onMouseLeave={props.onMouseLeave}
            >
                <div className={cx('sub-menu-item-label')}>
                    {props.label}
                </div>

                {extra}
            </div>

            {
                children.length !== 0 && props.opened && (
                    <SubMenu
                        className="sub-menu-item-children"
                        dataSource={children}
                        onClose={props.onClose}
                    />
                )
            }
        </div>
    )
});
