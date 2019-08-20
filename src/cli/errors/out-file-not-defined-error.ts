import { BaseError } from "./base-error";

export class OutFileNotDefinedError extends BaseError {
    constructor() {
        super(`"outFile" is not defined.`);
    }
}
