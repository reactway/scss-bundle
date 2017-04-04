import * as yargs from "yargs";

import * as Contracts from "./contracts";

let verbosityValues: string[] = [];
for (let key in Contracts.Verbosity) {
    if (Number(key) % 1 !== 0) {
        verbosityValues.push(key);
    }
}

export let argv = yargs
    .help("h", "Show help.")
    .alias("h", "help")
    .version(() => {
        return `Current version: ${require("../package.json").version}.`;
    })
    .alias("v", "version")
    .options("c", {
        alias: "config",
        describe: "Config file path.",
        type: "string"
    })
    .options("e", {
        alias: "entry",
        describe: "Entry file.",
        type: "string"
    })
    .options("d", {
        alias: "dest",
        describe: "Bundled file destination.",
        type: "string"
    })
    .options("verbosity", {
        describe: "Verbosity of output.",
        choices: verbosityValues,
        default: Contracts.Verbosity[Contracts.Verbosity.Verbose]
    })
    .usage("Usage: scss-bundle [options]")
    .string(["c", "e", "d"])
    .argv as Contracts.ArgumentsValues;
