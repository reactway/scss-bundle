export interface Registry {
    [id: string]: string | undefined;
}
export interface ImportData {
    importString: string;
    path: string;
    fullPath: string;
    found: boolean;
}
export interface BundleResult {
    imports?: BundleResult[];
    filePath: string;
    content?: string;
    found: boolean;
}
export declare class Bundler {
    static Bundle(file: string, filesRegistry?: Registry): Promise<BundleResult>;
    static BundleAll(files: string[], filesRegistry?: Registry): Promise<BundleResult[]>;
    private static bundle(filePath, content, filesRegistry?);
}
