declare namespace MP4Box {
    export interface VideoInfo {
        width: number;

        height: number;
    }

    export interface AudioInfo {
        sample_rate: number;

        channel_count: number;

        sample_size: number;
    }

    export interface TrackInfo {
        id: number;

        codec: string;

        nb_samples: number;

        duration: number;

        timescale: number;

        type: 'audio' | 'video';

        video?: VideoInfo;

        audio?: AudioInfo;
    }

    export interface ISOFileInfo {
        duration: number;

        timescale: number;

        tracks: TrackInfo[];
    }

    export interface SegmentInitializeResult {
        id: number;

        user: any;

        buffer: ArrayBuffer;
    }

    export interface Sample {
        number: number;

        track_id: number;

        description: any;

        is_rap: boolean;

        timescale: number;

        dts: number;

        cts: number;

        duration: number;

        size: number;

        data: ArrayBuffer;
    }

    export class ISOFile {
        onReady?: (info: MP4Box.ISOFileInfo) => void;

        onSegment: (id: number, user: any, buffer: ArrayBuffer, sampleNum: number, is_last: boolean) => void;

        onSamples: (id: number, user: any, samples: Sample[]) => void;

        onRequestMoreData: (offset: number) => void;

        setSegmentOptions(id: number, user: any, options: any): void;

        setExtractionOptions(id: number, user: any, options: any): void;

        initializeSegmentation(): MP4Box.SegmentInitializeResult[];

        appendBuffer(buffer: ArrayBuffer): number;

        flush(): void;

        start(): void;

        seek(time: number): { offset: number, time: number };

        stop(): void;

        releaseUsedSamples(trackId: number, sampleIndex: number): void;
    }

    export function createFile(): ISOFile;
}
