import os from "os";
import { BaseError } from "./base-error";

export class ImportFileNotFoundError extends BaseError {
    constructor(filePath: string) {
        super(`Import file was not found:${os.EOL}${filePath}`);
    }
}
