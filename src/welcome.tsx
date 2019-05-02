import React from 'react';
import Ass from './ass';
import { AssFile } from '.';
import parseFlv from './flv';

interface FilePickerProps {
    accept?: string;
    onChange: (file: File) => void;
}

function FilePicker(props: React.PropsWithChildren<FilePickerProps>) {
    const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files!.length > 0) {
            props.onChange(e.target.files!.item(0)!);
        }
    }, [props.onChange]);

    return (
        <label>
            <input
                style={{ position: 'absolute', top: -100 }}
                type="file"
                accept={props.accept}
                onChange={onChange}
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

    return (
        <div>
            <div>
                <span>Video:</span>
                {props.video && props.video.name}
                <FilePicker accept=".mp4" onChange={handleVideoSelect}>
                    Browse...
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
        </div>
    );
}
