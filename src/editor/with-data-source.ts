import React from 'react';

export interface WithDataSourceProps<T> {
    dataSource?: T[];

    children?: React.ReactNode;
}

export function isNodeType<T>(
    node: React.ReactNode,
    nodeType: React.ComponentType<T>):
    node is React.ReactElement<T> {
    return typeof node === 'object' && node !== null &&
        'type' in node && node.type === nodeType;
}


export function useDataSource<T>(
    props: WithDataSourceProps<T>,
    nodeType: React.ComponentType<T>)
    : T[] {
    return React.useMemo(() => {
        if (props.dataSource) {
            return props.dataSource;
        } else if (props.children) {
            return React.Children.map(props.children, node => {
                if (!isNodeType(node, nodeType)) {
                    throw new Error('wrong children');
                }

                return node.props;
            });
        } else {
            return [];
        }
    }, [props.dataSource, props.children]);
}
