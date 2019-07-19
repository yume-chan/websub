export class LineReader {
    private _lines: string[];

    private _index: number = 0;

    public get isEof(): boolean { return this._index === this._lines.length; }

    public constructor(text: string) {
        this._lines = text.split(/\r?\n/);
    }

    public next(): string {
        return this._lines[this._index++].trim();
    }
}

export interface AssValue {
    parse(input: string): any;

    stringify(value: any): string;
}

export const AssString: AssValue = {
    parse(input) { return input; },
    stringify(value: string) { return value; }
}

export const AssBoolean: AssValue = {
    parse(input) { return input === '-1'; },
    stringify(value: boolean) { return value ? '-1' : '0'; }
}

export const AssNumber: AssValue = {
    parse(input) { return Number.parseFloat(input); },
    stringify(value: number) { return value.toString(); }
}

const ensure = {
    range(name: string, value: number, min: number, max: number): number {
        if (value < min || value > max) {
            throw new TypeError(`invalid value for ${name}. value must be in range of '${min}' to '${max}', but got '${value}'`);
        }
        return value;
    },

    regexp(name: string, value: string, regexp: RegExp, format: string): string[] {
        const matches = value.match(regexp);
        if (matches === null) {
            throw new Error(`invalid value for ${name}, value must be '${format}', but got '${value}'`);
        }
        return matches.slice(1);
    }
}

export class AssTime {
    public static parse(value: string): AssTime {
        const matches = ensure.regexp('AssTime.parse', value, /(\d+):(\d{2}):(\d{2})\.(\d{2})/, '0:00:00.00');
        return new AssTime(
            Number.parseInt(matches[3], 10),
            Number.parseInt(matches[2], 10),
            Number.parseInt(matches[1], 10),
            Number.parseInt(matches[0], 10),
        );
    }

    public static stringify(value: AssTime): string {
        return value.toString();
    }

    public hours: number;

    private _minutes!: number;
    public get minutes(): number { return this._minutes; }
    public set minutes(value: number) { this._minutes = ensure.range('minutes', value, 0, 59); }

    private _seconds!: number;
    public get seconds(): number { return this._seconds; }
    public set seconds(value: number) { this._seconds = ensure.range('seconds', value, 0, 59); }

    private _hundredthSeconds!: number;
    public get hundredSeconds(): number { return this._hundredthSeconds; }
    public set hundredSeconds(value: number) { this._hundredthSeconds = ensure.range('hundredSeconds', value, 0, 99); }

    public constructor(hundredSeconds: number, seconds: number = 0, minutes: number = 0, hours: number = 0) {
        this.hundredSeconds = hundredSeconds;
        this.seconds = seconds;
        this.minutes = minutes;
        this.hours = hours;
    }

    public toSeconds() {
        return this.hours * 3600 + this._minutes * 60 + this._seconds + this._hundredthSeconds / 100;
    }

    public toString() {
        return `${this.hours}:${this._minutes.toString().padStart(2, '0')}:${this._seconds.toString().padStart(2, '0')}.${this._hundredthSeconds.toString().padStart(2, '0')}`
    }
}

function toHex(value: number) {
    return value.toString(16).toLowerCase().padStart(2, '0');
}

export class AssColor {
    public static parse(value: string): AssColor {
        try {
            const matches = ensure.regexp('AssColor.parse', value, /&H([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})?/i, '&HBBGGRR or &HAABBGGRR');

            const a = typeof matches[4] === 'string' ? Number.parseInt(matches.shift()!, 16) : 0;
            const b = Number.parseInt(matches[0], 16);
            const g = Number.parseInt(matches[1], 16);
            const r = Number.parseInt(matches[2], 16);

            return new AssColor(b, g, r, a);
        } catch (e) {
            // Aegisub treat all invalid value as black
            return new AssColor(0, 0, 0, 0);
        }
    }

    public static stringify(value: AssColor): string {
        return value.toString();
    }

    private _a!: number;
    public get a(): number { return this._a; }
    public set a(value: number) { this._a = ensure.range('a', value, 0, 255); }

    private _b!: number;
    public get b(): number { return this._b; }
    public set b(value: number) { this._b = ensure.range('b', value, 0, 255); }

    private _g!: number;
    public get g(): number { return this._g; }
    public set g(value: number) { this._g = ensure.range('g', value, 0, 255); }

    private _r!: number;
    public get r(): number { return this._r; }
    public set r(value: number) { this._r = ensure.range('r', value, 0, 255); }

    public constructor(b: number, g: number, r: number, a: number = 0) {
        this.a = a;
        this.b = b;
        this.g = g;
        this.r = r;
    }

    public toString() {
        let value = `${toHex(this._b)}${toHex(this._g)}${toHex(this._r)}`;

        if (this._a !== 0) {
            value = `${toHex(this._a)}${value}`;
        }

        return `&H${value}`;
    }
}

function splitWithLimit(text: string, splitter: string, count: number): string[] {
    const result: string[] = new Array(count);
    let index = 0;
    let start = 0;

    do {
        const end = text.indexOf(splitter, start);
        if (end === -1) {
            throw new Error('invalid format');
        }

        result[index] = text.substring(start, end).trim();
        index += 1;
        start = end + 1;
    }
    while (index < count - 1);

    result[index] = text.substring(start).trim();
    return result;
}

export class AssObjectSection implements AssSection {
    private _keys: { [key: string]: AssValue };

    public constructor(keys: { [key: string]: AssValue }) {
        this._keys = keys;
    }

    parse(name: string, reader: LineReader, file: any): void {
        const result: any = {};
        file[name] = result;

        while (!reader.isEof) {
            const line = reader.next();
            if (line === '') {
                return result;
            }

            if (line.startsWith(';')) {
                continue;
            }

            let [key, value] = splitWithLimit(line, ':', 2);
            if (typeof this._keys[key] !== 'undefined') {
                value = this._keys[key].parse(value);
            }

            result[key] = value;
        }
    }

    stringify(input: any): string {
        let result: string[] = [];

        for (let [key, value] of Object.entries(input)) {
            if (typeof this._keys[key] !== 'undefined') {
                value = this._keys[key].stringify(value);
            }

            result.push(`${key}: ${value}`);
        }

        return result.join('\r\n');
    }
}

export interface AssSection {
    parse(name: string, reader: LineReader, file: any): void;

    stringify(input: any): string;
}

export class AssArraySection implements AssSection {
    private _keys: { [key: string]: AssValue };

    public constructor(keys: { [key: string]: AssValue }) {
        this._keys = keys;
    }

    public parse(name: string, reader: LineReader, file: any): void {
        const result: any[] = [];
        file[name] = result;

        let format: any;

        while (!reader.isEof) {
            const line = reader.next();
            if (line === '') {
                break;
            }

            if (line.startsWith(';')) {
                continue;
            }

            const [key, value] = splitWithLimit(line, ':', 2);

            if (key === 'Format') {
                format = value.split(',').map(x => x.trim());
                continue;
            }

            if (typeof format === 'undefined') {
                throw new Error('invalid format');
            }

            const object: any = { type: key };
            result.push(object);

            const list = splitWithLimit(value, ',', format.length);
            list.forEach((item, index) => {
                const key = format[index];
                if (typeof this._keys[key] !== 'undefined') {
                    item = this._keys[key].parse(item);
                }

                object[key] = item;
            });
        }
    }

    public stringify(input: any[]): string {
        const result: string[] = [];
        const keys: string[] = [];

        for (const key of Object.keys(input[0])) {
            if (key !== 'type') {
                keys.push(key);
            }
        }
        result.push(`Format: ${keys.join(',')}`);

        for (const item of input) {
            const line: string[] = [];

            for (const key of keys) {
                const value = item[key];

                if (typeof this._keys[key] !== 'undefined') {
                    line.push(this._keys[key].stringify(value));
                } else {
                    line.push(value);
                }
            }

            result.push(`${item.type}: ${line.join(',')}`);
        }

        return result.join('\r\n');
    }
}

const AssUnknownSection = new AssObjectSection({});

namespace Ass {
    export function parse(input: string, definition: { [key: string]: AssSection } = defaultDefinition): any {
        const reader = new LineReader(input);
        const result: any = {};

        while (!reader.isEof) {
            const line = reader.next();
            if (line === '') {
                continue;
            }

            if (!line.startsWith('[')) {
                throw new Error('invalid format');
            }

            const name = line.substring(1, line.length - 1);

            if (typeof definition[name] !== 'undefined') {
                definition[name].parse(name, reader, result);
            } else {
                AssUnknownSection.parse(name, reader, result);
            }
        }

        return result;
    }

    export function stringify(input: any, definitions: { [key: string]: AssSection | undefined } = defaultDefinition): string {
        const result: string[] = [];

        for (const [name, value] of Object.entries(input)) {
            result.push(`[${name}]`);

            const definition = definitions[name];
            if (typeof definition !== 'undefined') {
                result.push(definition.stringify(value));
            } else {
                result.push(AssUnknownSection.stringify(value));
            }

            result.push('');
        }

        return result.join('\r\n');
    }

    export const defaultDefinition: { [key: string]: AssSection } = {
        'Script Info': new AssObjectSection({
            'Title': AssString,
            'Original Script': AssString,
            'Original Translation': AssString,
            'Original Editing': AssString,
            'Original Timing': AssString,
            'Script Updated By': AssString,
            'Update Details': AssString,
            'ScriptType': AssString,
            'Collisions': AssString,
            'PlayResY': AssNumber,
            'PlayResX': AssNumber,
            'PlayDepth': AssNumber,
            'Timer': AssNumber,
            'WrapStyle': AssNumber,
        }),
        'V4+ Styles': new AssArraySection({
            'Name': AssString,
            'Fontname': AssString,
            'Fontsize': AssNumber,
            'PrimaryColour': AssColor,
            'SecondaryColour': AssColor,
            'OutlineColour': AssColor,
            'BackColour': AssColor,
            'Bold': AssBoolean,
            'Italic': AssBoolean,
            'Underline': AssBoolean,
            'StrikeOut': AssBoolean,
            'ScaleX': AssNumber,
            'ScaleY': AssNumber,
            'Spacing': AssNumber,
            'Angle': AssNumber,
            'BorderStyle': AssNumber,
            'Outline': AssNumber,
            'Shadow': AssNumber,
            'Alignment': AssNumber,
            'MarginL': AssNumber,
            'MarginR': AssNumber,
            'MarginV': AssNumber,
        }),
        'Events': new AssArraySection({
            'Marked': AssNumber,
            'Layer': AssNumber,
            'Start': AssTime,
            'End': AssTime,
            'Style': AssString,
            'Name': AssString,
            'MarginL': AssNumber,
            'MarginR': AssNumber,
            'MarginV': AssNumber,
            'Effect': AssString,
            'Text': AssString,
        }),
    }
}

export default Ass;
