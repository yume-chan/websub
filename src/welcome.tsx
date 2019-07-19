import React from 'react';
import Ass from './ass';
import { AssFile } from '.';
import parseFlv from './flv';
import AutoResizeTextArea from './editor/auto-resize-textarea';

interface FilePickerProps {
    accept?: string;
    onChange: (file: File) => void;
}

function FilePicker(props: React.PropsWithChildren<FilePickerProps>) {
    const handleLableClick = React.useCallback((e: React.MouseEvent<HTMLLabelElement>) => {
        if (e.currentTarget !== e.target) {
            e.currentTarget.click();
        }
    }, []);

    const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files!.length > 0) {
            props.onChange(e.target.files!.item(0)!);
        }
    }, [props.onChange]);

    return (
        <label onClick={handleLableClick}>
            <input
                style={{ position: 'absolute', top: -100 }}
                type="file"
                accept={props.accept}
                onChange={handleInputChange}
            />
            {props.children}
        </label>
    );
}

interface WelcomeProps {
    video: File | null;
    onVideoChange: (file: File) => void;

    onOk: (subtitle: AssFile) => void;
}

export default function Welcome(props: WelcomeProps) {
    const [subtitle, setSubtitle] = React.useState<File | null>(null);

    const handleVideoSelect = React.useCallback((file: File) => {
        props.onVideoChange(file);
        // parseFlv(file);
    }, [props.onVideoChange]);

    const handleSubtitleSelect = React.useCallback((file: File) => {
        setSubtitle(file);
    }, []);

    const handleOkClick = React.useCallback(() => {
        const reader = new FileReader();
        reader.onload = () => {
            props.onOk(Ass.parse(reader.result as string));
        };
        reader.readAsText(subtitle!);
    }, [props.onOk, subtitle])

    const [value, setValue] = React.useState<string>('foo');

    return (
        <div>
            <div>
                <span>Video:</span>
                {props.video && props.video.name}
                <FilePicker accept=".mp4" onChange={handleVideoSelect}>
                    <button>Browse...</button>
                </FilePicker>
            </div>

            <div>
                <span>Subtitle:</span>
                {subtitle && subtitle.name}
                <FilePicker accept=".ass" onChange={handleSubtitleSelect}>
                    <button>Browse...</button>
                </FilePicker>
            </div>

            <button disabled={!props.video || !subtitle} onClick={handleOkClick}>OK</button>

            <AutoResizeTextArea
                style={{ width: 500 }}
                value={value}
                onChange={setValue}
            />
        </div>
    );
}
