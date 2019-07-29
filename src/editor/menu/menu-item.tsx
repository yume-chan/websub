import React from "react";

import Menu from "./menu";
import SubMenu from "./sub-menu";
import { cx } from "./util";
import { useDataSource } from "../with-data-source";

export interface MenuItemProps extends Menu.ItemProps {
    opened: boolean;

    onClose: () => void;
}

export default function MenuItem(props: MenuItemProps) {
    const children = useDataSource(props, Menu.Item);

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
                    <SubMenu
                        className="menu-item-children"
                        dataSource={children}
                        onClose={props.onClose}
                    />
                )
            }
        </div>
    );
}
