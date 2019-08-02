import path from "path";
import { LogLevel } from "../constants";

export function resolveBoolean(value: string): boolean | undefined {
    if (value === "true") {
        return true;
    } else if (value === "false") {
        return false;
    }

    return undefined;
}

export function resolveList(value: string): string[] | undefined {
    return value.split(",");
}

export function resolvePath(value: string): string {
    return path.resolve(path.normalize(value));
}

export function resolveLogLevelKey(value: string): string | undefined {
    return Object.keys(LogLevel).find(x => x.toLowerCase() === value.toLowerCase());
}
