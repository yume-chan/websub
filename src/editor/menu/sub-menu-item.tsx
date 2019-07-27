import React from "react";

import Menu from "./menu";
import { MenuItemProps } from "./menu-item";
import SubMenu from "./sub-menu";
import { useMenuItemDataSource, cx } from "./util";

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
}

export default React.memo(function SubMenuItem(props: SubMenuItemProps) {
    const children = useMenuItemDataSource(props);

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
                onClick={children.length !== 0 ? props.onOpen : props.onClick}
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
                    <SubMenu className="sub-menu-item-children" dataSource={children} />
                )
            }
        </div>
    )
});
