import * as minimist from 'minimist';
export interface Config {
    entry: string;
    dest: string;
}

export interface Arguments extends minimist.ParsedArgs{
    _: Array<string>;
    build: boolean;
    config: string;
    entry: string;
    dest: string;
    help: boolean;
    version: boolean;
}