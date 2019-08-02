import archy from "archy";
import path from "path";

import { BundleResult } from "../../contracts";

function getArchyData(bundleResult: BundleResult, sourceDirectory?: string): archy.Data {
    if (sourceDirectory == null) {
        sourceDirectory = process.cwd();
    }
    const archyData: archy.Data = {
        label: path.relative(sourceDirectory, bundleResult.filePath)
    };

    if (!bundleResult.found) {
        archyData.label += ` [NOT FOUND]`;
    }
    if (bundleResult.deduped) {
        archyData.label += ` [DEDUPED]`;
    }
    if (bundleResult.ignored) {
        archyData.label += ` [IGNORED]`;
    }

    if (bundleResult.imports != null) {
        archyData.nodes = bundleResult.imports.map(x => {
            if (x != null) {
                return getArchyData(x, sourceDirectory);
            }
            return "";
        });
    }
    return archyData;
}

export function renderArch(bundleResult: BundleResult, sourceDirectory?: string): string {
    return archy(getArchyData(bundleResult, sourceDirectory));
}
