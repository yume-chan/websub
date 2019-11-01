import React from 'react';

import styles from './index.css';
import usePixelRatio from '../../use-pixel-ratio';

export interface WaveFormProps {
    fileUrl: string;

    currentTime: number;

    scale: number;
}

export default function WaveForm(props: WaveFormProps): JSX.Element {
    const { currentTime, scale } = props;

    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const [width, setWidth] = React.useState(0);
    const [height, setHeight] = React.useState(0);
    const pixelRatio = usePixelRatio();

    const draw = React.useCallback(() => {
        if (!canvasRef.current) {
            return;
        }

        const { width, height } = canvasRef.current!;
        const context = canvasRef.current!.getContext('2d')!;
        context.clearRect(0, 0, width, height);

        context.fillText(pixelRatio.toString(), 0, 0);
        context.fillText(currentTime.toString(), 0, 0);
        context.fillText(scale.toString(), 0, 0);
    }, [pixelRatio, currentTime, scale]);

    React.useLayoutEffect(() => {
        let redraw = true;

        const containerRect = containerRef.current!.getBoundingClientRect();
        if (containerRect.width !== width) {
            setWidth(containerRect.width);
            redraw = false;
        }
        if (containerRect.height !== height) {
            setHeight(containerRect.height);
            redraw = false;
        }

        if (redraw) {
            draw();
        }
    }, [width, height, draw]);

    const canvasStyle = React.useMemo((): React.CSSProperties => ({
        transform: `scale(${1 / pixelRatio})`,
    }), [pixelRatio])

    return (
        <div
            ref={containerRef}
            className={styles.container}
        >
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                width={width * pixelRatio}
                height={height * pixelRatio}
                style={canvasStyle}
            />
        </div>
    );
}
