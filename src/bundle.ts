import * as fs from 'fs';
import * as path from 'path';
import * as Helpers from './helpers';
import * as Contracts from './contracts';
import * as sass from 'node-sass';
import * as Promise from 'promise';

const IMPORT_PATTERN = /@import '(.+)';/g;
const COMMENTED_IMPORT_PATTERN = /\/\/@import '(.+)';/g;
const FILE_EXTENSION = '.scss';

interface Dependencies {
    [id: string]: string;
}

interface Config {
    main: string;
    out: string;
}

export default class Bundle {
    /**
     * Full path of entry file.
     */
    private entry_file: string;
    private dependencies: Dependencies = {};
    private files = Array<string>();
    private config: Contracts.Config;

    constructor(config: Contracts.Config) {
        this.config = config;
        this.entry_file = path.join(process.cwd(), this.config.entry);
        this.files.push(this.entry_file);
    }

    public Bundle() {
        while (this.files.length > 0) {
            let file = this.files.shift();
            let imports = this.getImports(file);
            this.files.unshift(...imports);
            if (this.dependencies[file] == null) {
                this.dependencies[file] = this.getFileContents(file);
            }
        }
        let bundledFileContents = this.bundling(this.entry_file);




        // sass.render({
        //     data: bundledFileContents,
        // }, () => {

        // });

        return new Promise((resolve, reject) => {
            sass.render({ data: bundledFileContents }, (error, result) => {
                if (error != null) {
                    reject(`${error.message} at line ${error.line}.`);
                } else {
                    resolve(null);
                }
                this.writeToFile(bundledFileContents);
            });
        });
    }

    private writeToFile(contents: string) {
        fs.writeFileSync(this.config.dest, contents);
    }

    private bundling(file_path: string) {
        if (this.dependencies[file_path] == null) {
            return undefined;
        }
        let content = this.removeCommentedImports(this.dependencies[file_path]);
        delete this.dependencies[file_path];
        let folder_path = path.dirname(file_path);

        return this.replaceImports(content, (matches) => {
            let file = matches[1];
            if (file.indexOf(FILE_EXTENSION) === -1) {
                file += FILE_EXTENSION;
            }
            let fullPath = path.join(folder_path, file);
            let content = this.bundling(fullPath) || '';
            content += '\n';
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

    private getImports(file_path: string, fullPaths = true): Array<string> {
        let paths = Array<string>();
        let file_folder = path.dirname(file_path);
        let content = this.getFileContents(file_path);
        content = this.removeCommentedImports(content);
        let imports = Helpers.getMatches(content, IMPORT_PATTERN);

        for (let key in imports) {
            let import_file_path = fullPaths ? path.join(file_folder, imports[key]) : imports[key];
            if (import_file_path.indexOf(FILE_EXTENSION) === -1) {
                import_file_path += FILE_EXTENSION;
            }

            paths.push(import_file_path as string);
        }

        return paths;
    }

    private removeCommentedImports(content: string) {
        return content.replace(COMMENTED_IMPORT_PATTERN, '');
    }

    private getFileContents(file_path: string): string {
        return fs.readFileSync(file_path, 'utf8').toString();
    }
}