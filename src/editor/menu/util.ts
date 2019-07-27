import React from "react";
import classnames from 'classnames/bind';

import Menu, { MenuProps } from "./menu";

import styles from './index.css';

export const cx = classnames.bind(styles);

export function isMenuItem(node: React.ReactNode):
    node is React.FunctionComponentElement<Menu.ItemProps> {
    return typeof node === 'object' && node !== null &&
        'type' in node && node.type === Menu.Item;
}

export function useMenuItemDataSource(props: MenuProps): Menu.ItemProps[] {
    return React.useMemo(() => {
        if (props.dataSource) {
            return props.dataSource;
        } else if (props.children) {
            return React.Children.map(props.children, node => {
                if (!isMenuItem(node)) {
                    throw new Error('expect a Menu.Item');
                }

                return node.props;
            });
        } else {
            return [];
        }
    }, [props.dataSource, props.children]);
}
