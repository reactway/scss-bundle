import os from "os";
import prettyBytes from "pretty-bytes";

import { BundleResult, FileRegistry } from "../../contracts";

function countSavedBytesByDeduping(bundleResult: BundleResult, fileRegistry: FileRegistry): number {
    let savedBytes = 0;
    const content = fileRegistry[bundleResult.filePath];
    if (bundleResult.deduped === true && content != null) {
        savedBytes = content.length;
    }
    if (bundleResult.imports != null && bundleResult.imports.length > 0) {
        for (const importResult of bundleResult.imports) {
            savedBytes += countSavedBytesByDeduping(importResult, fileRegistry);
        }
    }
    return savedBytes;
}

export function renderBundleInfo(bundleResult: BundleResult, fileRegistry: FileRegistry): string {
    return [
        "Bundle info:",
        `Total size       : ${bundleResult.bundledContent == null ? "undefined" : prettyBytes(bundleResult.bundledContent.length)}`,
        `Saved by deduping: ${prettyBytes(countSavedBytesByDeduping(bundleResult, fileRegistry))}`
    ].join(os.EOL);
}
