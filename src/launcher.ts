import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import * as archy from "archy";
import * as prettyBytes from "pretty-bytes";

import * as nodeSass from "node-sass";

import * as Contracts from "./contracts";
import { Bundler, BundleResult, FileRegistry } from "./bundler";

export class Launcher {
    constructor(private config: Contracts.Config) {}

    public async Bundle(): Promise<void> {
        try {
            const fileRegistry: FileRegistry = {};
            const bundler = new Bundler(fileRegistry, this.config.ProjectDirectory);

            const bundleResult = await bundler.Bundle(
                this.config.Entry,
                this.config.DedupeGlobs,
                this.config.IncludePaths,
                this.config.IgnoredImports
            );

            // Entry file searching.
            if (!bundleResult.found) {
                if (this.config.Verbosity !== Contracts.Verbosity.None) {
                    const resolvedPath = path.resolve(bundleResult.filePath);
                    let errorMessage = `[Error] An error has occured${os.EOL}`;
                    errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
                    errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
                    this.exitWithError(errorMessage);
                }
            }

            // Imports searching. TODO: Remake this in major version.
            this.bundleResultForEach(bundleResult, result => {
                if (
                    !result.found &&
                    result.tilde &&
                    this.config.ProjectDirectory == null &&
                    this.config.Verbosity !== Contracts.Verbosity.None
                ) {
                    const resolvedPath = path.resolve(bundleResult.filePath);
                    let errorMessage = `[Error] An error has occured${os.EOL}`;
                    errorMessage += `Import file was not found:${os.EOL}${result.filePath}${os.EOL}`;
                    errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}${os.EOL}`;
                    errorMessage += `NOTICE: Found tilde import, but project location was not specified.${os.EOL}`;
                    this.exitWithError(errorMessage);
                }
            });

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
            fs.mkdirpSync(path.dirname(this.config.Destination));

            await fs.writeFile(this.config.Destination, bundleResult.bundledContent);

            const fullPath = path.resolve(this.config.Destination);
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

    private async renderScss(content: string): Promise<{}> {
        return new Promise((resolve, reject) => {
            nodeSass.render(
                {
                    data: content,
                    importer: this.tildeImporter
                },
                (error, result) => {
                    if (error != null) {
                        reject(`${error.message} on line (${error.line}, ${error.column})`);
                    }
                    resolve(result);
                }
            );
        });
    }

    private tildeImporter: nodeSass.Importer = (url: string) => {
        if (url[0] === "~") {
            const filePath = path.resolve("node_modules", url.substr(1));
            return { file: filePath };
        }
        return { file: url };
    }

    private getArchyData(bundleResult: BundleResult, sourceDirectory?: string): archy.Data {
        if (sourceDirectory == null) {
            sourceDirectory = process.cwd();
        }
        const archyData: archy.Data = {
            label: path.relative(sourceDirectory, bundleResult.filePath)
        };

        if (!bundleResult.found) {
            archyData.label += ` [NOT FOUND]`;
        }
        if (bundleResult.deduped) {
            archyData.label += ` [DEDUPED]`;
        }
        if (bundleResult.ignored) {
            archyData.label += ` [IGNORED]`;
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

    /**
     * TODO: Rewrite this in major version.
     */
    private bundleResultForEach(bundleResult: BundleResult, cb: (bundleResult: BundleResult) => void): void {
        cb(bundleResult);
        if (bundleResult.imports != null) {
            for (const bundleResultChild of bundleResult.imports) {
                this.bundleResultForEach(bundleResultChild, cb);
            }
        }
    }

    private countSavedBytesByDeduping(bundleResult: BundleResult, fileRegistry: FileRegistry): number {
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

    private exitWithError(message: string): void {
        if (this.config.Verbosity !== Contracts.Verbosity.None) {
            console.error(message);
        }
        process.exit(1);
    }
}
