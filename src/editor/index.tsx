import React from 'react';
import debounce from 'debounce';
import produce from 'immer';

import { AssFile } from '..';
import Ass from '../ass';

import AutoResizeTextArea from './auto-resize-textarea';
import Menu from './menu';

import styles from './index.css';
import { useValueRef, withIndex } from './util';

interface EditorProps {
    video: File;

    subtitle: AssFile;

    onSubtitleChange: (value: AssFile) => void;
}

function formatTime(value: number): string {
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

function DragTracker(props: DragTrackerProps): JSX.Element {
    const { onPositionChange } = props;

    const lastPosition = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const positionRef = useValueRef(props.position);

    const [dragging, setDragging] = React.useState<boolean>(false);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        onPositionChange({
            x: positionRef.current.x + e.pageX - lastPosition.current.y,
            y: positionRef.current.y + e.pageY - lastPosition.current.y,
        });
        lastPosition.current.x = e.pageX;
        lastPosition.current.y = e.pageY;
    }, [onPositionChange, positionRef]);

    const handleMouseUp = React.useCallback((e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setDragging(false);
    }, []);

    React.useEffect(() => {
        if (dragging) {
            document.addEventListener('mousemove', handleMouseMove);

            return (): void => {
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }

        return undefined;
    }, [dragging, handleMouseMove]);

    React.useEffect(() => {
        if (dragging !== null) {
            document.addEventListener('mouseup', handleMouseUp);

            return (): void => {
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }

        return undefined;
    }, [dragging, handleMouseUp])

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
        lastPosition.current.x = e.pageX;
        lastPosition.current.y = e.pageY;
        setDragging(true);
    }, []);

    return (
        <div className={props.className} style={props.style} onMouseDown={handleMouseDown} />
    )
}

export default function Editor(props: EditorProps): JSX.Element {
    const { video, onSubtitleChange } = props;

    const [videoUrl, setVideoUrl] = React.useState<string>();
    React.useEffect(() => {
        const url = window.URL.createObjectURL(video);
        setVideoUrl(url);

        return (): void => {
            window.URL.revokeObjectURL(url);
        };
    }, [video]);

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
    }, [stopTime, updateTimeDisplay]);

    const handleTimeInputChange = React.useCallback(() => {
        const requested = timeInputRef.current!.valueAsNumber * videoRef.current!.duration;
        if (Math.abs(requested - videoRef.current!.currentTime) < 0.5) {
            return;
        }

        videoRef.current!.currentTime = requested;
    }, []);

    const subtitleRef = useValueRef(props.subtitle);

    const changeSubtitleAt = React.useCallback((index: number, value: string) => {
        onSubtitleChange(produce(subtitleRef.current, (draft) => {
            draft.Events[index].Text = value;
        }));
    }, [onSubtitleChange, subtitleRef]);

    const handleTextInputChange = React.useCallback((index: number, value: string) => {
        changeSubtitleAt(index, value);
    }, [changeSubtitleAt])

    const focusIndexRef = React.useRef<number>(-1);

    const handleFocusChanges = React.useCallback((index: number) => {
        focusIndexRef.current = index;
    }, []);

    const handlers = React.useMemo(() => ({
        save(): void {
            const assString = Ass.stringify(subtitleRef.current);
            const url = `data:text/plain,${assString}`;
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export.ass';
            a.click();
        },
        play(): void {
            if (focusIndexRef.current !== -1) {
                const event = subtitleRef.current.Events[focusIndexRef.current];
                videoRef.current!.currentTime = event.Start.toSeconds();
                videoRef.current!.play();
                setStopTime(event.End.toSeconds());
            }
        },
        playExtended(): void {
            if (focusIndexRef.current !== -1) {
                const event = subtitleRef.current.Events[focusIndexRef.current];
                videoRef.current!.currentTime = event.Start.toSeconds() - 1;
                videoRef.current!.play();
                setStopTime(event.End.toSeconds() + 1);
            }
        },
        help(): void {
            if (focusIndexRef.current !== null) {
                changeSubtitleAt(focusIndexRef.current, '（拜托了，校对桑！）');
            }
        },
        slower(): void {
            videoRef.current!.playbackRate -= 0.1;
        },
        faster(): void {
            videoRef.current!.playbackRate += 0.1;
        }
    }), [changeSubtitleAt, subtitleRef]);

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
    ]), [handlers]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
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
    }, [handlers]);

    const [videoHeight, setVideoHeight] = React.useState<number>(window.innerHeight / 3);
    const handleDrag = React.useCallback((value: Point) => {
        setVideoHeight(value.y);
    }, []);

    const IndexedInput = React.useMemo(() => withIndex(AutoResizeTextArea), []);

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
                            value={line.Text}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
