#!/usr/bin/env node

import * as Contracts from "./contracts";
import { argv } from "./arguments";
import { Launcher } from "./launcher";

class BundleCli {
    constructor(argv: Contracts.ArgumentsValues) {
        this.bundle();
    }

    private async bundle() {
        await new Launcher(this.getConfig(argv)).Bundle();
    }

    private getConfig(argv: Contracts.ArgumentsValues): Contracts.Config {
        return {
            Destination: argv.dest,
            Entry: argv.entry,
            DedupeGlobs: argv.dedupe,
            Verbosity: this.resolveVerbosity(argv.verbosity)
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
