#!/usr/bin/env node

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
import { EntryFileNotFoundError } from "./errors/entry-file-not-found-error";
import { ImportFileNotFoundError } from "./errors/import-file-not-found-error";
import { BundleResultHasNoContentError } from "./errors/bundle-result-has-no-content-error";
import { OutFileNotDefinedError } from "./errors/out-file-not-defined-error";
import { EntryFileNotDefinedError } from "./errors/entry-file-not-defined-error";
import { renderScss } from "./utils/scss";
import { renderBundleInfo } from "./utils/bundle-info";
import { renderArchy } from "./utils/archy";
import { LogLevelDesc } from "loglevel";
import { resolveLogLevelKey, mergeObjects } from "./helpers";

const PACKAGE_JSON_PATH = path.resolve(__dirname, "../../package.json");

function bundleResultForEach(bundleResult: BundleResult, cb: (bundleResult: BundleResult) => void): void {
    cb(bundleResult);
    if (bundleResult.imports != null) {
        for (const bundleResultChild of bundleResult.imports) {
            bundleResultForEach(bundleResultChild, cb);
        }
    }
}

async function build(
    project: string | undefined,
    config: BundlerOptions
): Promise<{ bundleResult: BundleResult; fileRegistry: FileRegistry }> {
    if (config.entryFile == null) {
        throw new EntryFileNotDefinedError();
    }

    if (config.outFile == null) {
        throw new OutFileNotDefinedError();
    }

    const fileRegistry: FileRegistry = {};
    const bundler = new Bundler(fileRegistry, project);
    const bundleResult = await bundler.bundle(config.entryFile, config.dedupeGlobs, config.includePaths, config.ignoreImports);

    if (!bundleResult.found) {
        throw new EntryFileNotFoundError(bundleResult.filePath);
    }

    bundleResultForEach(bundleResult, result => {
        if (!result.found && result.tilde && project == null) {
            Log.warn(`Found tilde import, but "project" was not specified.`);
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

    let configLocation: string | undefined;
    if (cliOptions.config != null) {
        const stats = await fs.stat(cliOptions.config);
        if (stats.isDirectory()) {
            configLocation = path.resolve(cliOptions.config, CONFIG_FILE_NAME);
        } else {
            configLocation = cliOptions.config;
        }
    }
    // Resolve project location from CLI.
    let projectLocation: string | undefined;
    if (cliOptions.project != null) {
        const stats = await fs.stat(cliOptions.project);
        if (stats.isDirectory()) {
            projectLocation = cliOptions.project;
        } else {
            Log.warn(`[DEPRECATED]: Flag "project" usage as pointing to the config file directly is deprecated.`);
            configLocation = cliOptions.project;
            projectLocation = path.dirname(cliOptions.project);
        }
    }

    let config: BundlerOptions;
    if (configLocation != null) {
        try {
            const jsonConfig = await resolveConfig(configLocation);

            config = mergeObjects(jsonConfig.bundlerOptions, cliOptions);
        } catch (error) {
            Log.error(error);
            process.exit(1);
        }
    } else {
        config = cliOptions;
    }

    // Resolve project location from config file.
    if (projectLocation == null && configLocation != null) {
        const configLocationDir = path.dirname(configLocation);
        projectLocation = path.resolve(configLocationDir, config.project ?? "./");
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

            await build(projectLocation, config);
            Log.info("Waiting for changes...");
        });

        if (config.rootDir) {
            Log.warn("rootDir property is missing, using cwd.");
        }

        const watchFolder = config.rootDir ?? process.cwd();

        Log.info("Waiting for changes...");
        chokidar.watch(watchFolder).on("change", onFileChange);
    } else {
        try {
            const { fileRegistry, bundleResult } = await build(projectLocation, config);

            Log.info("Imports tree:");
            Log.info(renderArchy(bundleResult, projectLocation));

            Log.info(renderBundleInfo(bundleResult, fileRegistry));
        } catch (error) {
            Log.error(error.message);
            process.exit(1);
        }
    }
}

main(process.argv);
