#!/usr/bin/env node
import * as fs from "mz/fs";
import * as path from "path";
import * as os from "os";
import * as archy from "archy";

import * as sass from "node-sass";
import * as mkdirp from "mkdirp";

import * as Contracts from "./contracts";
import { Bundler, BundleResult } from "./bundler";
import { argv } from "./arguments";

const DEFAULT_CONFIG_NAME = "scss-bundle.config.json";

class Cli {
    constructor(argv: Contracts.Arguments) {
        let configFileName = argv.config || DEFAULT_CONFIG_NAME;
        this.main(configFileName, argv);
    }


    private async main(configFileName: string, argv: Contracts.Arguments) {
        let fullConfigPath = path.join(process.cwd(), configFileName);
        let configExists = await this.configExists(fullConfigPath);

        if (argv.dest != null && argv.entry != null && argv.config == null) {
            this.bundle({
                entry: argv.entry,
                dest: argv.dest
            });
            return;
        }

        if ((argv.dest == null || argv.entry == null) &&
            argv.config == null) {
            this.exitWithError("[Error] `Dest` or `Entry` argument is missing.");
            return;
        }


        if (configExists) {
            try {
                let config = await this.readConfigFile(configFileName) as Contracts.Config;
                console.info("Using config:", fullConfigPath);
                this.bundle(this.getConfig(config, argv));
            }
            catch (err) {
                this.exitWithError(`[Error] Config file ${configFileName} is not valid.`);
            }
            return;
        }

        this.exitWithError(`[Error] Config file ${configFileName} was not found.`);
    }

    private async bundle(config: Contracts.Config) {
        try {
            let bundleResult = await Bundler.Bundle(config.entry);

            let archyData = this.getArchyData(bundleResult, path.dirname(config.entry));
            console.info(archy(archyData));

            if (bundleResult.content == null) {
                this.exitWithError(`[Error] An error has occured:${os.EOL} Concatenation result has no content.`)
                return;
            }
            try {
                await this.renderScss(bundleResult.content);
            }
            catch (scssError) {
                this.exitWithError(`[Error] There is an error in your styles:${os.EOL}${scssError}`)
            }

            // Ensure the directory exists
            mkdirp.sync(path.dirname(config.dest));

            await fs.writeFile(config.dest, bundleResult.content);

            let fullPath = path.resolve(config.dest);
            console.info(`[Done] Bundled into:${os.EOL}${fullPath}.`);
        }
        catch (error) {
            this.exitWithError(`[Error] An error has occured:${os.EOL}${error}`);
        }
    }

    private async renderScss(content: string) {
        return new Promise((resolve, reject) => {
            sass.render({
                data: content
            }, (error, result) => {
                if (error == null) {
                    resolve();
                } else {
                    reject(`${error.message} on line (${error.line}, ${error.column})`);
                }
            });
        })
    }

    private getArchyData(bundleResult: BundleResult, sourceDirectory?: string) {
        if (sourceDirectory == null) {
            sourceDirectory = process.cwd();
        }
        let archyData: archy.Data = {
            label: path.relative(sourceDirectory, bundleResult.filePath)
        };

        if (!bundleResult.found) {
            archyData.label += ` [NOT FOUND]`;
        }

        if (bundleResult.imports != null) {
            archyData.nodes = bundleResult.imports.map(x => {
                if (x != null) {
                    return this.getArchyData(x, sourceDirectory);
                }
                return "";
            });
        }
        return archyData;
    }

    private getConfig(config: Contracts.Config, argv: Contracts.Arguments) {
        if (argv.entry != null) {
            config.entry = argv.entry;
        }
        if (argv.dest != null) {
            config.dest = argv.dest;
        }

        return config;
    }

    private async configExists(fullPath: string) {
        try {
            await fs.access(fullPath, fs.constants.F_OK);
            return true;
        }
        catch (err) {
            return false;
        }
    }

    private async readConfigFile(fullPath: string) {
        let data = await fs.readFile(fullPath, "utf8");
        let configData: Contracts.Config;
        configData = JSON.parse(data);
        return configData;
    }

    private exitWithError(message: string) {
        console.error(message);
        process.exit(1);
    }
}

new Cli(argv);
