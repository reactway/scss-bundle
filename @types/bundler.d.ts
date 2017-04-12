export interface FileRegistry {
    [id: string]: string | undefined;
}
export interface ImportData {
    importString: string;
    path: string;
    fullPath: string;
    found: boolean;
}
export interface BundleResult {
    rootBundleResult: BundleResult | undefined;
    imports?: BundleResult[];
    filePath: string;
    bundledContent?: string;
    found: boolean;
    usedImports?: string[];
}
export declare class Bundler {
    static Bundle(file: string, fileRegistry?: FileRegistry): Promise<BundleResult>;
    static BundleAll(files: string[], fileRegistry?: FileRegistry): Promise<BundleResult[]>;
    private static bundle(filePath, content, fileRegistry?, rootBundleResult?);
}
