import * as fs from "mz/fs";
import * as path from "path";
import * as os from "os";
import * as archy from "archy";
import * as prettyBytes from "pretty-bytes";

import * as nodeSass from "node-sass";
import * as mkdirp from "mkdirp";

import * as Contracts from "./contracts";
import { Bundler, BundleResult, FileRegistry } from "./bundler";

export class Launcher {
    constructor(private config: Contracts.Config) { }

    public async Bundle() {
        try {
            const fileRegistry: FileRegistry = {};
            let bundleResult = await Bundler.Bundle(this.config.Entry, this.config.DedupeGlobs, fileRegistry);

            if (!bundleResult.found) {
                if (this.config.Verbosity !== Contracts.Verbosity.None) {
                    const resolvedPath = path.resolve(bundleResult.filePath);
                    let errorMessage = `[Error] An error has occured${os.EOL}`;
                    errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
                    errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
                    this.exitWithError(errorMessage);
                }
            }

            if (this.config.Verbosity === Contracts.Verbosity.Verbose) {
                console.info("Imports tree:");
                const archyData = this.getArchyData(bundleResult, path.dirname(this.config.Entry));
                console.info(archy(archyData));
            }

            if (bundleResult.bundledContent == null) {
                if (this.config.Verbosity !== Contracts.Verbosity.None) {
                    this.exitWithError(`[Error] An error has occured${os.EOL}Concatenation result has no content.`);
                }
                return;
            }
            try {
                await this.renderScss(bundleResult.bundledContent);
            } catch (scssError) {
                this.exitWithError(`[Error] There is an error in your styles:${os.EOL}${scssError}`);
            }

            // Ensure the directory exists
            mkdirp.sync(path.dirname(this.config.Destination));

            await fs.writeFile(this.config.Destination, bundleResult.bundledContent);

            let fullPath = path.resolve(this.config.Destination);
            if (this.config.Verbosity === Contracts.Verbosity.Verbose) {
                console.info(`[Done] Bundled into:${os.EOL}${fullPath}`);
                console.info(`Total size       : ${prettyBytes(bundleResult.bundledContent.length)}`);
                console.info(`Saved by deduping: ${prettyBytes(this.countSavedBytesByDeduping(bundleResult, fileRegistry))}`);
            }
        } catch (error) {
            if (this.config.Verbosity !== Contracts.Verbosity.None) {
                this.exitWithError(`[Error] An error has occured${os.EOL}${error}`);
            }
        }
    }

    private async renderScss(content: string) {
        return new Promise((resolve, reject) => {
            nodeSass.render({
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
        if (bundleResult.deduped) {
            archyData.label += ` [DEDUPED]`;
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

    private countSavedBytesByDeduping(bundleResult: BundleResult, fileRegistry: FileRegistry) {
        let savedBytes = 0;
        const content = fileRegistry[bundleResult.filePath];
        if (bundleResult.deduped === true && content != null) {
            savedBytes = content.length;
        }
        if (bundleResult.imports != null && bundleResult.imports.length > 0) {
            for (const importResult of bundleResult.imports) {
                savedBytes += this.countSavedBytesByDeduping(importResult, fileRegistry);
            }
        }
        return savedBytes;
    }

    private exitWithError(message: string) {
        if (this.config.Verbosity !== Contracts.Verbosity.None) {
            console.error(message);
        }
        process.exit(1);
    }
}
