var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("mz/fs");
const os = require("os");
const path = require("path");
const globs = require("globs");
const Helpers = require("./helpers");
const IMPORT_PATTERN = /@import ['"](.+)['"];/g;
const COMMENTED_IMPORT_PATTERN = /\/\/@import '(.+)';/g;
const FILE_EXTENSION = ".scss";
class Bundler {
    constructor(fileRegistry = {}) {
        this.fileRegistry = fileRegistry;
        // Full paths of used imports and their count
        this.usedImports = {};
        // Imports dictionary by file
        this.importsByFile = {};
    }
    BundleAll(files, dedupeGlobs) {
        return __awaiter(this, void 0, void 0, function* () {
            const resultsPromises = files.map(file => this.Bundle(file, dedupeGlobs));
            return yield Promise.all(resultsPromises);
        });
    }
    Bundle(file, dedupeGlobs = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.access(file);
                const contentPromise = fs.readFile(file, "utf-8");
                const dedupeFilesPromise = this.globFilesOrEmpty(dedupeGlobs);
                // Await all async operations and extract results
                const [content, dedupeFiles] = yield Promise.all([contentPromise, dedupeFilesPromise]);
                return yield this.bundle(file, content, dedupeFiles);
            }
            catch (error) {
                return {
                    filePath: file,
                    found: false
                };
            }
        });
    }
    bundle(filePath, content, dedupeFiles) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove commented imports
            content = content.replace(COMMENTED_IMPORT_PATTERN, "");
            // Resolve path to work only with full paths
            filePath = path.resolve(filePath);
            const dirname = path.dirname(filePath);
            if (this.fileRegistry[filePath] == null) {
                this.fileRegistry[filePath] = content;
            }
            // Resolve imports file names (prepend underscore for partials)
            const importsPromises = Helpers.getAllMatches(content, IMPORT_PATTERN).map((match) => __awaiter(this, void 0, void 0, function* () {
                let importName = match[1];
                // Append extension if it's absent
                if (importName.indexOf(FILE_EXTENSION) === -1) {
                    importName += FILE_EXTENSION;
                }
                const fullPath = path.resolve(dirname, importName);
                const importData = {
                    importString: match[0],
                    path: importName,
                    fullPath: fullPath,
                    found: false
                };
                try {
                    yield fs.access(fullPath);
                    importData.found = true;
                }
                catch (error) {
                    const underscoredDirname = path.dirname(fullPath);
                    const underscoredBasename = path.basename(fullPath);
                    const underscoredFilePath = path.join(underscoredDirname, `_${underscoredBasename}`);
                    try {
                        yield fs.access(underscoredFilePath);
                        importData.fullPath = underscoredFilePath;
                        importData.found = true;
                    }
                    catch (underscoreErr) {
                        // Neither file, nor partial was found
                        // Skipping...
                    }
                }
                return importData;
            }));
            // Wait for all imports file names to be resolved
            const imports = yield Promise.all(importsPromises);
            const bundleResult = {
                filePath: filePath,
                found: true
            };
            const shouldCheckForDedupes = dedupeFiles != null && dedupeFiles.length > 0;
            // Bundle all imports
            const currentImports = [];
            for (const imp of imports) {
                let contentToReplace;
                let currentImport;
                // If neither import file, nor partial is found
                if (!imp.found) {
                    // Add empty bundle result with found: false
                    currentImport = {
                        filePath: imp.fullPath,
                        found: false
                    };
                }
                else if (this.fileRegistry[imp.fullPath] == null) {
                    // If file is not yet in the registry
                    // Read
                    let impContent = yield fs.readFile(imp.fullPath, "utf-8");
                    // and bundle it
                    let bundledImport = yield this.bundle(imp.fullPath, impContent, dedupeFiles);
                    // Then add its bundled content to the registry
                    this.fileRegistry[imp.fullPath] = bundledImport.bundledContent;
                    // Add it to used imports, if it's not there
                    if (this.usedImports != null && this.usedImports[imp.fullPath] == null) {
                        this.usedImports[imp.fullPath] = 1;
                    }
                    // And whole BundleResult to current imports
                    currentImport = bundledImport;
                }
                else {
                    // File is in the registry
                    // Increment it's usage count
                    if (this.usedImports != null) {
                        this.usedImports[imp.fullPath]++;
                    }
                    // Resolve child imports, if there are any
                    let childImports = [];
                    if (this.importsByFile != null) {
                        childImports = this.importsByFile[imp.fullPath];
                    }
                    // Construct and add result to current imports
                    currentImport = {
                        filePath: imp.fullPath,
                        found: true,
                        imports: childImports
                    };
                }
                // Take contentToReplace from the fileRegistry
                contentToReplace = this.fileRegistry[imp.fullPath];
                // If the content is not found
                if (contentToReplace == null) {
                    // Indicate this with a comment for easier debugging
                    contentToReplace = `/*** IMPORTED FILE NOT FOUND ***/${os.EOL}${imp.importString}/*** --- ***/`;
                }
                // If usedImports dictionary is defined
                if (shouldCheckForDedupes && this.usedImports != null) {
                    // And current import path should be deduped and is used already
                    const timesUsed = this.usedImports[imp.fullPath];
                    if (dedupeFiles.indexOf(imp.fullPath) !== -1 &&
                        timesUsed != null &&
                        timesUsed > 1) {
                        // Reset content to an empty string to skip it
                        content = "";
                        // And indicate that import was deduped
                        currentImport.deduped = true;
                    }
                }
                // Finally, replace import string with bundled content or a debug message
                content = content.replace(imp.importString, contentToReplace);
                // And push current import into the list
                currentImports.push(currentImport);
            }
            // Set result properties
            bundleResult.bundledContent = content;
            bundleResult.imports = currentImports;
            if (this.importsByFile != null) {
                this.importsByFile[filePath] = currentImports;
            }
            return bundleResult;
        });
    }
    globFilesOrEmpty(globsList) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (globsList == null || globsList.length === 0) {
                    resolve([]);
                    return;
                }
                globs(globsList, (err, files) => {
                    // Reject if there's an error
                    if (err) {
                        reject(err);
                    }
                    // Resolve full paths
                    const result = files.map(file => path.resolve(file));
                    // Resolve promise
                    resolve(result);
                });
            });
        });
    }
}
exports.Bundler = Bundler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUUvQixxQ0FBcUM7QUFFckMsTUFBTSxjQUFjLEdBQUcsd0JBQXdCLENBQUM7QUFDaEQsTUFBTSx3QkFBd0IsR0FBRyxzQkFBc0IsQ0FBQztBQUN4RCxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUM7QUF1Qi9CO0lBTUksWUFBb0IsZUFBNkIsRUFBRTtRQUEvQixpQkFBWSxHQUFaLFlBQVksQ0FBbUI7UUFMbkQsNkNBQTZDO1FBQ3JDLGdCQUFXLEdBQThCLEVBQUUsQ0FBQztRQUNwRCw2QkFBNkI7UUFDckIsa0JBQWEsR0FBc0MsRUFBRSxDQUFDO0lBRVAsQ0FBQztJQUUzQyxTQUFTLENBQ2xCLEtBQWUsRUFDZixXQUFxQjs7WUFFckIsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMxRSxNQUFNLENBQUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzlDLENBQUM7S0FBQTtJQUVZLE1BQU0sQ0FBQyxJQUFZLEVBQUUsY0FBd0IsRUFBRTs7WUFDeEQsSUFBSSxDQUFDO2dCQUNELE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEIsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUU5RCxpREFBaUQ7Z0JBQ2pELE1BQU0sQ0FBQyxPQUFPLEVBQUUs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QUFDO1lBQ2xELENBQUM7WUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDO1FBQ3hCLENBQUM7S0FBQTtJQUVhLGdCQUFnQixDQUFDLFNBQW1COztZQUM5QyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTTtnQkFDekMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDWixNQUFNLENBQUM7Z0JBQ1gsQ0FBQztnQkFDRCxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBVSxFQUFFLEtBQWU7b0JBQ3pDLDZCQUE2QjtvQkFDN0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDTixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hCLENBQUM7b0JBRUQscUJBQXFCO29CQUNyQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRXJELGtCQUFrQjtvQkFDbEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUFBO0NBQ0o7QUFuTkQsMEJBbU5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcIm16L2ZzXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGdsb2JzIGZyb20gXCJnbG9ic1wiO1xyXG5cclxuaW1wb3J0ICogYXMgSGVscGVycyBmcm9tIFwiLi9oZWxwZXJzXCI7XHJcblxyXG5jb25zdCBJTVBPUlRfUEFUVEVSTiA9IC9AaW1wb3J0IFsnXCJdKC4rKVsnXCJdOy9nO1xyXG5jb25zdCBDT01NRU5URURfSU1QT1JUX1BBVFRFUk4gPSAvXFwvXFwvQGltcG9ydCAnKC4rKSc7L2c7XHJcbmNvbnN0IEZJTEVfRVhURU5TSU9OID0gXCIuc2Nzc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlUmVnaXN0cnkge1xyXG4gICAgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0RGF0YSB7XHJcbiAgICBpbXBvcnRTdHJpbmc6IHN0cmluZztcclxuICAgIHBhdGg6IHN0cmluZztcclxuICAgIGZ1bGxQYXRoOiBzdHJpbmc7XHJcbiAgICBmb3VuZDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVSZXN1bHQge1xyXG4gICAgLy8gQ2hpbGQgaW1wb3J0cyAoaWYgYW55KVxyXG4gICAgaW1wb3J0cz86IEJ1bmRsZVJlc3VsdFtdO1xyXG4gICAgZGVkdXBlZD86IGJvb2xlYW47XHJcbiAgICAvLyBGdWxsIHBhdGggb2YgdGhlIGZpbGVcclxuICAgIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgICBidW5kbGVkQ29udGVudD86IHN0cmluZztcclxuICAgIGZvdW5kOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQnVuZGxlciB7XHJcbiAgICAvLyBGdWxsIHBhdGhzIG9mIHVzZWQgaW1wb3J0cyBhbmQgdGhlaXIgY291bnRcclxuICAgIHByaXZhdGUgdXNlZEltcG9ydHM6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0gPSB7fTtcclxuICAgIC8vIEltcG9ydHMgZGljdGlvbmFyeSBieSBmaWxlXHJcbiAgICBwcml2YXRlIGltcG9ydHNCeUZpbGU6IHsgW2tleTogc3RyaW5nXTogQnVuZGxlUmVzdWx0W10gfSA9IHt9O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkgPSB7fSkgeyB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZUFsbChcclxuICAgICAgICBmaWxlczogc3RyaW5nW10sXHJcbiAgICAgICAgZGVkdXBlR2xvYnM6IHN0cmluZ1tdXHJcbiAgICApOiBQcm9taXNlPEJ1bmRsZVJlc3VsdFtdPiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0c1Byb21pc2VzID0gZmlsZXMubWFwKGZpbGUgPT4gdGhpcy5CdW5kbGUoZmlsZSwgZGVkdXBlR2xvYnMpKTtcclxuICAgICAgICByZXR1cm4gYXdhaXQgUHJvbWlzZS5hbGwocmVzdWx0c1Byb21pc2VzKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgQnVuZGxlKGZpbGU6IHN0cmluZywgZGVkdXBlR2xvYnM6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPEJ1bmRsZVJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhmaWxlKTtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudFByb21pc2UgPSBmcy5yZWFkRmlsZShmaWxlLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBkZWR1cGVGaWxlc1Byb21pc2UgPSB0aGlzLmdsb2JGaWxlc09yRW1wdHkoZGVkdXBlR2xvYnMpO1xyXG5cclxuICAgICAgICAgICAgLy8gQXdhaXQgYWxsIGFzeW5jIG9wZXJhdGlvbnMgYW5kIGV4dHJhY3QgcmVzdWx0c1xyXG4gICAgICAgICAgICBjb25zdCBbY29udGVudCwgZGVkdXBlRmlsZXNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW2NvbnRlbnRQcm9taXNlLCBkZWR1cGVGaWxlc1Byb21pc2VdKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJ1bmRsZShmaWxlLCBjb250ZW50LCBkZWR1cGVGaWxlcyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBmaWxlLFxyXG4gICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYnVuZGxlKFxyXG4gICAgICAgIGZpbGVQYXRoOiBzdHJpbmcsXHJcbiAgICAgICAgY29udGVudDogc3RyaW5nLFxyXG4gICAgICAgIGRlZHVwZUZpbGVzOiBzdHJpbmdbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICAvLyBSZW1vdmUgY29tbWVudGVkIGltcG9ydHNcclxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKENPTU1FTlRFRF9JTVBPUlRfUEFUVEVSTiwgXCJcIik7XHJcblxyXG4gICAgICAgIC8vIFJlc29sdmUgcGF0aCB0byB3b3JrIG9ubHkgd2l0aCBmdWxsIHBhdGhzXHJcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLnJlc29sdmUoZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBjb25zdCBkaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9IGNvbnRlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIGltcG9ydHMgZmlsZSBuYW1lcyAocHJlcGVuZCB1bmRlcnNjb3JlIGZvciBwYXJ0aWFscylcclxuICAgICAgICBjb25zdCBpbXBvcnRzUHJvbWlzZXMgPSBIZWxwZXJzLmdldEFsbE1hdGNoZXMoY29udGVudCwgSU1QT1JUX1BBVFRFUk4pLm1hcChhc3luYyBtYXRjaCA9PiB7XHJcbiAgICAgICAgICAgIGxldCBpbXBvcnROYW1lID0gbWF0Y2hbMV07XHJcbiAgICAgICAgICAgIC8vIEFwcGVuZCBleHRlbnNpb24gaWYgaXQncyBhYnNlbnRcclxuICAgICAgICAgICAgaWYgKGltcG9ydE5hbWUuaW5kZXhPZihGSUxFX0VYVEVOU0lPTikgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnROYW1lICs9IEZJTEVfRVhURU5TSU9OO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGRpcm5hbWUsIGltcG9ydE5hbWUpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaW1wb3J0RGF0YTogSW1wb3J0RGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIGltcG9ydFN0cmluZzogbWF0Y2hbMF0sXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBpbXBvcnROYW1lLFxyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGg6IGZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWREaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkQmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkRmlsZVBhdGggPSBwYXRoLmpvaW4odW5kZXJzY29yZWREaXJuYW1lLCBgXyR7dW5kZXJzY29yZWRCYXNlbmFtZX1gKTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKHVuZGVyc2NvcmVkRmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZnVsbFBhdGggPSB1bmRlcnNjb3JlZEZpbGVQYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAodW5kZXJzY29yZUVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIE5laXRoZXIgZmlsZSwgbm9yIHBhcnRpYWwgd2FzIGZvdW5kXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU2tpcHBpbmcuLi5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGltcG9ydERhdGE7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFdhaXQgZm9yIGFsbCBpbXBvcnRzIGZpbGUgbmFtZXMgdG8gYmUgcmVzb2x2ZWRcclxuICAgICAgICBjb25zdCBpbXBvcnRzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1wb3J0c1Byb21pc2VzKTtcclxuXHJcbiAgICAgICAgY29uc3QgYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIGZpbGVQYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICAgICAgZm91bmQ6IHRydWVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBzaG91bGRDaGVja0ZvckRlZHVwZXMgPSBkZWR1cGVGaWxlcyAhPSBudWxsICYmIGRlZHVwZUZpbGVzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgIC8vIEJ1bmRsZSBhbGwgaW1wb3J0c1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJbXBvcnRzOiBCdW5kbGVSZXN1bHRbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgaW1wIG9mIGltcG9ydHMpIHtcclxuICAgICAgICAgICAgbGV0IGNvbnRlbnRUb1JlcGxhY2U7XHJcblxyXG4gICAgICAgICAgICBsZXQgY3VycmVudEltcG9ydDogQnVuZGxlUmVzdWx0O1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgbmVpdGhlciBpbXBvcnQgZmlsZSwgbm9yIHBhcnRpYWwgaXMgZm91bmRcclxuICAgICAgICAgICAgaWYgKCFpbXAuZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIC8vIEFkZCBlbXB0eSBidW5kbGUgcmVzdWx0IHdpdGggZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBpbXAuZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgZmlsZSBpcyBub3QgeWV0IGluIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgLy8gUmVhZFxyXG4gICAgICAgICAgICAgICAgbGV0IGltcENvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShpbXAuZnVsbFBhdGgsIFwidXRmLThcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYW5kIGJ1bmRsZSBpdFxyXG4gICAgICAgICAgICAgICAgbGV0IGJ1bmRsZWRJbXBvcnQgPSBhd2FpdCB0aGlzLmJ1bmRsZShpbXAuZnVsbFBhdGgsIGltcENvbnRlbnQsIGRlZHVwZUZpbGVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBUaGVuIGFkZCBpdHMgYnVuZGxlZCBjb250ZW50IHRvIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgdGhpcy5maWxlUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9IGJ1bmRsZWRJbXBvcnQuYnVuZGxlZENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQWRkIGl0IHRvIHVzZWQgaW1wb3J0cywgaWYgaXQncyBub3QgdGhlcmVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwgJiYgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIEFuZCB3aG9sZSBCdW5kbGVSZXN1bHQgdG8gY3VycmVudCBpbXBvcnRzXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0gYnVuZGxlZEltcG9ydDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpbGUgaXMgaW4gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICAvLyBJbmNyZW1lbnQgaXQncyB1c2FnZSBjb3VudFxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgY2hpbGQgaW1wb3J0cywgaWYgdGhlcmUgYXJlIGFueVxyXG4gICAgICAgICAgICAgICAgbGV0IGNoaWxkSW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltcG9ydHNCeUZpbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkSW1wb3J0cyA9IHRoaXMuaW1wb3J0c0J5RmlsZVtpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbnN0cnVjdCBhbmQgYWRkIHJlc3VsdCB0byBjdXJyZW50IGltcG9ydHNcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGltcC5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRzOiBjaGlsZEltcG9ydHNcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFRha2UgY29udGVudFRvUmVwbGFjZSBmcm9tIHRoZSBmaWxlUmVnaXN0cnlcclxuICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF07XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB0aGUgY29udGVudCBpcyBub3QgZm91bmRcclxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUb1JlcGxhY2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSW5kaWNhdGUgdGhpcyB3aXRoIGEgY29tbWVudCBmb3IgZWFzaWVyIGRlYnVnZ2luZ1xyXG4gICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IGAvKioqIElNUE9SVEVEIEZJTEUgTk9UIEZPVU5EICoqKi8ke29zLkVPTH0ke2ltcC5pbXBvcnRTdHJpbmd9LyoqKiAtLS0gKioqL2A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIElmIHVzZWRJbXBvcnRzIGRpY3Rpb25hcnkgaXMgZGVmaW5lZFxyXG4gICAgICAgICAgICBpZiAoc2hvdWxkQ2hlY2tGb3JEZWR1cGVzICYmIHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gQW5kIGN1cnJlbnQgaW1wb3J0IHBhdGggc2hvdWxkIGJlIGRlZHVwZWQgYW5kIGlzIHVzZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXNVc2VkID0gdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlZHVwZUZpbGVzLmluZGV4T2YoaW1wLmZ1bGxQYXRoKSAhPT0gLTEgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc1VzZWQgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzVXNlZCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBjb250ZW50IHRvIGFuIGVtcHR5IHN0cmluZyB0byBza2lwIGl0XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQW5kIGluZGljYXRlIHRoYXQgaW1wb3J0IHdhcyBkZWR1cGVkXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEltcG9ydC5kZWR1cGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmluYWxseSwgcmVwbGFjZSBpbXBvcnQgc3RyaW5nIHdpdGggYnVuZGxlZCBjb250ZW50IG9yIGEgZGVidWcgbWVzc2FnZVxyXG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKGltcC5pbXBvcnRTdHJpbmcsIGNvbnRlbnRUb1JlcGxhY2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gQW5kIHB1c2ggY3VycmVudCBpbXBvcnQgaW50byB0aGUgbGlzdFxyXG4gICAgICAgICAgICBjdXJyZW50SW1wb3J0cy5wdXNoKGN1cnJlbnRJbXBvcnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0IHJlc3VsdCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50ID0gY29udGVudDtcclxuICAgICAgICBidW5kbGVSZXN1bHQuaW1wb3J0cyA9IGN1cnJlbnRJbXBvcnRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pbXBvcnRzQnlGaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbXBvcnRzQnlGaWxlW2ZpbGVQYXRoXSA9IGN1cnJlbnRJbXBvcnRzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJ1bmRsZVJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdsb2JGaWxlc09yRW1wdHkoZ2xvYnNMaXN0OiBzdHJpbmdbXSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZ2xvYnNMaXN0ID09IG51bGwgfHwgZ2xvYnNMaXN0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShbXSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZ2xvYnMoZ2xvYnNMaXN0LCAoZXJyOiBFcnJvciwgZmlsZXM6IHN0cmluZ1tdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZWplY3QgaWYgdGhlcmUncyBhbiBlcnJvclxyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgZnVsbCBwYXRoc1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZmlsZXMubWFwKGZpbGUgPT4gcGF0aC5yZXNvbHZlKGZpbGUpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIHByb21pc2VcclxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuIl19