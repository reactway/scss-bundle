import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as sass from "node-sass";
import * as Promise from "promise";

import * as Helpers from "./helpers";
import * as Contracts from "./contracts";

const IMPORT_PATTERN = /@import '(.+)';/g;
const COMMENTED_IMPORT_PATTERN = /\/\/@import '(.+)';/g;
const FILE_EXTENSION = ".scss";

interface Dependencies {
    [id: string]: string;
}

export class Bundle {
    /**
     * Full path of entry file.
     */
    private entryFile: string;
    private dependencies: Dependencies = {};
    private files = Array<string>();
    private config: Contracts.Config;

    constructor(config: Contracts.Config) {
        this.config = config;
        this.entryFile = path.join(process.cwd(), this.config.entry);
        this.files.push(this.entryFile);
    }

    public Bundle() {
        while (this.files.length > 0) {
            let file = this.files.shift() as string;
            let imports = this.getImports(file);
            this.files.unshift(...imports);
            if (this.dependencies[file] == null) {
                this.dependencies[file] = this.getFileContents(file);
            }
        }
        let bundledFileContents = this.bundling(this.entryFile);

        return new Promise((resolve, reject) => {
            sass.render({ data: bundledFileContents }, (error, result) => {
                if (error != null) {
                    reject(`${error.message} at line ${error.line}.`);
                } else {
                    resolve({});
                }
                this.writeToFile(bundledFileContents);
            });
        });
    }

    private writeToFile(contents: string) {
        fs.writeFileSync(this.config.dest, contents);
    }

    private bundling(filePath: string) {
        if (this.dependencies[filePath] == null) {
            return undefined;
        }
        let content = this.removeCommentedImports(this.dependencies[filePath]);
        delete this.dependencies[filePath];
        let folderPath = path.dirname(filePath);

        return this.replaceImports(content, (matches) => {
            let file = matches[1];
            if (file.indexOf(FILE_EXTENSION) === -1) {
                file += FILE_EXTENSION;
            }
            let fullPath = path.join(folderPath, file);
            let content = this.bundling(fullPath) || "";
            content += os.EOL;
            return content;
        });
    }

    private replaceImports(content: string, callback: (matches: Array<string>) => string) {
        let imports = Helpers.getMatches(content, IMPORT_PATTERN, -1) as Array<Array<string>>;
        for (let i = 0; i < imports.length; i++) {
            if (imports[i].length > 0) {
                content = content.replace(imports[i][0], callback(imports[i]));
            }
        }

        return content;
    }

    private getImports(filePath: string, fullPaths = true): Array<string> {
        let paths = Array<string>();
        let fileFolder = path.dirname(filePath);
        let content = this.getFileContents(filePath);
        content = this.removeCommentedImports(content);
        let imports = Helpers.getMatches(content, IMPORT_PATTERN);

        let importsKeys = Object.keys(imports);
        for (let i = 0; i < importsKeys.length; i++) {
            let importItem = imports[importsKeys[i]];

            let importFilePath = fullPaths ? path.join(fileFolder, importItem) : importItem;
            if (importFilePath.indexOf(FILE_EXTENSION) === -1) {
                importFilePath += FILE_EXTENSION;
            }

            paths.push(importFilePath as string);
        }

        return paths;
    }

    private removeCommentedImports(content: string) {
        return content.replace(COMMENTED_IMPORT_PATTERN, "");
    }

    private getFileContents(filePath: string): string {
        return fs.readFileSync(filePath, "utf8").toString();
    }
}
