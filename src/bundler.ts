import * as fs from "mz/fs";
import * as os from "os";
import * as path from "path";

import * as Helpers from "./helpers";

const IMPORT_PATTERN = /@import ['"](.+)['"];/g;
const COMMENTED_IMPORT_PATTERN = /\/\/@import '(.+)';/g;
const FILE_EXTENSION = ".scss";

export interface FileRegistry {
    [id: string]: string | undefined;
}

export interface ImportData {
    importString: string;
    path: string;
    fullPath: string;
    found: boolean;
}

export interface BundleResult {
    // Reference to root bundle result for easy usedImports check
    rootBundleResult: BundleResult | undefined;
    // Child imports (if any)
    imports?: BundleResult[];
    // Full path of the file
    filePath: string;
    bundledContent?: string;
    found: boolean;
    // Full paths of used imports
    // Used only on root BundleResult
    usedImports?: string[];
}

export class Bundler {
    public static async Bundle(file: string, fileRegistry: FileRegistry = {}): Promise<BundleResult> {
        try {
            await fs.access(file);
            let content = await fs.readFile(file, "utf-8");
            return await this.bundle(file, content);
        } catch (error) {
            return {
                rootBundleResult: undefined,
                filePath: file,
                found: false
            };
        }
    }

    public static async BundleAll(files: string[], fileRegistry: FileRegistry = {}): Promise<BundleResult[]> {
        let resultsPromises = files.map(file => this.Bundle(file, fileRegistry));
        return await Promise.all(resultsPromises);
    }

    private static async bundle(
        filePath: string,
        content: string,
        fileRegistry?: FileRegistry,
        rootBundleResult?: BundleResult
    ): Promise<BundleResult> {
        if (fileRegistry == null) {
            fileRegistry = {};
        }

        // Remove commented imports
        content = content.replace(COMMENTED_IMPORT_PATTERN, "");

        // Resolve path to work only with full paths
        filePath = path.resolve(filePath);

        let dirname = path.dirname(filePath);

        if (fileRegistry[filePath] == null) {
            fileRegistry[filePath] = content;
        }

        // Resolve imports file names (prepend underscore for partials)
        let importsPromises = Helpers.getAllMatches(content, IMPORT_PATTERN).map(async match => {
            let importName = match[1];
            // Append extension if it's absent
            if (importName.indexOf(FILE_EXTENSION) === -1) {
                importName += FILE_EXTENSION;
            }
            let fullPath = path.resolve(dirname, importName);

            let importData: ImportData = {
                importString: match[0],
                path: importName,
                fullPath: fullPath,
                found: false
            };

            try {
                await fs.access(fullPath);
                importData.found = true;
            } catch (error) {
                let underscoredDirname = path.dirname(fullPath);
                let underscoredBasename = path.basename(fullPath);
                let underscoredFilePath = path.join(underscoredDirname, `_${underscoredBasename}`);
                try {
                    await fs.access(underscoredFilePath);
                    importData.fullPath = underscoredFilePath;
                    importData.found = true;
                } catch (underscoreErr) {
                    // Neither file, nor partial was found
                    // Skipping...
                }
            }

            return importData;
        });

        // Wait for all imports file names to be resolved
        let imports = await Promise.all(importsPromises);

        let bundleResult: BundleResult = {
            rootBundleResult: rootBundleResult,
            bundledContent: content,
            filePath: filePath,
            found: true
        };

        // if this is the root BundleResult
        if (rootBundleResult == null) {
            // Initialize usedImports array
            bundleResult.usedImports = [];
        }

        // Bundle all imports
        let currentImports: Array<BundleResult> = [];
        for (let imp of imports) {
            let contentToReplace;

            // If neither import file, nor partial is found
            if (!imp.found) {
                // Add empty bundle result with found: false
                currentImports.push({
                    rootBundleResult: bundleResult,
                    filePath: imp.fullPath,
                    found: false
                });
            } else if (fileRegistry[imp.fullPath] == null) {
                // If file is not yet in the registry
                // Read
                let impContent = await fs.readFile(imp.fullPath, "utf-8");

                const currentRoot = rootBundleResult || bundleResult;

                // and bundle it
                let bundledImport = await this.bundle(imp.fullPath, impContent, fileRegistry, currentRoot);

                // Then add its bundled content to the registry
                fileRegistry[imp.fullPath] = bundledImport.bundledContent;

                // Add it to used imports, if it's not there
                if (currentRoot.usedImports != null && currentRoot.usedImports.indexOf(imp.fullPath) === -1) {
                    currentRoot.usedImports.push(imp.fullPath);
                }

                // And whole BundleResult to current imports
                currentImports.push(bundledImport);
            }

            // Take contentToReplace from the fileRegistry
            contentToReplace = fileRegistry[imp.fullPath];

            // If the content is not found
            if (contentToReplace == null) {
                // Indicate this with a comment for easier debugging
                contentToReplace = `/*** IMPORTED FILE NOT FOUND ***/${os.EOL}${imp.importString}/*** --- ***/`;
            }

            // Finally, replace import string with bundled content or a debug message
            content = content.replace(imp.importString, contentToReplace);
        }

        bundleResult.imports = currentImports;

        return bundleResult;
    }
}
