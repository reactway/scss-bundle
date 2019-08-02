import os from "os";
import { BaseError } from "./base-error";

export class ConfigReadError extends BaseError {
    constructor(configPath: string) {
        super(`Failed to read config (maybe it is missing?):${os.EOL}${configPath}`);
    }
}
