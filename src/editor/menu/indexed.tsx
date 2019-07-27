import React from 'react';

type IndexedComponentProps<T> =
    {
        [K in keyof T]:
        K extends 'index' // convert `index` to number, avoid collision with below
        ? number
        : T[K] extends ((...args: infer A) => infer R) | undefined // optional function
        ? ((index: number, ...args: A) => R) | undefined
        : T[K] extends ((...args: infer A) => infer R)  // required function
        ? (index: number, ...args: A) => R
        : T[K] // passthrough
    } &
    (T extends { index: infer TIndex } ? { originalIndex: TIndex } : {}) & // add `originalIndex` if `index` exists
    { index: number; }; // add `index` as number

export default function indexed<TProps>(Component: React.FunctionComponent<TProps>): React.FunctionComponent<IndexedComponentProps<TProps>> {
    function IndexedComponent(props: IndexedComponentProps<TProps>) {
        // ref to up-to-date props
        const propsRef = React.useRef(props);

        // ref to props for wrapped component
        const mappedPropsRef = React.useRef<any>({});

        // update props for wrapped component
        const temp: any = {};
        for (const [key, value] of Object.entries(props) as Iterable<[keyof IndexedComponentProps<TProps>, any]>) {
            // `index` is used by this HOC, ignore
            if (key === 'index') {
                continue;
            }

            // rename `originalIndex` to `index`
            if (key === 'originalIndex') {
                temp['index'] = value;
                continue;
            }

            // create or reuse wrapper functions.
            // these wrapper functions get `index` and handlers from `propsRef`
            // so they can be reused.
            // also because of this, if wrapped component is a pure component,
            // changing functions in `props` won't cause it to re-render.
            if (typeof value === 'function') {
                if (typeof mappedPropsRef.current[key] !== 'function') {
                    temp[key] = ((...args: any) => {
                        // as mentioned before,
                        // this wrapper function uses `propsRef`, not `props`
                        const props = propsRef.current;
                        const handler = props[key] as Function;
                        const index = props.index;
                        // call handler with extra `index` parameter
                        return handler(index, ...args);
                    }) as any;
                } else {
                    temp[key] = mappedPropsRef.current[key];
                }

                continue;
            }

            // passthrough other props
            temp[key] = value;
        }

        // update refs
        propsRef.current = props;
        mappedPropsRef.current = temp;

        return (
            <Component {...mappedPropsRef.current} />
        );
    }
    IndexedComponent.displayName = `Indexed(${Component.displayName || Component.name})`;
    return IndexedComponent;
}
