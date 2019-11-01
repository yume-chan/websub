import React from "react";

export function useValueRef<T>(value: T): React.MutableRefObject<T> {
    const ref = React.useRef<T>(value);
    ref.current = value;
    return ref;
}

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
    { index: number }; // add `index` as number

export function withIndex(element: 'input'): React.FunctionComponent<IndexedComponentProps<React.InputHTMLAttributes<HTMLInputElement>>>;
export function withIndex<T extends keyof React.ReactHTML>(element: T): React.FunctionComponent<IndexedComponentProps<React.HTMLAttributes<T>>>;
export function withIndex<TProps>(Component: React.FunctionComponent<TProps>): React.FunctionComponent<IndexedComponentProps<TProps>>;
export function withIndex<TProps>(Component: string | React.FunctionComponent<TProps>): React.FunctionComponent<IndexedComponentProps<TProps>> {
    function WithIndexComponent(props: IndexedComponentProps<TProps>): JSX.Element {
        // ref to up-to-date props
        const propsRef = useValueRef(props);

        // ref to props for wrapped component
        const mappedPropsRef = React.useRef<Record<string, unknown>>({});
        mappedPropsRef.current = React.useMemo(() => {
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(props)) {
                // `index` is used by this HOC, ignore
                if (key === 'index') {
                    continue;
                }

                // rename `originalIndex` to `index`
                if (key === 'originalIndex') {
                    result['index'] = value;
                    continue;
                }

                if (typeof value === 'function') {
                    if (typeof mappedPropsRef.current[key] !== 'function') {
                        // create new wrapper function
                        // the wrapper function gets `index` and the original function from `propsRef`
                        // so they can be reused.
                        result[key] = ((...args: unknown[]) => {
                            // as mentioned before,
                            // this wrapper function uses `propsRef`, not `props`
                            const props = propsRef.current;
                            const handler = props[key as keyof IndexedComponentProps<TProps>] as Function;
                            const index = props.index;
                            // call handler with extra `index` parameter
                            return handler(index, ...args);
                        }) as unknown;
                        continue;
                    }

                    // reuse old wrapper function
                    result[key] = mappedPropsRef.current[key];
                    continue;
                }

                // passthrough other props
                result[key] = value;
            }
            return result;
        },
            // theoretically `propsRef` is a ref object and it could never change
            // but as it's not directly `React.useRef`, anything could change someday
            // it's added to deps list to be safe
            [props, propsRef])

        return React.createElement(Component, mappedPropsRef.current as TProps);
    }

    if (typeof Component === 'string') {
        WithIndexComponent.displayName = `withIndex(${Component})`;
    } else {
        WithIndexComponent.displayName = `withIndex(${Component.displayName || Component.name})`;
    }

    return WithIndexComponent;
}
