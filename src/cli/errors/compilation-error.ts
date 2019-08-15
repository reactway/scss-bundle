import os from "os";
import { BaseError } from "./base-error";

export class CompilationError extends BaseError {
    constructor(styleError: string) {
        super(`There is an error in your styles:${os.EOL}${styleError}`);
    }
}
