export interface ScssBundleConfig {
    bundlerOptions: BundlerOptions;
}

export interface BundlerOptions {
    entryFile?: string;
    outFile?: string;
    rootDir?: string;
    ignoreImports?: string[];
    includePaths?: string[];
    dedupeGlobs?: string[];
    watch?: boolean;
    logLevel?: string;
}

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
    // Child imports (if any)
    imports?: BundleResult[];
    tilde?: boolean;
    deduped?: boolean;
    // Full path of the file
    filePath: string;
    bundledContent?: string;
    found: boolean;
    ignored?: boolean;
}
