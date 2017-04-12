import * as Contracts from "./contracts";
export declare class Launcher {
    private config;
    constructor(config: Contracts.Config);
    Bundle(): Promise<void>;
    private renderScss(content);
    private getArchyData(bundleResult, sourceDirectory?);
    private exitWithError(message);
}
