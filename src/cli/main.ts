import commander from "commander";
import fs from "fs-extra";
import path from "path";
import debounce from "lodash.debounce";
import chokidar from "chokidar";

import { BundlerOptions, FileRegistry, BundleResult } from "../contracts";
import { resolveArguments } from "./arguments";
import { CONFIG_FILE_NAME, LogLevel } from "./constants";
import { resolveConfig } from "./config";
import { Log } from "./logging";
import { Bundler } from "../bundler";
import { EntryOutFileNotDefinedError } from "./errors/entry-out-file-not-defined-error";
import { EntryFileNotFoundError } from "./errors/entry-file-not-found-error";
import { ImportFileNotFoundError } from "./errors/import-file-not-found-error";
import { BundleResultHasNoContentError } from "./errors/bundle-result-has-no-content-error";
import { renderScss } from "./utils/scss";
import { renderBundleInfo } from "./utils/bundle-info";
import { renderArch } from "./utils/archy";
import { LogLevelDesc } from "loglevel";
import { resolveLogLevelKey } from "./helpers";
import { mergeObjects } from "../helpers";

const PACKAGE_JSON_PATH = path.resolve(__dirname, "../../package.json");

function bundleResultForEach(bundleResult: BundleResult, cb: (bundleResult: BundleResult) => void): void {
    cb(bundleResult);
    if (bundleResult.imports != null) {
        for (const bundleResultChild of bundleResult.imports) {
            bundleResultForEach(bundleResultChild, cb);
        }
    }
}

async function build(project: string, config: BundlerOptions): Promise<{ bundleResult: BundleResult; fileRegistry: FileRegistry }> {
    if (config.entryFile == null || config.outFile == null) {
        throw new EntryOutFileNotDefinedError();
    }

    const fileRegistry: FileRegistry = {};
    const bundler = new Bundler(fileRegistry, config.rootDir);
    const bundleResult = await bundler.bundle(config.entryFile, config.dedupeGlobs, config.includePaths, config.ignoreImports);

    if (!bundleResult.found) {
        throw new EntryFileNotFoundError(bundleResult.filePath);
    }

    bundleResultForEach(bundleResult, result => {
        if (!result.found && result.tilde && config.rootDir == null) {
            Log.warn("Found tilde import, but rootDir was not specified.");
            throw new ImportFileNotFoundError(result.filePath);
        }
    });

    if (bundleResult.bundledContent == null) {
        throw new BundleResultHasNoContentError();
    }

    await renderScss(project, config.includePaths, bundleResult.bundledContent);

    await fs.mkdirp(path.dirname(config.outFile));
    await fs.writeFile(config.outFile, bundleResult.bundledContent);

    return {
        fileRegistry: fileRegistry,
        bundleResult: bundleResult
    };
}

async function main(argv: string[]): Promise<void> {
    const packageJson: { version: string } = await fs.readJson(PACKAGE_JSON_PATH);
    const cliOptions = resolveArguments(commander.version(packageJson.version, "-v, --version"), argv);

    const stats = await fs.stat(cliOptions.project);
    let configPath: string;
    if (stats.isDirectory()) {
        configPath = path.resolve(cliOptions.project, CONFIG_FILE_NAME);
    } else {
        configPath = cliOptions.project;
    }
    const project = path.dirname(configPath);

    let config: BundlerOptions;
    if (configPath != null) {
        try {
            const jsonConfig = await resolveConfig(configPath);

            config = mergeObjects(jsonConfig.bundlerOptions, cliOptions);
        } catch (error) {
            Log.error(error);
            process.exit(1);
            return;
        }
    } else {
        config = cliOptions;
    }

    let resolvedLogLevel: LogLevelDesc | undefined;
    if (config.logLevel != null) {
        const logLevelKey = resolveLogLevelKey(config.logLevel);
        if (logLevelKey != null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolvedLogLevel = LogLevel[logLevelKey as any] as LogLevelDesc;
        }
    }
    Log.setLevel(resolvedLogLevel == null ? LogLevel.Info : resolvedLogLevel);

    if (config.watch) {
        const onFileChange = debounce(async () => {
            Log.info("File changes detected.");
            await build(project, config);
            Log.info("Waiting for changes...");
        });

        const watchFolder = config.rootDir != null ? config.rootDir : project;

        Log.info("Waiting for changes...");
        chokidar.watch(watchFolder).on("change", onFileChange);
    } else {
        try {
            const { fileRegistry, bundleResult } = await build(project, config);

            Log.info("Imports tree:");
            Log.info(renderArch(bundleResult, project));

            Log.info(renderBundleInfo(bundleResult, fileRegistry));
        } catch (error) {
            Log.error(error.message);
            process.exit(1);
        }
    }
}

main(process.argv);
