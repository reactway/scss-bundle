import path from "path";
import nodeSass from "sass";
import { CompilationError } from "../errors/compilation-error";

function sassImporter(projectPath: string): nodeSass.Importer {
    return (url, _prev, done) => {
        if (url[0] === "~") {
            const filePath = path.resolve(projectPath, "node_modules", url.substr(1));
            done({
                file: filePath
            });
        } else {
            done({ file: url });
        }
    };
}

export async function renderScss(projectPath: string | undefined, includePaths: string[] | undefined, content: string): Promise<{}> {
    return new Promise((resolve, reject) => {
        nodeSass.render(
            {
                data: content,
                importer: projectPath != null ? sassImporter(projectPath) : undefined,
                includePaths: includePaths
            },
            (error, result) => {
                if (error != null) {
                    reject(new CompilationError(`${error.message} on line (${error.line}, ${error.column})`));
                }
                resolve(result);
            }
        );
    });
}
