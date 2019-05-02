import React from 'react';
import ReactDOM from 'react-dom';
import debounce from 'debounce';

import Welcome from './welcome';
import Editor from './editor';
import Ass, { AssTime } from './ass';

export interface AssEvent {
    type: string;

    Start: AssTime;

    End: AssTime;

    Text: string;
}

export interface AssFile {
    Events: AssEvent[];
}

const autoSave = debounce((subtitle: AssFile) => {
    localStorage.setItem('ass', Ass.stringify(subtitle));
}, 1000);

export default function App() {
    const [video, setVideo] = React.useState<File | null>(null);

    const initialSubtitle = React.useMemo(() => {
        const value = localStorage.getItem('ass');
        if (value !== null) {
            return Ass.parse(value);
        }
        return null;
    }, []);
    const [subtitle, setSubtitle] = React.useState<AssFile | null>(initialSubtitle);

    const handleSubtitleChange = React.useCallback((subtitle: AssFile) => {
        autoSave(subtitle);
        setSubtitle(subtitle);
    }, []);

    if (video === null || subtitle === null) {
        return (
            <Welcome
                video={video}
                onVideoChange={setVideo}
                onOk={handleSubtitleChange} />
        );
    }

    return (
        <Editor
            video={video}
            subtitle={subtitle}
            onSubtitleChange={handleSubtitleChange}
        />
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
