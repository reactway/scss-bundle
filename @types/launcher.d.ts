import * as Contracts from "./contracts";
export declare class Launcher {
    private config;
    constructor(config: Contracts.Config);
    Bundle(): Promise<void>;
    private renderScss(content);
    private tildeImporter;
    private getArchyData(bundleResult, sourceDirectory?);
    /**
     * TODO: Rewrite this in major version.
     */
    private bundleResultForEach(bundleResult, cb);
    private countSavedBytesByDeduping(bundleResult, fileRegistry);
    private exitWithError(message);
}
