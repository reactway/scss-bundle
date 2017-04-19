#!/usr/bin/env node

import * as Contracts from "./contracts";
import { argv } from "./arguments";
import { Launcher } from "./launcher";

class BundleCli {
    constructor(argumentValues: Contracts.ArgumentsValues) {
        this.bundle(argumentValues);
    }

    private async bundle(argumentValues: Contracts.ArgumentsValues) {
        await new Launcher(this.getConfig(argumentValues)).Bundle();
    }

    private getConfig(argumentValues: Contracts.ArgumentsValues): Contracts.Config {
        return {
            Destination: argumentValues.dest,
            Entry: argumentValues.entry,
            DedupeGlobs: argumentValues.dedupe,
            Verbosity: this.resolveVerbosity(argumentValues.verbosity)
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
