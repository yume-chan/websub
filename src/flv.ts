// @ts-ignore
import FlvDemuxer from 'flv.js/src/demux/flv-demuxer';

class FileSliceReader {
    private _file: File;

    private _reader: FileReader;

    public constructor(file: File) {
        this._file = file;
        this._reader = new FileReader();
    }

    public read(offset: number, length: number): Promise<ArrayBuffer> {
        return new Promise(resolve => {
            this._reader.onload = () => {
                resolve(this._reader.result as ArrayBuffer);
            };
            const slice = this._file.slice(offset, offset + length);
            this._reader.readAsArrayBuffer(slice);
        });
    }
}

export default async function parseFlv(file: File) {
    const progress = document.body.appendChild(document.createElement('div'));
    const output = document.body.appendChild(document.createElement('textarea'));

    let offset = 0;
    const chunkSize = 16 * 1024 * 1024
    const reader = new FileSliceReader(file);

    const flvDemuxer = new FlvDemuxer(FlvDemuxer.probe(await reader.read(offset, chunkSize)));
    flvDemuxer.onError = (err: Error) => {
        console.error(err);
    };
    flvDemuxer.onMediaInfo = (info: any) => {
        // output.value += JSON.stringify(info) + '\n';
    };
    flvDemuxer.onTrackMetadata = () => {

    };
    flvDemuxer.onDataAvailable = () => {

    };

    while (offset < file.size) {
        const chunk = await reader.read(offset, chunkSize);
        offset += flvDemuxer.parseChunks(chunk, offset);
        progress.textContent = `${offset.toLocaleString('en-US')}/${file.size.toLocaleString('en-US')}`;
    }

    const track = flvDemuxer._audioTrack;

    const builder: string[] = [];
    for (let i = 0; i < track.samples.length; i++) {
    // for (let i = 1; i < 100000; i++) {
        const sample=track.samples[i];
        // @ts-ignore
        builder.push(`${i},${sample.dts}`);
    }
    output.value = builder.join('\n');
}
