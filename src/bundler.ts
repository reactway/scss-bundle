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
    imports?: BundleResult[];
    filePath: string;
    content?: string;
    found: boolean;
}

export class Bundler {
    public static async Bundle(file: string, filesRegistry: FileRegistry = {}): Promise<BundleResult> {
        try {
            await fs.access(file);
            let content = await fs.readFile(file, "utf-8");
            return await this.bundle(file, content);
        } catch (error) {
            return {
                filePath: file,
                found: false
            };
        }
    }

    public static async BundleAll(files: string[], filesRegistry: FileRegistry = {}): Promise<BundleResult[]> {
        let resultsPromises = files.map(file => this.Bundle(file, filesRegistry));
        return await Promise.all(resultsPromises);
    }

    private static async bundle(filePath: string, content: string, filesRegistry?: FileRegistry): Promise<BundleResult> {
        if (filesRegistry == null) {
            filesRegistry = {};
        }

        // Remove commented imports
        content = content.replace(COMMENTED_IMPORT_PATTERN, "");

        // Resolve path to work only with full paths
        filePath = path.resolve(filePath);

        let dirname = path.dirname(filePath);

        if (filesRegistry[filePath] == null) {
            filesRegistry[filePath] = content;
        }

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
                }
            }

            return importData;
        });

        let imports = await Promise.all(importsPromises);
        let allImports: BundleResult[] = [];
        for (let imp of imports) {
            let contentToReplace;

            if (!imp.found) {
                allImports.push({
                    filePath: imp.fullPath,
                    found: false
                });
            } else if (filesRegistry[imp.fullPath] == null) {
                let impContent = await fs.readFile(imp.fullPath, "utf-8");
                let bundledImport = await this.bundle(imp.fullPath, impContent);
                filesRegistry[imp.fullPath] = bundledImport.content;
                allImports.push(bundledImport);
            }

            contentToReplace = filesRegistry[imp.fullPath];

            if (contentToReplace == null) {
                contentToReplace = `/*** IMPORTED FILE NOT FOUND ***/${os.EOL}${imp.importString}/*** --- ***/`;
            }

            content = content.replace(imp.importString, contentToReplace);
        }

        return {
            content: content,
            filePath: filePath,
            imports: allImports,
            found: true
        };
    }
}
