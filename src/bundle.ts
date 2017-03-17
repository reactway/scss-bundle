import * as fs from "mz/fs";
import * as os from "os";
import * as path from "path";
import * as sass from "node-sass";
import * as mkdirp from "mkdirp";

import * as Helpers from "./helpers";
import * as Contracts from "./contracts";

const IMPORT_PATTERN = /@import ['"](.+)['"];/g;
const COMMENTED_IMPORT_PATTERN = /\/\/@import '(.+)';/g;
const FILE_EXTENSION = ".scss";

interface Dependencies {
    [id: string]: string;
}

interface ImportData {
    importString: string;
    path: string;
    fullPath: string;
    found: boolean;
}

export class Bundle {
    /**
     * Full path of entry file.
     */
    private entryFile: string;
    private filesContents: Dependencies = {};
    private files = Array<string>();
    private config: Contracts.Config;

    constructor(config: Contracts.Config) {
        this.config = config;
        this.entryFile = path.join(process.cwd(), this.config.entry);
        this.files.push(this.entryFile);
    }

    public async Bundle() {
        let filesToExplore = this.files;

        // Bundle all files depth first
        while (filesToExplore.length > 0) {
            // Shift first file
            let file = filesToExplore.shift() as string;

            // Bundle it recursively
            // let imports = await this.getImports(file);
            let content = await fs.readFile(file, "utf-8");
            let bundledFile = await this.bundle(file, content);

            // Add resolved imports to the begining of files array
            filesToExplore.unshift(...imports);
        }

        let bundledContent = this.bundle(this.entryFile);

        return await this.render(bundledContent);
    }

    private async bundle(filePath: string, content: string): Promise<string> {
        // Remove commented imports
        content = content.replace(COMMENTED_IMPORT_PATTERN, "");

        // Resolve path to work only with full paths
        filePath = path.resolve(filePath);

        let dirname = path.dirname(filePath);

        if (this.filesContents[filePath] == null) {
            this.filesContents[filePath] = content;
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

        for (let imp of imports) {
            if (this.filesContents[imp.fullPath] == null) {
                let impContent = await fs.readFile(imp.fullPath, "utf-8");
                this.filesContents[imp.fullPath] = await this.bundle(imp.fullPath, impContent);
            }
        }

        return content;
    }

    private async render(content: string) {
        return new Promise((resolve, reject) => {
            sass.render({ data: content }, async (error, result) => {
                await this.writeToFile(content);
                if (error != null) {
                    reject(`${error.message} at line ${error.line}.`);
                } else {
                    resolve({});
                }
            });
        })
    }


}
