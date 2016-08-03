#!/usr/bin/env node
import * as fs from 'fs';
import * as Contracts from './contracts';
import DefaultConfig from './default-config';
import * as optimist from 'optimist';
import Bundle from './bundle';
import * as path from 'path';

class Cli {
    private config: Contracts.Config;
    private package: { [id: string]: any } = {};

    constructor(args: optimist.Parser) {
        let packageJSONPath = path.join(__dirname, '../package.json');
        this.package = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
        let argv = args.argv as Contracts.Arguments;

        if (argv.help) {
            this.printVersion();
            console.info(args.help());
        } else if (argv.version) {
            this.printVersion();
        } else {
            if (argv.config == null) {
                args.demand(['e', 'd']);
                argv = args.argv;

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

    private printVersion() {
        console.info(`Version ${this.package['version']} \n`);
    }
}

let argv = optimist
    .options('h', {
        alias: 'help',
        describe: 'Prints this message.'
    })
    .options('v', {
        alias: 'version',
        describe: 'Prints version.'
    })
    .options('c', {
        alias: 'config',
        describe: 'Config file path.'
    })
    .options('e', {
        alias: 'entry',
        describe: 'Entry file.'
    })
    .options('d', {
        alias: 'dest',
        describe: 'Bundled file destination.'
    })
    .usage('Usage: scss-bundle [options]')
    .boolean(['h', 'v'])
    .string(['c', 'e', 'd']);

let commandLine = new Cli(argv);