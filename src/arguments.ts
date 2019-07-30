import * as yargs from "yargs";

import * as Contracts from "./contracts";

const verbosityValues: string[] = [];
for (const key in Contracts.Verbosity) {
  if (Number(key) % 1 !== 0) {
    verbosityValues.push(key);
  }
}

const DEDUPE_KEY = "dedupe";

export const argv = yargs
  .help("h", "Show help.")
  .alias("h", "help")
  .version()
  .alias("v", "version")
  .config("config")
  .alias("c", "config")
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
  .options("p", {
    alias: "project",
    describe: "Project locatation, where `node_modules` are located.",
    type: "string",
    default: "."
  })
  .options("w", {
    alias: "watch",
    describe: "Watch files for changes.",
    type: "string"
  })
  .options("nw", {
    alias: "noWatch",
    describe: "File watching disabled.",
    type: "string"
  })
  .options("verbosity", {
    describe: "Verbosity of output.",
    choices: verbosityValues,
    default: Contracts.Verbosity[Contracts.Verbosity.Verbose]
  })
  .options("includePaths", {
    describe: "Include paths for resolving imports.",
    type: "array"
  })
  .options("ignoredImports", {
    describe:
      "Ignore resolving import content by matching a regular expression.",
    type: "array"
  })
  .array(DEDUPE_KEY)
  .default(DEDUPE_KEY, [], "[]")
  .usage("Usage: scss-bundle [options]")
  .string(["c", "e", "d"]).argv as Contracts.ArgumentsValues;
