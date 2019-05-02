import RawResampleAudioWorker, { ResampleAudioWorker } from './resample-audio.worker';
import { proxy } from 'comlinkjs';
// @ts-ignore
import debounce from 'debounce';

const resampleAudioWorker = proxy<ResampleAudioWorker>(new RawResampleAudioWorker());

class AsyncSemaphore {
    private _queue: Array<() => void> = [];

    public wait(): Promise<void> {
        const promise = new Promise<void>(resolve => {
            this._queue.push(resolve);
        });
        return promise;
    }

    public notify() {
        if (this._queue.length === 0) {
            return;
        }

        this._queue.shift()!();
    }
}

class ConditionVariable {
    private static resolvedPromise = Promise.resolve();

    private _queue: Array<() => void> = [];

    private _condition: () => boolean;

    constructor(condition: () => boolean) {
        this._condition = condition;
    }

    public wait(): Promise<void> {
        if (this._condition()) {
            return ConditionVariable.resolvedPromise;
        }

        const promise = new Promise<void>(resolve => {
            this._queue.push(resolve);
        });
        return promise;
    }

    public notify(): boolean {
        if (this._queue.length === 0) {
            return false;
        }

        if (!this._condition()) {
            return false;
        }

        this._queue.shift()!();
        return true;
    }
}

function createAdtsFrame(samples: MP4Box.Sample[]): Uint8Array {
    /*
     * Source: https://wiki.multimedia.cx/index.php?title=ADTS
     *
     *   Letter  Length (bits)  Description
     *   A       12             syncword 0xFFF, all bits must be 1
     *   B       1              MPEG Version: 0 for MPEG-4, 1 for MPEG-2
     *   C       2              Layer: always 0
     *   D       1              protection absent, Warning, set to 1 if there is no CRC and 0 if there is CRC
     *   E       2              profile, the MPEG-4 Audio Object Type minus 1
     *   F       4              MPEG-4 Sampling Frequency Index (15 is forbidden)
     *   G       1              private bit, guaranteed never to be used by MPEG, set to 0 when encoding, ignore when decoding
     *   H       3              MPEG-4 Channel Configuration (in the case of 0, the channel configuration is sent via an inband PCE)
     *   I       1              originality, set to 0 when encoding, ignore when decoding
     *   J       1              home, set to 0 when encoding, ignore when decoding
     *   K       1              copyrighted id bit, the next bit of a centrally registered copyright identifier, set to 0 when encoding, ignore when decoding
     *   L       1              copyright id start, signals that this frame's copyright id bit is the first bit of the copyright id, set to 0 when encoding, ignore when decoding
     *   M       13             frame length, this value must include 7 or 9 bytes of header length: FrameLength = (ProtectionAbsent == 1 ? 7 : 9) + size(AACFrame)
     *   O       11             Buffer fullness
     *   P       2              Number of AAC frames (RDBs) in ADTS frame minus 1, for maximum compatibility always use 1 AAC frame per ADTS frame
     *   Q       16             CRC if protection absent is 0
     */

    const totalLength = samples.reduce((value, item) => value + item.size + 7, 0);
    const frame = new Uint8Array(totalLength);

    let index = 0;
    for (const sample of samples) {
        frame[index++] = 0xFF; // AAAA_AAAA 0b1111_1111
        frame[index++] = 0xF1; // AAAA_BCCD 0b1111_0001

        // TODO: fill sampling frequency FFFF
        frame[index++] = 0x4C; // EEFF_FFGH 0b0100_1100

        // TODO: fill channel count HH
        frame[index++] = 0x80; // HHIJ_KLMM 0b1000_0000

        const size = sample.size + 7;
        frame[index++] = size >> 3; // MMMM_MMMM 0bXXXX_XXXX

        // O_OOOO: buffer fullness, 0b0_0111 means VBR, not applicable
        frame[index++] = (size & 0x07) << 5 | 0x7 // MMMO_OOOO 0bXXX0_0111

        frame[index++] = 0xFF; // OOOO_OOPP 0b0000_0000
        frame.set(new Uint8Array(sample.data), index);

        index += sample.size;
    }

    return frame;
}

const video = document.createElement('video');
video.width = 500;
video.ontimeupdate = debounce(() => {
    time = video.currentTime;
    input.valueAsNumber = time / video.duration;
    clock.textContent = `${time}/${duration}`;
}, 33, true);
document.body.append(video);

const canvas = document.createElement('canvas');
canvas.width = 500;
canvas.height = 200;
document.body.appendChild(canvas);

const controls = document.createElement('div');
document.body.appendChild(controls);

const play = document.createElement('button');
play.textContent = 'play/pause';
play.onclick = () => {
    video.paused ? video.play() : video.pause();
};
controls.append(play);

const input = document.createElement('input');
input.type = 'range';
input.min = '0';
input.max = '1';
input.step = '0.000001';
input.valueAsNumber = 0;
controls.appendChild(input);

const clock = document.createElement('div');
document.body.appendChild(clock);

let time = 0;
let duration = 0;
clock.textContent = `${time}/${duration}`;

export default function sample(file: File): void {
    video.src = URL.createObjectURL(file);
    video.onplaying = () => {
        isoFile.start();
    };
    video.onpause = () => {
        isoFile.stop();
    };

    var canvasCtx = canvas.getContext('2d')!;
    if (canvasCtx === null) {
        return;
    }

    input.onchange = () => {
        const requested = input.valueAsNumber * duration;
        if (Math.abs(requested - time) < 0.1) {
            return;
        }

        console.log(`seek to ${requested}`);

        ({ time, offset } = isoFile.seek(input.valueAsNumber * duration));
        clock.textContent = `${time}/${duration}`;
        console.log(`readBlock because seeked`);
        readBlock();
        video.currentTime = time;
        // isoFile.start();
    };

    const audioContext = new AudioContext();
    const source = audioContext.createBufferSource();
    source.connect(audioContext.destination);

    async function decodeAudio(buffer: ArrayBuffer, position: number) {
        try {
            const decoded = await audioContext.decodeAudioData(buffer);

            const channels: Float32Array[] = [];
            for (let i = 0; i < decoded.numberOfChannels; i++) {
                channels[i] = decoded.getChannelData(i);
            }
            const resampled = await resampleAudioWorker.resampleAudio(channels, 500);
            const bufferLength = resampled.length;

            canvasCtx.fillStyle = 'rgb(0, 0, 0)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = 'rgb(76, 243, 165)';

            canvasCtx.beginPath();

            var sliceWidth = canvas.width * 1.0 / bufferLength;
            var x = 0;

            for (var i = 0; i < bufferLength; i++) {
                var v = (resampled[i] * 2 + 1) / 2; // [-1, 1] to [0, 1]
                var y = v * canvas.height;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        } catch (err) {
            console.error(err);
        }
    }

    let decoding = false;
    const decodingLock = new ConditionVariable(() => !decoding);

    let isoFile = MP4Box.createFile();
    isoFile.onRequestMoreData = async (position) => {
        console.log(`readBlock because requested to do`);
        offset = position;
        readBlock();
    };

    isoFile.onReady = (info) => {
        duration = info.duration / info.timescale;
        clock.textContent = `${time}/${duration}`;

        for (const track of info.tracks) {
            if (track.audio) {
                isoFile.setExtractionOptions(track.id, track, { nbSamples: 100 });
            }
        }

        isoFile.onSamples = async (id, track: MP4Box.TrackInfo, samples) => {
            await decodingLock.wait();
            decoding = true;

            const adts = createAdtsFrame(samples);
            await decodeAudio(adts.buffer, 0);

            // isoFile.stop();

            decoding = false;

            if (!decodingLock.notify()) {
                console.log(`readBlock because all samples have been processed`);
                readBlock();
            }
        };

        video.play();
    };

    let offset = 0;
    const chunkSize = 4 * 1024 * 1024;

    const fileReader = new FileReader();
    fileReader.onload = async () => {
        const buffer = fileReader.result as ArrayBuffer;
        (buffer as any).fileStart = offset;

        offset = isoFile.appendBuffer(buffer);
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
