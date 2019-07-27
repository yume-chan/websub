import React from "react";

import Menu from "./menu";
import SubMenu from "./sub-menu";
import { useMenuItemDataSource, cx } from "./util";

export interface MenuItemProps extends Menu.ItemProps {
    opened: boolean;
}

export default function MenuItem(props: MenuItemProps) {
    const children = useMenuItemDataSource(props);

    return (
        <div className={cx('menu-item', props.opened && 'active')} tabIndex={-1}>
            <div
                className={cx('menu-label')}
                onClick={props.onClick}
                onMouseEnter={props.onMouseEnter}
                onMouseLeave={props.onMouseLeave}
            >
                {props.label}
            </div>

            {
                props.opened && (
                    <SubMenu className="menu-item-children" dataSource={children} />
                )
            }
        </div>
    );
}
