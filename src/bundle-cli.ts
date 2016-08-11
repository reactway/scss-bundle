#!/usr/bin/env node
import * as fs from 'fs';
import * as Contracts from './contracts';
import Bundle from './bundle';
import argv from './arguments';
import * as path from 'path';

const DEFAULT_CONFIG_NAME = 'scss-bundle.config.json';

class Cli {
    constructor(argv: Contracts.Arguments) {
        let configFileName = argv.config || DEFAULT_CONFIG_NAME;
        this.main(configFileName, argv);
    }


    private async main(configFileName: string, argv: Contracts.Arguments) {
        let fullPath = path.join(process.cwd(), configFileName);
        let configExists = await this.checkConfigIsExist(fullPath);

        if (argv.dest != null && argv.entry != null && argv.config == null) {
            this.bundle({
                entry: argv.entry,
                dest: argv.dest
            });
        } else if ((argv.dest == null || argv.entry == null) && argv.config == null) {
            this.throwError('[Error] `Dest` or `Entry` argument is missing.');
        } else if (configExists) {
            let config = await this.readConfigFile(configFileName).catch((err) => {
                this.throwError(`[Error] Config file ${configFileName} is not valid.`);
            }) as Contracts.Config;

            console.info('Using config:', fullPath);
            this.bundle(this.getConfig(config, argv));
        } else {
            this.throwError(`[Error] Config file ${configFileName} was not found.`);
        }

    }

    private bundle(config: Contracts.Config) {
        new Bundle(config)
            .Bundle()
            .then(() => {
                console.info(`[Done] Bundling done. Destination: ${config.dest}.`);
            })
            .catch((error) => {
                this.throwError(`[Error] Bundling done with errors. ${error}`);
            });
    }

    private getConfig(config: Contracts.Config, argv: Contracts.Arguments) {
        if (argv.entry != null) config.entry = argv.entry;
        if (argv.dest != null) config.dest = argv.dest;
        return config;
    }

    private async checkConfigIsExist(fullPath: string) {
        return new Promise<boolean>((resolve, reject) => {
            fs.access(fullPath, fs.F_OK, async (err) => {
                if (!err) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    private async readConfigFile(fullPath: string) {
        return new Promise<Contracts.Config>((resolve, reject) => {
            fs.readFile(fullPath, 'utf8', (err, data) => {
                if (!err) {
                    let configData: Contracts.Config;
                    try {
                        configData = JSON.parse(data);
                        resolve(configData);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(err);
                }
            });
        });
    }

    private throwError(message: string) {
        console.error(message);
        process.exit(1);
    }
}

new Cli(argv);