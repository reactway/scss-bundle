export interface Config {
    Entry: string;
    Destination: string;
    Verbosity: Verbosity;
    DedupePaths: string[];
}

export enum Verbosity {
    None = 0,
    Errors = 8,
    Verbose = 256
}

export interface ArgumentsValues {
    config: string;
    entry: string;
    dest: string;
    verbosity: Verbosity;
    dedupePaths?: string[];
}
