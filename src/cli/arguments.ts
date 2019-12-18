import commander from "commander";
import { resolveBoolean, resolveList, resolvePath, resolveLogLevelKey } from "./helpers";
import { BundlerOptions } from "../contracts";

export interface Arguments extends BundlerOptions {
    config?: string;
}

export function resolveArguments(cmd: commander.Command, argv: string[]): Arguments {
    const parsedArguments = (cmd
        .option("-c, --config <path>", "configuration file location", resolvePath)
        .option("-p, --project <path>", "project location where 'node_modules' folder is located", resolvePath, process.cwd())
        .option("-e, --entryFile <path>", "bundle entry file location", resolvePath)
        .option("-o, --outFile <path>", "bundle output location", resolvePath)
        .option("--rootDir <path>", "specifies the root directory of input files", resolvePath)
        .option("-w, --watch [boolean]", `watch files for changes. Works with "rootDir"`, resolveBoolean)
        .option("--ignoreImports <list>", "ignore resolving import content by matching a regular expression", resolveList)
        .option("--includePaths <list>", "include paths for resolving imports", resolveList)
        .option("--dedupeGlobs <list>", "files that will be emitted in a bundle once", resolveList)
        .option("--logLevel <level>", "console log level", resolveLogLevelKey)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .parse(argv) as any) as Arguments;

    const { config, project, entryFile, ignoreImports, includePaths, outFile, rootDir, watch, logLevel } = parsedArguments;

    return {
        config,
        project,
        entryFile,
        ignoreImports,
        includePaths,
        outFile,
        rootDir,
        watch,
        logLevel
    };
}
