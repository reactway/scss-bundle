#!/usr/bin/env node
import * as fs from 'fs';
import * as Contracts from './contracts';
import Bundle from './bundle';
import argv from './arguments';
import * as path from 'path';

class Cli {
    private config: Contracts.Config;

    constructor(argv: Contracts.Arguments) {
        if (argv.config == null) {
            this.config = {
                entry: argv.entry,
                dest: argv.dest
            }
        } else {
            this.config = this.getConfig(argv.config);
        }
        new Bundle(this.config)
            .Bundle()
            .then(() => {
                console.info(`[Done] Bundling done. Destination: ${this.config.dest}.`);
            })
            .catch((error) => {
                console.error(`[Error] Bundling done with errors. ${error}`);
                process.exit(1);
            });
    }

    private getConfig(filePath: string) {
        let fullPath = path.join(process.cwd(), filePath);
        try {
            fs.accessSync(fullPath, fs.F_OK);
            return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        } catch (e) {
            if (typeof filePath === 'boolean') {
                console.error(`[Error] Config file path is not set.`);
            } else {
                console.error(`[Error] Config ${filePath} was not found.`);
            }
            process.exit(1);
        }

    }
}

new Cli(argv);