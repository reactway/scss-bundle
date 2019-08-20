import fs from "fs-extra";
import { ScssBundleConfig } from "../contracts";
import { resolvePath } from "./helpers";
import { ConfigReadError } from "./errors/config-read-error";

export async function resolveConfig(filePath: string): Promise<ScssBundleConfig> {
    let json: ScssBundleConfig;
    try {
        json = await fs.readJson(filePath);
    } catch {
        throw new ConfigReadError(filePath);
    }

    if (json.bundlerOptions == null) {
        throw new Error("Missing 'bundlerOptions' in config.");
    }

    return {
        bundlerOptions: {
            ...json.bundlerOptions,
            entryFile: json.bundlerOptions.entryFile != null ? resolvePath(json.bundlerOptions.entryFile) : undefined,
            outFile: json.bundlerOptions.outFile != null ? resolvePath(json.bundlerOptions.outFile) : undefined,
            rootDir: json.bundlerOptions.rootDir != null ? resolvePath(json.bundlerOptions.rootDir) : undefined
        }
    };
}
