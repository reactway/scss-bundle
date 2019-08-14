import { BaseError } from "./base-error";

export class EntryFileNotDefinedError extends BaseError {
    constructor() {
        super(`"entryFile" is not defined.`);
    }
}
