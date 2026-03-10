export declare function createReadStreamAsync(fileEntry: MultipartFileEntry): AsyncGenerator<Uint8Array>;
export interface MultipartFileEntry {
    sha512: string;
    path: string;
    type: string | null;
    size: number;
}
export declare const multipartContentType = "multipart/form-data; boundary=----formdata-eas-cli";
type OnProgressUpdateCallback = (progress: number) => void;
export declare function createMultipartBodyFromFilesAsync(entries: MultipartFileEntry[], onProgressUpdate?: OnProgressUpdateCallback): AsyncGenerator<Uint8Array>;
export {};
