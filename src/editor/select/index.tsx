import React from 'react';

import { WithDataSourceProps, useDataSource } from '../with-data-source';

export interface SelectProps extends WithDataSourceProps<Select.ItemProps> {
    value: string;

    onChange: (value: string, item: any) => void;
}

function Select(props: SelectProps) {
    const children = useDataSource(props, Select.Item);
    const selected = React.useMemo(() => {
        const selected = children.find(x => x.value === props.value)
        if (typeof selected !== 'undefined') {
            return selected;
        }

        if (children.length > 0) {
            return children[0];
        }

        return undefined;
    }, [children, props.value]);
    const [opened, setOpened] = React.useState(false);

    const handleClick = React.useCallback(() => {
        setOpened(!opened);
    }, [opened]);

    return (
        <div>
            <div>{selected && selected.label}</div>
        </div>
    )
}

namespace Select {
    export interface ItemProps {
        label: string;

        value: string;
    }

    export function Item(props: ItemProps): JSX.Element {
        throw new Error('Menu.Item must be used in Menu');
    }
}

export default Select;
