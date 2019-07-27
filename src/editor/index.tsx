import React from 'react';
import debounce from 'debounce';
import produce from 'immer';

import { AssFile } from '..';
import Ass from '../ass';

import AutoResizeTextArea from './auto-resize-textarea';
import Menu from './menu';

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
    className?: string;

    style?: React.CSSProperties;

    index: number;

    value: string;

    onChange: (index: number, value: string) => void;

    onFocus: (index: number) => void;
}

const IndexedInput = React.memo(function IndexedInput(props: IndexedInputProps) {
    const handleInputChange = React.useCallback((value: string) => {
        props.onChange(props.index, value);
    }, [props.onChange, props.index])

    const handleInputFocus = props.onFocus && React.useCallback(() => {
        props.onFocus(props.index);
    }, [props.onFocus, props.index]);

    return (
        <AutoResizeTextArea
            className={props.className}
            style={props.style}
            value={props.value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
        />
    );
});

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

    const subtitleRef = usePropRef(props, 'subtitle');

    const handleTextInputChange = React.useCallback((index: number, value: string) => {
        value = value.replace(/\n/g, '\\N');
        props.onSubtitleChange(produce(subtitleRef.current, (draft) => {
            draft.Events[index].Text = value;
        }));
    }, [props.onSubtitleChange])

    const focusIndexRef = React.useRef<number>(-1);

    const handleFocusChanges = React.useCallback((index: number) => {
        focusIndexRef.current = index;
    }, []);

    const handlers = React.useMemo(() => ({
        save() {
            const assString = Ass.stringify(subtitleRef.current);
            const url = `data:text/plain,${assString}`;
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export.ass';
            a.click();
        },
        play() {
            if (focusIndexRef.current !== -1) {
                const event = subtitleRef.current.Events[focusIndexRef.current];
                videoRef.current!.currentTime = event.Start.toSeconds();
                videoRef.current!.play();
                setStopTime(event.End.toSeconds());
            }
        },
        playExtended() {
            if (focusIndexRef.current !== -1) {
                const event = subtitleRef.current.Events[focusIndexRef.current];
                videoRef.current!.currentTime = event.Start.toSeconds() - 1;
                videoRef.current!.play();
                setStopTime(event.End.toSeconds() + 1);
            }
        },
        help() {
            if (focusIndexRef.current !== null) {
                handleTextInputChange(focusIndexRef.current, '（拜托了，校对桑！）');
            }
        },
        slower() {
            videoRef.current!.playbackRate -= 0.1;
        },
        faster() {
            videoRef.current!.playbackRate += 0.1;
        }
    }), []);

    const menu = React.useMemo((): Menu.ItemProps[] => ([
        {
            label: 'File',
            dataSource: [
                {
                    label: 'Save',
                    onClick: handlers.save,
                },
            ],
        },
        {
            label: 'Playback',
            dataSource: [
                {
                    label: 'Play current line',
                    shortcut: [
                        {
                            ctrl: true,
                            key: 'P',
                        },
                    ],
                    onClick: handlers.play,
                },
                {
                    label: 'Play current line ±1s',
                    shortcut: [
                        {
                            ctrl: true,
                            key: 'O',
                        },
                    ],
                    onClick: handlers.playExtended,
                },
                {
                    label: 'Get help',
                    shortcut: [
                        {
                            ctrl: true,
                            key: 'H',
                        },
                    ],
                    onClick: handlers.help,
                },
                {
                    label: '-10% playback speed',
                    shortcut: [
                        {
                            ctrl: true,
                            key: 'S',
                        },
                    ],
                    onClick: handlers.slower,
                },
                {
                    label: '+10% playback speed',
                    shortcut: [
                        {
                            ctrl: true,
                            key: 'D',
                        },
                    ],
                    onClick: handlers.faster,
                },
            ]
        }
    ]), []);

    const handleKeyDown = React.useCallback((e: Pick<React.KeyboardEvent, 'ctrlKey' | 'key' | 'preventDefault'>) => {
        switch (e.key) {
            case 'p':
            case 'P':
                if (e.ctrlKey) {
                    handlers.play();
                    e.preventDefault();
                }
                break;
            case 'h':
            case 'H':
                if (e.ctrlKey) {
                    handlers.help();
                    e.preventDefault();
                }
                break;
            case 'o':
            case 'O':
                if (e.ctrlKey) {
                    handlers.playExtended();
                    e.preventDefault();
                }
                break;
            case 's':
            case 'S':
                if (e.ctrlKey) {
                    handlers.slower();
                    e.preventDefault();
                }
                break;
            case 'd':
            case 'D':
                if (e.ctrlKey) {
                    handlers.faster();
                    e.preventDefault();
                }
                break;
        }
    }, []);

    const [videoHeight, setVideoHeight] = React.useState<number>(window.innerHeight / 3);
    const handleDrag = React.useCallback((value: Point) => {
        setVideoHeight(value.y);
    }, []);

    const handleSaveClick = React.useCallback(() => {
        const assString = Ass.stringify(subtitleRef.current);
        const url = `data:text/plain,${assString}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.ass';
        a.click();
    }, []);

    return (
        <div className={styles.container} onKeyDown={handleKeyDown}>
            <Menu dataSource={menu} />

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

            <div ref={spanRef} style={React.useMemo(() => ({ textAlign: 'center' }), [])} />

            {/* <canvas ref={canvasRef} /> */}

            <DragTracker className={styles.splitter} position={{ x: 0, y: videoHeight }} onPositionChange={handleDrag} />

            <div className={styles.table}>
                {props.subtitle.Events.map((line, index) => (
                    <div key={index} className={styles.line}>
                        <span className={styles['line-span']}>{line.type}</span>
                        <span className={styles['line-span']}>{line.Start.toString()}</span>
                        <span className={styles['line-span']}>{line.End.toString()}</span>
                        <IndexedInput
                            index={index}
                            className={styles['line-input']}
                            onChange={handleTextInputChange}
                            onFocus={handleFocusChanges}
                            value={line.Text.replace(/\\N/g, '\n')}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
