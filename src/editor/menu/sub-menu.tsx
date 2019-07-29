import React from 'react';

import SubMenuItem from './sub-menu-item';
import Menu from './menu';
import { cx } from './util';
import { indexed } from '../util';

export interface SubMenuProps {
    className: string;

    dataSource: Menu.ItemProps[];

    onClose: () => void;
}

export default function SubMenu(props: SubMenuProps) {
    const IndexedSubMenuItem = React.useMemo(() => indexed(SubMenuItem), []);

    const [activeIndex, setActiveIndex] = React.useState(-1);
    const [openedIndex, setOpenedIndex] = React.useState(-1);
    const timeoutId = React.useRef(0);

    const handleOpen = React.useCallback((index: number) => {
        timeoutId.current += 1;
        setOpenedIndex(index);
    }, []);

    const handleClose = props.onClose;

    const handleClick = React.useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
        const original = props.dataSource[index].onClick;
        if (typeof original === 'function') {
            original(e);
        }
    }, [props.dataSource]);

    const handleMouseEnter = React.useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
        setActiveIndex(index);

        timeoutId.current += 1;
        const currentId = timeoutId.current;
        setTimeout(() => {
            if (currentId === timeoutId.current) {
                setOpenedIndex(index);
            }
        }, 300);
    }, []);

    const handleMouseLeave = React.useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
        const original = props.dataSource[index].onMouseLeave;
        if (typeof original === 'function') {
            original(e);
        }
    }, [props.dataSource]);

    return (
        <div className={cx('sub-menu', props.className)}>
            {
                props.dataSource.map((props, index) => (
                    <IndexedSubMenuItem
                        {...props}
                        index={index}
                        active={index === activeIndex}
                        opened={index === openedIndex}
                        onClick={handleClick}
                        onOpen={handleOpen}
                        onClose={handleClose}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    />
                ))
            }
        </div>
    );
}
