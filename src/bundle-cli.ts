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
    Config: Contracts.Config;

    constructor(protected ArgumentValues: Contracts.ArgumentsValues) {
        this.main(this.ArgumentValues);
    }

    private async main(argumentValues: Contracts.ArgumentsValues) {
        let config: Contracts.Config;

        // Resolve config file path
        let fullConfigPath = path.resolve(argumentValues.config || DEFAULT_CONFIG_NAME);

        let verbosity: Contracts.Verbosity = Contracts.Verbosity.Verbose;

        // Resolve config
        if (await this.configExists(fullConfigPath)) {
            try {
                let readConfig = await this.readConfigFile(fullConfigPath);
                verbosity = this.resolveVerbosity(argumentValues.verbosity || readConfig.verbosity);
                config = {
                    Entry: argumentValues.entry || readConfig.entry,
                    Destination: argumentValues.dest || readConfig.dest,
                    Verbosity: verbosity
                };

                if (verbosity === Contracts.Verbosity.Verbose) {
                    console.info("Using config file:", fullConfigPath);
                }
            } catch (err) {
                this.exitWithError(`[Error] Config file ${fullConfigPath} is not valid.`);
                return;
            }
        } else if (argumentValues.entry != null && argumentValues.dest != null) {
            verbosity = this.resolveVerbosity(argumentValues.verbosity);
            config = {
                Entry: argumentValues.entry,
                Destination: argumentValues.dest,
                Verbosity: verbosity
            };
        } else {
            this.exitWithError("[Error] Entry and destination arguments are missing and no config was found.");
            return;
        }

        if (config.Verbosity === Contracts.Verbosity.Verbose) {
            console.info("Using config:");
            console.info(JSON.stringify(config, null, 4));
        }

        this.Config = config;

        // Bundle the styles
        this.bundle();
    }

    private async bundle() {
        try {
            let bundleResult = await Bundler.Bundle(this.Config.Entry);

            if (!bundleResult.found) {
                if (this.Config.Verbosity !== Contracts.Verbosity.None) {
                    let resolvedPath = path.resolve(bundleResult.filePath);
                    let errorMessage = `[Error] An error has occured${os.EOL}`;
                    errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
                    errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
                    this.exitWithError(errorMessage);
                }
            }

            let archyData = this.getArchyData(bundleResult, path.dirname(this.Config.Entry));
            if (this.Config.Verbosity === Contracts.Verbosity.Verbose) {
                console.info(archy(archyData));
            }

            if (bundleResult.content == null) {
                if (this.Config.Verbosity !== Contracts.Verbosity.None) {
                    this.exitWithError(`[Error] An error has occured${os.EOL}Concatenation result has no content.`);
                }
                return;
            }
            try {
                await this.renderScss(bundleResult.content);
            } catch (scssError) {
                this.exitWithError(`[Error] There is an error in your styles:${os.EOL}${scssError}`);
            }

            // Ensure the directory exists
            mkdirp.sync(path.dirname(this.Config.Destination));

            await fs.writeFile(this.Config.Destination, bundleResult.content);

            let fullPath = path.resolve(this.Config.Destination);
            if (this.Config.Verbosity === Contracts.Verbosity.Verbose) {
                console.info(`[Done] Bundled into:${os.EOL}${fullPath}`);
            }
        } catch (error) {
            if (this.Config.Verbosity !== Contracts.Verbosity.None) {
                this.exitWithError(`[Error] An error has occured${os.EOL}${error}`);
            }
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
        });
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

    private resolveVerbosity(verbosity: any) {
        // Convert given value to an appropriate Verbosity enum value.
        // 'as any as number' is used because TypeScript thinks 
        //  that we cast string to number, even though we get a number there
        return Contracts.Verbosity[verbosity] as any as number;
    }

    private async configExists(fullPath: string) {
        try {
            await fs.access(fullPath, fs.constants.F_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    private async readConfigFile(fullPath: string): Promise<any> {
        let data = await fs.readFile(fullPath, "utf8");
        return JSON.parse(data);
    }

    private exitWithError(message: string) {
        if (this.Config.Verbosity !== Contracts.Verbosity.None) {
            console.error(message);
        }
        process.exit(1);
    }
}

new Cli(argv);
