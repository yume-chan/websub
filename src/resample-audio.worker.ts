import { expose } from 'comlinkjs';

export interface ResampleAudioWorker {
    resampleAudio(channel: Float32Array[], count: number): Float32Array;
}

function resampleAudio(channel: Float32Array[], count: number): Float32Array {
    const result = new Float32Array(count);
    const inputLength = channel[0].length;
    const skip = Math.floor(channel[0].length / count);

    let to = 0;
    for (let from = 0; from < inputLength; from += skip) {
        const sum = channel.reduce((value, item) => value + item[from], 0);
        result[to] = sum / channel.length;
        to += 1;
    }

    return result;
}

const worker: ResampleAudioWorker = {
    resampleAudio,
}
expose(worker, self);

declare interface WorkerLoaderExport {
    new(): Worker;
}
export default undefined as any as WorkerLoaderExport;
