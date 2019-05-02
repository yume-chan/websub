import React from 'react';
import debounce from 'debounce';
import produce from 'immer';

import { AssFile } from '..';
import styles from './index.css';

/**
 * Get a ref from props
 * Use in `useCallback` when your callback relies on some props
 * but you don't want to recreate the callback everytime.
 */
function usePropRef<T, K extends keyof T>(props: T, key: K): React.MutableRefObject<T[K]> {
    const ref = React.useRef<T[K]>();
    ref.current = props[key];
    return ref as React.MutableRefObject<T[K]>;
}

interface EditorProps {
    video: File;

    subtitle: AssFile;

    onSubtitleChange: (value: AssFile) => void;
}

function formatTime(value: number) {
    let result = '';

    const hundredthSeconds = value % 1;
    result = (hundredthSeconds * 100).toFixed(0).padStart(3, '0');

    value -= hundredthSeconds;
    const seconds = value % 60;
    result = `${seconds.toString().padStart(2, '0')}.${result}`;

    value = (value - seconds) / 60;
    const minutes = value % 60;
    result = `${minutes.toString().padStart(2, '0')}:${result}`;

    value = (value - minutes) / 60;
    result = `${value.toString().padStart(2, '0')}:${result}`;

    return result;
}

interface IndexedInputProps {
    style?: React.CSSProperties;

    index: number;

    value: string;

    onChange: (index: number, value: string) => void;

    onFocus: (index: number) => void;
}

function IndexedInput(props: IndexedInputProps) {
    const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(props.index, e.target.value);
    }, [props.onChange, props.index])

    const handleInputFocus = props.onFocus && React.useCallback(() => {
        props.onFocus(props.index);
    }, [props.onFocus, props.index]);

    return (
        <input
            style={props.style}
            type="text"
            value={props.value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
        />
    );
}

interface Point {
    x: number;

    y: number;
}

interface DragTrackerProps {
    className?: string;

    style?: React.CSSProperties;

    position: Point;

    onPositionChange: (value: Point) => void;
}

function DragTracker(props: DragTrackerProps) {
    const lastPosition = React.useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const positionRef = usePropRef(props, 'position');

    const [dragging, setDragging] = React.useState<boolean>(false);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        props.onPositionChange({
            x: positionRef.current.x + e.pageX - lastPosition.current.y,
            y: positionRef.current.y + e.pageY - lastPosition.current.y,
        });
        lastPosition.current.x = e.pageX;
        lastPosition.current.y = e.pageY;
    }, [props.onPositionChange]);

    const handleMouseUp = React.useCallback((e: MouseEvent) => {
        setDragging(false);
    }, []);

    React.useEffect(() => {
        if (dragging) {
            document.addEventListener('mousemove', handleMouseMove);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }

        return undefined;
    }, [dragging, handleMouseMove]);

    React.useEffect(() => {
        if (dragging !== null) {
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }

        return undefined;
    }, [dragging])

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
        lastPosition.current.x = e.pageX;
        lastPosition.current.y = e.pageY;
        setDragging(true);
    }, []);

    return (
        <div className={props.className} style={props.style} onMouseDown={handleMouseDown} />
    )
}

export default function Editor(props: EditorProps) {
    const videoUrl = React.useMemo(() => {
        return URL.createObjectURL(props.video);
    }, [props.video]);

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const timeInputRef = React.useRef<HTMLInputElement>(null);
    const spanRef = React.useRef<HTMLDivElement>(null);

    const [stopTime, setStopTime] = React.useState<number | null>(null);

    const updateTimeDisplay = React.useMemo(() => debounce((time: number) => {
        // uncontrolled update to improve performance
        timeInputRef.current!.valueAsNumber = time / videoRef.current!.duration;
        spanRef.current!.textContent = `time: ${formatTime(time)}/${formatTime(videoRef.current!.duration)}  playbackRate: ${videoRef.current!.playbackRate}`;
    }, 33, true), []);

    const handleVideoTimeUpdate = React.useCallback(() => {
        const time = videoRef.current!.currentTime;

        if (stopTime !== null && time > stopTime) {
            videoRef.current!.pause();
            setStopTime(null);
        }

        updateTimeDisplay(time);
    }, [stopTime]);

    const handleTimeInputChange = React.useCallback(() => {
        const requested = timeInputRef.current!.valueAsNumber * videoRef.current!.duration;
        if (Math.abs(requested - videoRef.current!.currentTime) < 0.5) {
            return;
        }

        videoRef.current!.currentTime = requested;
    }, []);

    const subtitleRef = React.useRef<AssFile>(props.subtitle);
    if (subtitleRef.current !== props.subtitle) {
        subtitleRef.current = props.subtitle;
    }

    const handleTextInputChange = React.useCallback((index: number, value: string) => {
        props.onSubtitleChange(produce(subtitleRef.current, (draft) => {
            draft.Events[index].Text = value;
        }));
    }, [props.onSubtitleChange])

    const [focusIndex, setFocusIndex] = React.useState<number>(-1);

    const handleFocusChanges = React.useCallback((index: number) => {
        setFocusIndex(index);
    }, [props.subtitle, props.onSubtitleChange])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'p':
            case 'P':
                if (e.ctrlKey) {
                    if (focusIndex !== -1) {
                        const event = subtitleRef.current.Events[focusIndex];
                        videoRef.current!.currentTime = event.Start.toSeconds();
                        videoRef.current!.play();
                        setStopTime(event.End.toSeconds());
                        e.preventDefault();
                    }
                }
                break;
            case 'h':
            case 'H':
                if (e.ctrlKey) {
                    if (focusIndex !== null) {
                        handleTextInputChange(focusIndex, '（拜托了，校对桑！）');
                        e.preventDefault();
                    }
                }
                break;
            case 'o':
            case 'O':
                if (e.ctrlKey) {
                    if (focusIndex !== null) {
                        const event = subtitleRef.current.Events[focusIndex];
                        videoRef.current!.currentTime = event.Start.toSeconds() - 1;
                        videoRef.current!.play();
                        setStopTime(event.End.toSeconds() + 1);
                        e.preventDefault();
                    }
                }
                break;
            case 's':
            case 'S':
                if (e.ctrlKey) {
                    videoRef.current!.playbackRate -= 0.1;
                    e.preventDefault();
                }
                break;
            case 'd':
            case 'D':
                if (e.ctrlKey) {
                    videoRef.current!.playbackRate += 0.1;
                    e.preventDefault();
                }
                break;
        }
    }, [videoRef, focusIndex]);

    const [videoHeight, setVideoHeight] = React.useState<number>(window.innerHeight / 3);
    const handleDrag = React.useCallback((value: Point) => {
        setVideoHeight(value.y);
    }, []);

    return (
        <div className={styles.container} onKeyDown={handleKeyDown}>
            <div className={styles.help}>
                <p>快捷键：</p>
                <p><code>Ctrl+P</code>: 播放当前行的视频</p>
                <p><code>Ctrl+O</code>: 播放当前行+前后 1 秒的视频</p>
                <p><code>Ctrl+H</code>: 一键求助校对桑</p>
                <p><code>Ctrl+S</code>: 播放速度 -10%</p>
                <p><code>Ctrl+D</code>: 播放速度 +10%</p>
            </div>

            <video
                className={styles.video}
                ref={videoRef}
                height={videoHeight - 20}
                src={videoUrl}
                onTimeUpdate={handleVideoTimeUpdate}
            />

            <input
                className={styles.progress}
                ref={timeInputRef}
                type="range"
                min={0}
                max={1}
                step={0.000001}
                defaultValue="0"
                onChange={handleTimeInputChange}
            />

            <div ref={spanRef} style={{ textAlign: 'center' }} />

            {/* <canvas ref={canvasRef} /> */}

            <DragTracker className={styles.splitter} position={{ x: 0, y: videoHeight }} onPositionChange={handleDrag} />

            <div className={styles.table} style={{ overflowY: 'auto' }}>
                {props.subtitle.Events.map((line, index) => (
                    <div key={index} className={styles.line}>
                        <span style={{ marginRight: 8 }}>{line.type}</span>
                        <span style={{ marginRight: 8 }}>{line.Start.toString()}</span>
                        <span style={{ marginRight: 8 }}>{line.End.toString()}</span>
                        <IndexedInput
                            index={index}
                            style={{ marginRight: 8, width: 300 }}
                            onChange={handleTextInputChange}
                            onFocus={handleFocusChanges}
                            value={line.Text}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
