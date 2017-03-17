import * as fs from "mz/fs";
import * as os from "os";
import * as path from "path";

import * as Helpers from "./helpers";

const IMPORT_PATTERN = /@import ['"](.+)['"];/g;
const COMMENTED_IMPORT_PATTERN = /\/\/@import '(.+)';/g;
const FILE_EXTENSION = ".scss";

interface Dictionary {
    [id: string]: string;
}

interface ImportData {
    importString: string;
    path: string;
    fullPath: string;
    found: boolean;
}

interface BundleResult {
    imports: ImportData[];
    filePath: string;
    content: string;
}

export class Bundler {
    public static async Bundle(file: string): Promise<BundleResult> {
        let content = await fs.readFile(file, "utf-8");
        return await this.bundle(file, content);
    }

    public static async BundleAll(files: string[]): Promise<BundleResult[]> {
        let resultsPromises = files.map(this.Bundle);
        return await Promise.all(resultsPromises);
    }

    private static async bundle(filePath: string, content: string, filesContents?: Dictionary): Promise<BundleResult> {
        if (filesContents == null) {
            filesContents = {};
        }

        // Remove commented imports
        content = content.replace(COMMENTED_IMPORT_PATTERN, "");

        // Resolve path to work only with full paths
        filePath = path.resolve(filePath);

        let dirname = path.dirname(filePath);

        if (filesContents[filePath] == null) {
            filesContents[filePath] = content;
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
                let underscoredFilePath = path.join(dirname, `_${importName}`);
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
        let allImports: ImportData[] = [];
        for (let imp of imports) {
            // Push current import
            allImports.push(imp);

            let contentToReplace;
            if (imp.found && filesContents[imp.fullPath] == null) {
                let impContent = await fs.readFile(imp.fullPath, "utf-8");
                let bundledImport = await this.bundle(imp.fullPath, impContent);
                filesContents[imp.fullPath] = bundledImport.content;
                allImports = allImports.concat(bundledImport.imports);
            }

            contentToReplace = filesContents[imp.fullPath];

            if (contentToReplace == null) {
                contentToReplace = `/*** IMPORTED FILE NOT FOUND ***/${os.EOL}${imp.importString}/*** --- ***/`;
            }

            content = content.replace(imp.importString, contentToReplace);
        }

        return {
            content: content,
            filePath: filePath,
            imports: allImports
        };
    }
}
