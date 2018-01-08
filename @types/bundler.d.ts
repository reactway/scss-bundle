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
    imports?: BundleResult[];
    deduped?: boolean;
    filePath: string;
    bundledContent?: string;
    found: boolean;
}
export declare class Bundler {
    private fileRegistry;
    private usedImports;
    private importsByFile;
    constructor(fileRegistry?: FileRegistry);
    BundleAll(files: string[], dedupeGlobs: string[]): Promise<BundleResult[]>;
    Bundle(file: string, dedupeGlobs?: string[], includePaths?: string[]): Promise<BundleResult>;
    private bundle(filePath, content, dedupeFiles, includePaths);
    private removeImportsFromComments(text);
    private resolveImport(importData, includePaths);
    private globFilesOrEmpty(globsList);
}
