import React from 'react';

let query: MediaQueryList;

const handlers: Set<(value: number) => void> = new Set();

function handlePixelRatioChange(): void {
    for (const handler of handlers) {
        handler(window.devicePixelRatio);
    }

    initialize();
}

function initialize(): void {
    if (query) {
        query.removeEventListener('change', handlePixelRatioChange);
    }

    query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', handlePixelRatioChange);
}
initialize();

export default function usePixelRatio(): number {
    const [pixelRatio, setPixelRatio] = React.useState(window.devicePixelRatio);

    React.useLayoutEffect(() => {
        handlers.add(setPixelRatio);
        return (): void => {
            handlers.delete(setPixelRatio);
        };
    }, []);

    return pixelRatio;
}
