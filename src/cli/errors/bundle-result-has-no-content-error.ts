import { BaseError } from "./base-error";

export class BundleResultHasNoContentError extends BaseError {
    constructor() {
        super("Concatenation result has no content.");
    }
}
