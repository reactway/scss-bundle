export interface FileRegistry {
    [id: string]: string | undefined;
}
export interface ImportData {
    importString: string;
    tilde: boolean;
    path: string;
    fullPath: string;
    found: boolean;
    ignored?: boolean;
}
export interface BundleResult {
    imports?: BundleResult[];
    tilde?: boolean;
    deduped?: boolean;
    filePath: string;
    bundledContent?: string;
    found: boolean;
    ignored?: boolean;
}
export declare class Bundler {
    private fileRegistry;
    private readonly projectDirectory;
    private usedImports;
    private importsByFile;
    constructor(fileRegistry?: FileRegistry, projectDirectory?: string);
    BundleAll(files: string[], dedupeGlobs?: string[]): Promise<BundleResult[]>;
    Bundle(file: string, dedupeGlobs?: string[], includePaths?: string[], ignoredImports?: string[]): Promise<BundleResult>;
    private isExtensionExists(importName);
    private bundle(filePath, content, dedupeFiles, includePaths, ignoredImports);
    private replaceLastOccurance(content, importString, contentToReplace);
    private removeImportsFromComments(text);
    private resolveImport(importData, includePaths);
    private globFilesOrEmpty(globsList);
}
