// @ts-ignore
import MseController from 'flv.js/src/core/mse-controller';

export default async function fragment(file: File): Promise<void> {
    let bufferFull = false;
    let bufferFullTime = 0;

    let isoFile!: MP4Box.ISOFile;
    // @ts-ignore
    // isoFile = new MP4Box();
    isoFile = MP4Box.createFile();

    isoFile.onReady = (info) => {
        const video = document.createElement('video');
        video.controls = true;
        video.onsuspend = () => {
            console.log('suspended');
        };
        video.onseeking = () => {
            const result = isoFile.seek(video.currentTime);
            offset = result.offset;
            if (Math.abs(result.time - video.currentTime) > 0.1) {
                video.currentTime = result.time;
                controller.seek(result.time);
                bufferFull = false;
            }
            readBlock();
        };
        document.body.appendChild(video);

        setInterval(() => {
            if (!video.paused) {
                if (video.currentTime != bufferFullTime) {
                    bufferFull = false;
                    readBlock();
                }
            }
        }, 1000);

        const controller = new MseController({
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 20,
            autoCleanupMinBackwardDuration: 20,
        });
        controller.attachMediaElement(video);
        controller.on('buffer_full', () => {
            bufferFull = true;
            bufferFullTime = video.currentTime;
        });
        controller.on('source_open', () => {
            const durationInSeconds = info.duration / info.timescale;
            controller._mediaSource.duration = durationInSeconds;
        });

        for (const track of info.tracks) {
            controller.appendInitSegment({
                type: track.video ? 'video' : 'audio',
                container: 'video/mp4',
                codec: track.codec,
            });

            isoFile.setSegmentOptions(track.id, track, { nbSamples: 1000 });
        }

        isoFile.onSegment = (id, track: MP4Box.TrackInfo, buffer, sampleIndex) => {
            controller.appendMediaSegment({
                type: track.video ? 'video' : 'audio',
                data: buffer,
            });

            const a = document.createElement('a');
            a.style.display = 'block';
            a.textContent = `${sampleIndex}_${track.video ? 'video' : 'audio'}.mp4`;
            a.download = `${sampleIndex}_${track.video ? 'video' : 'audio'}.mp4`;
            a.href = URL.createObjectURL(new Blob([buffer]));
            document.body.append(a);

            if (track.audio) {
                // decodeAudio(buffer, 0);
            }
        };

        const result = isoFile.initializeSegmentation();
        for (const item of result) {
            const track = info.tracks.find(x => x.id === item.id)!;

            controller.appendMediaSegment({
                type: track.video ? 'video' : 'audio',
                data: item.buffer,
            });

            const a = document.createElement('a');
            a.style.display = 'block';
            a.textContent = `0_${track.video ? 'video' : 'audio'}.mp4`;
            a.download = `0_${track.video ? 'video' : 'audio'}.mp4`;
            a.href = URL.createObjectURL(new Blob([item.buffer]));
            document.body.append(a);

            // if (track.audio) {
            //     decodeAudio(item.buffer, 0);
            // }
        }

        isoFile.start();
    };

    let offset = 0;
    const chunkSize = 4 * 1024 * 1024;

    const fileReader = new FileReader();
    fileReader.onload = () => {
        const buffer = fileReader.result as ArrayBuffer;
        (buffer as any).fileStart = offset;

        offset = isoFile.appendBuffer(buffer);

        if (!bufferFull) {
            readBlock();
        }
    };

    function readBlock() {
        if (offset >= file.size) {
            return;
        }

        if (fileReader.readyState === FileReader.LOADING) {
            return;
        }

        console.log(`reading ${offset} to ${offset + chunkSize}`);
        const slice = file.slice(offset, offset + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    }
    readBlock();
}
