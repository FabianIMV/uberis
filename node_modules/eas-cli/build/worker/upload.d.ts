import { HeadersInit, RequestInit, Response } from 'node-fetch';
import { AssetFileEntry } from './assets';
export type UploadPayload = {
    filePath: string;
} | {
    asset: AssetFileEntry;
} | {
    multipart: AssetFileEntry[];
};
export interface UploadRequestInit {
    baseURL: string | URL;
    method?: string;
    headers?: HeadersInit;
    signal?: AbortSignal;
}
export interface UploadResult {
    payload: UploadPayload;
    response: Response;
}
type OnProgressUpdateCallback = (progress: number) => void;
export declare function uploadAsync(init: UploadRequestInit, payload: UploadPayload, onProgressUpdate?: OnProgressUpdateCallback): Promise<UploadResult>;
export declare function callUploadApiAsync(url: string | URL, init?: RequestInit): Promise<unknown>;
export interface UploadPending {
    payload: UploadPayload;
    progress: number;
}
export declare function batchUploadAsync(init: UploadRequestInit, payloads: UploadPayload[], onProgressUpdate?: OnProgressUpdateCallback): AsyncGenerator<UploadPending>;
interface UploadProgressBar {
    update(progress: number): void;
    stop(): void;
}
export declare function createProgressBar(label?: string): UploadProgressBar;
export {};
