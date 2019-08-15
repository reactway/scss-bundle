import os from "os";
import { BaseError } from "./base-error";

export class EntryFileNotFoundError extends BaseError {
    constructor(filePath: string) {
        super(`Entry file was not found:${os.EOL}${filePath}`);
    }
}
