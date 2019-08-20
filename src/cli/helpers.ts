import path from "path";
import { LogLevel } from "./constants";

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

export function mergeObjects<TAObject extends object, TBObject extends object>(a: TAObject, b: TBObject): TAObject & TBObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: { [key: string]: unknown } = a as any;

    for (const key of Object.keys(b)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (b as any)[key];
        if (value == null) {
            continue;
        }

        result[key] = value;
    }

    return result as TAObject & TBObject;
}
