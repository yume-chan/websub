import React from "react";

import indexed from "./indexed";
import MenuItem from "./menu-item";
import { cx, useMenuItemDataSource } from "./util";

export interface MenuProps {
    dataSource?: Menu.ItemProps[];

    children?: React.ReactNode;
}

function Menu(props: MenuProps) {
    const IndexedMenuItem = React.useMemo(() => indexed(MenuItem), []);

    const children = useMenuItemDataSource(props);
    const [openedIndex, setOpenedIndex] = React.useState(-1);
    React.useMemo(() => {
        setOpenedIndex(-1);
    }, [children]);

    // with the `indexed` HOC, change event handlers will no longer causes a re-render
    const handleClick = React.useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (openedIndex !== index) {
            // click another menu will open that instead
            setOpenedIndex(index);
        } else {
            // click menu twice will close it
            setOpenedIndex(-1);
        }

        const original = children[index].onClick;
        if (typeof original === 'function') {
            original(e);
        }
    }, [children, openedIndex]);

    const handleMouseEnter = React.useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (openedIndex !== -1 && openedIndex !== index) {
            // when one menu is opened, hover on other menu will open that one.
            setOpenedIndex(index);
        }

        const original = children[index].onMouseEnter;
        if (typeof original === 'function') {
            original(e);
        }
    }, [children, openedIndex]);

    const handleMouseLeave = React.useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
        const original = children[index].onMouseLeave;
        if (typeof original === 'function') {
            original(e);
        }
    }, [children]);

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLDivElement>) => {
        setOpenedIndex(-1);
    }, []);

    return (
        <div
            className={cx('menu')}
            onBlur={handleBlur}
        >
            {children.map((props, index) => (
                <IndexedMenuItem
                    {...props}
                    index={index}
                    opened={index === openedIndex}
                    onClick={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                />
            ))}
        </div>
    );
}

namespace Menu {
    export interface KeyboardShortcut {
        ctrl?: boolean;

        shift?: boolean;

        alt?: boolean;

        key: string;
    }

    export interface ItemProps extends MenuProps {
        label: string;

        shortcut?: KeyboardShortcut[];

        onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;

        onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;

        onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
    }

    export function Item(props: ItemProps): JSX.Element {
        throw new Error('Menu.Item must be used in Menu');
    }
}

export default Menu;
