#!/usr/bin/env node

import * as path from "path";
import * as Contracts from "./contracts";
import { argv } from "./arguments";
import { Launcher } from "./launcher";

class BundleCli {
    constructor(argumentValues: Contracts.ArgumentsValues) {
        if (argumentValues.entry != null && argumentValues.dest != null) {
            this.bundle(argumentValues);
        } else if (argumentValues.verbosity !== Contracts.Verbosity.None) {
            console.error("[Error] 'entry' and 'dest' are required.");
            process.exit(1);
        }
    }

    private async bundle(argumentValues: Contracts.ArgumentsValues): Promise<void> {
        await new Launcher(this.getConfig(argumentValues)).Bundle();
    }

    private getConfig(argumentValues: Contracts.ArgumentsValues): Contracts.Config {
        return {
            Destination: argumentValues.dest,
            Entry: argumentValues.entry,
            DedupeGlobs: argumentValues.dedupe,
            Verbosity: this.resolveVerbosity(argumentValues.verbosity),
            IncludePaths: argumentValues.includePaths,
            IgnoredImports: argumentValues.ignoredImports,
            ProjectDirectory: path.resolve(process.cwd(), argumentValues.project)
        };
    }

    private resolveVerbosity(verbosity: any): number {
        // Convert given value to an appropriate Verbosity enum value.
        // 'as any as number' is used because TypeScript thinks
        //  that we cast string to number, even though we get a number there
        return Contracts.Verbosity[verbosity] as any as number;
    }
}

new BundleCli(argv);
