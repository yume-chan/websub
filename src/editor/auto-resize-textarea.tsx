import React from 'react';

export interface AutoResizeTextAreaProps {
    className?: string;
    style?: React.CSSProperties;

    value: string;

    onChange: (value: string) => void;
    onFocus?: () => void;
}

export default function AutoResizeTextArea(props: AutoResizeTextAreaProps) {
    const [width, setWidth] = React.useState<number>(0);
    const [height, setHeight] = React.useState<number>(0);

    const handleTextAreaChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        props.onChange(e.target.value);
    }, [props.onChange]);

    const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const divRef = React.useRef<HTMLDivElement | null>(null);
    React.useLayoutEffect(() => {
        const newWidth = textAreaRef.current!.getBoundingClientRect().width;
        if (width !== newWidth) {
            setWidth(newWidth);
            return;
        }

        const height = divRef.current!.getBoundingClientRect().height;
        setHeight(height);
    }, [props.value, width]);

    const divStyle = React.useMemo(() => ({
        ...props.style,
        position: 'fixed',
        top: 0,
        left: 0,
        height: undefined,
        width,
        whiteSpace: 'pre-wrap',
        opacity: 0,
        pointerEvents: 'none',
    } as React.CSSProperties), [props.style, width]);

    const divContent = React.useMemo(() => {
        if (props.value === '') {
            // need at least one line
            return '1';
        }

        if (props.value.endsWith('\n')) {
            // div will ignore last line break, add something to it
            return `${props.value}1`;
        }

        return props.value;
    }, [props.value])

    return (
        <React.Fragment>
            <textarea
                ref={textAreaRef}
                className={props.className}
                style={{ ...props.style, height }}
                value={props.value}
                onChange={handleTextAreaChange}
                onFocus={props.onFocus}
            />
            <div
                ref={divRef}
                className={props.className}
                style={divStyle}
            >
                {divContent}
            </div>
        </React.Fragment>
    );
}
