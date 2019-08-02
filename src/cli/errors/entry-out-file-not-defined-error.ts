import { BaseError } from "./base-error";

export class EntryOutFileNotDefinedError extends BaseError {
    constructor() {
        super("Entry file and/or out file is not defined.");
    }
}
