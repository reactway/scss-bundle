export interface Config {
    entry: string;
    dest: string;
}

export interface Arguments {
    build: boolean;
    config: string;
    entry: string;
    dest: string;
    help: boolean;
    version: boolean;
}