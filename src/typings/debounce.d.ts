declare module 'debounce' {
    export default function debounce<T>(func: T, timeout: number, immediate?: boolean): T;
}
