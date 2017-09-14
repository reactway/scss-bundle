"use strict";
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
    Bundle(file, dedupeGlobs = [], includePaths = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.access(file);
                const contentPromise = fs.readFile(file, "utf-8");
                const dedupeFilesPromise = this.globFilesOrEmpty(dedupeGlobs);
                // Await all async operations and extract results
                const [content, dedupeFiles] = yield Promise.all([contentPromise, dedupeFilesPromise]);
                return yield this.bundle(file, content, dedupeFiles, includePaths);
            }
            catch (error) {
                return {
                    filePath: file,
                    found: false
                };
            }
        });
    }
    bundle(filePath, content, dedupeFiles, includePaths) {
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
                yield this.resolveImport(importData, includePaths);
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
                    let bundledImport = yield this.bundle(imp.fullPath, impContent, dedupeFiles, includePaths);
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
                        // Reset content to replace to an empty string to skip it
                        contentToReplace = "";
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
    resolveImport(importData, includePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.access(importData.fullPath);
                importData.found = true;
            }
            catch (error) {
                const underscoredDirname = path.dirname(importData.fullPath);
                const underscoredBasename = path.basename(importData.fullPath);
                const underscoredFilePath = path.join(underscoredDirname, `_${underscoredBasename}`);
                try {
                    yield fs.access(underscoredFilePath);
                    importData.fullPath = underscoredFilePath;
                    importData.found = true;
                }
                catch (underscoreErr) {
                    // If there are any includePaths
                    if (includePaths.length) {
                        // Resolve fullPath using its first entry
                        importData.fullPath = path.resolve(includePaths[0], importData.path);
                        // Try resolving import with the remaining includePaths
                        const remainingIncludePaths = includePaths.slice(1);
                        return this.resolveImport(importData, remainingIncludePaths);
                    }
                }
            }
            return importData;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0FBQ2hELE1BQU0sd0JBQXdCLEdBQUcsc0JBQXNCLENBQUM7QUFDeEQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDO0FBdUIvQjtJQU1JLFlBQW9CLGVBQTZCLEVBQUU7UUFBL0IsaUJBQVksR0FBWixZQUFZLENBQW1CO1FBTG5ELDZDQUE2QztRQUNyQyxnQkFBVyxHQUE4QixFQUFFLENBQUM7UUFDcEQsNkJBQTZCO1FBQ3JCLGtCQUFhLEdBQXNDLEVBQUUsQ0FBQztJQUVQLENBQUM7SUFFM0MsU0FBUyxDQUNsQixLQUFlLEVBQ2YsV0FBcUI7O1lBRXJCLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsTUFBTSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM5QyxDQUFDO0tBQUE7SUFFWSxNQUFNLENBQUMsSUFBWSxFQUFFLGNBQXdCLEVBQUUsRUFBRSxlQUF5QixFQUFFOztZQUNyRixJQUFJLENBQUM7Z0JBQ0QsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBRTlELGlEQUFpRDtnQkFDakQsTUFB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RyxDQUFDLENBQUM7b0JBQ2hCLENBQUM7b0JBRUQscUJBQXFCO29CQUNyQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRXJELGtCQUFrQjtvQkFDbEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUFBO0NBQ0o7QUFoT0QsMEJBZ09DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcIm16L2ZzXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGdsb2JzIGZyb20gXCJnbG9ic1wiO1xyXG5cclxuaW1wb3J0ICogYXMgSGVscGVycyBmcm9tIFwiLi9oZWxwZXJzXCI7XHJcblxyXG5jb25zdCBJTVBPUlRfUEFUVEVSTiA9IC9AaW1wb3J0IFsnXCJdKC4rKVsnXCJdOy9nO1xyXG5jb25zdCBDT01NRU5URURfSU1QT1JUX1BBVFRFUk4gPSAvXFwvXFwvQGltcG9ydCAnKC4rKSc7L2c7XHJcbmNvbnN0IEZJTEVfRVhURU5TSU9OID0gXCIuc2Nzc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlUmVnaXN0cnkge1xyXG4gICAgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0RGF0YSB7XHJcbiAgICBpbXBvcnRTdHJpbmc6IHN0cmluZztcclxuICAgIHBhdGg6IHN0cmluZztcclxuICAgIGZ1bGxQYXRoOiBzdHJpbmc7XHJcbiAgICBmb3VuZDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVSZXN1bHQge1xyXG4gICAgLy8gQ2hpbGQgaW1wb3J0cyAoaWYgYW55KVxyXG4gICAgaW1wb3J0cz86IEJ1bmRsZVJlc3VsdFtdO1xyXG4gICAgZGVkdXBlZD86IGJvb2xlYW47XHJcbiAgICAvLyBGdWxsIHBhdGggb2YgdGhlIGZpbGVcclxuICAgIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgICBidW5kbGVkQ29udGVudD86IHN0cmluZztcclxuICAgIGZvdW5kOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQnVuZGxlciB7XHJcbiAgICAvLyBGdWxsIHBhdGhzIG9mIHVzZWQgaW1wb3J0cyBhbmQgdGhlaXIgY291bnRcclxuICAgIHByaXZhdGUgdXNlZEltcG9ydHM6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0gPSB7fTtcclxuICAgIC8vIEltcG9ydHMgZGljdGlvbmFyeSBieSBmaWxlXHJcbiAgICBwcml2YXRlIGltcG9ydHNCeUZpbGU6IHsgW2tleTogc3RyaW5nXTogQnVuZGxlUmVzdWx0W10gfSA9IHt9O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkgPSB7fSkgeyB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZUFsbChcclxuICAgICAgICBmaWxlczogc3RyaW5nW10sXHJcbiAgICAgICAgZGVkdXBlR2xvYnM6IHN0cmluZ1tdXHJcbiAgICApOiBQcm9taXNlPEJ1bmRsZVJlc3VsdFtdPiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0c1Byb21pc2VzID0gZmlsZXMubWFwKGZpbGUgPT4gdGhpcy5CdW5kbGUoZmlsZSwgZGVkdXBlR2xvYnMpKTtcclxuICAgICAgICByZXR1cm4gYXdhaXQgUHJvbWlzZS5hbGwocmVzdWx0c1Byb21pc2VzKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgQnVuZGxlKGZpbGU6IHN0cmluZywgZGVkdXBlR2xvYnM6IHN0cmluZ1tdID0gW10sIGluY2x1ZGVQYXRoczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8QnVuZGxlUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZpbGUpO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50UHJvbWlzZSA9IGZzLnJlYWRGaWxlKGZpbGUsIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlZHVwZUZpbGVzUHJvbWlzZSA9IHRoaXMuZ2xvYkZpbGVzT3JFbXB0eShkZWR1cGVHbG9icyk7XHJcblxyXG4gICAgICAgICAgICAvLyBBd2FpdCBhbGwgYXN5bmMgb3BlcmF0aW9ucyBhbmQgZXh0cmFjdCByZXN1bHRzXHJcbiAgICAgICAgICAgIGNvbnN0IFtjb250ZW50LCBkZWR1cGVGaWxlc10gPSBhd2FpdCBQcm9taXNlLmFsbChbY29udGVudFByb21pc2UsIGRlZHVwZUZpbGVzUHJvbWlzZV0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYnVuZGxlKGZpbGUsIGNvbnRlbnQsIGRlZHVwZUZpbGVzLCBpbmNsdWRlUGF0aHMpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogZmlsZSxcclxuICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1bmRsZShcclxuICAgICAgICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gICAgICAgIGNvbnRlbnQ6IHN0cmluZyxcclxuICAgICAgICBkZWR1cGVGaWxlczogc3RyaW5nW10sXHJcbiAgICAgICAgaW5jbHVkZVBhdGhzOiBzdHJpbmdbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICAvLyBSZW1vdmUgY29tbWVudGVkIGltcG9ydHNcclxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKENPTU1FTlRFRF9JTVBPUlRfUEFUVEVSTiwgXCJcIik7XHJcblxyXG4gICAgICAgIC8vIFJlc29sdmUgcGF0aCB0byB3b3JrIG9ubHkgd2l0aCBmdWxsIHBhdGhzXHJcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLnJlc29sdmUoZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBjb25zdCBkaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9IGNvbnRlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIGltcG9ydHMgZmlsZSBuYW1lcyAocHJlcGVuZCB1bmRlcnNjb3JlIGZvciBwYXJ0aWFscylcclxuICAgICAgICBjb25zdCBpbXBvcnRzUHJvbWlzZXMgPSBIZWxwZXJzLmdldEFsbE1hdGNoZXMoY29udGVudCwgSU1QT1JUX1BBVFRFUk4pLm1hcChhc3luYyBtYXRjaCA9PiB7XHJcbiAgICAgICAgICAgIGxldCBpbXBvcnROYW1lID0gbWF0Y2hbMV07XHJcbiAgICAgICAgICAgIC8vIEFwcGVuZCBleHRlbnNpb24gaWYgaXQncyBhYnNlbnRcclxuICAgICAgICAgICAgaWYgKGltcG9ydE5hbWUuaW5kZXhPZihGSUxFX0VYVEVOU0lPTikgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnROYW1lICs9IEZJTEVfRVhURU5TSU9OO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGRpcm5hbWUsIGltcG9ydE5hbWUpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaW1wb3J0RGF0YTogSW1wb3J0RGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIGltcG9ydFN0cmluZzogbWF0Y2hbMF0sXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBpbXBvcnROYW1lLFxyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGg6IGZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlc29sdmVJbXBvcnQoaW1wb3J0RGF0YSwgaW5jbHVkZVBhdGhzKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbXBvcnREYXRhO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBXYWl0IGZvciBhbGwgaW1wb3J0cyBmaWxlIG5hbWVzIHRvIGJlIHJlc29sdmVkXHJcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IGF3YWl0IFByb21pc2UuYWxsKGltcG9ydHNQcm9taXNlcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0ID0ge1xyXG4gICAgICAgICAgICBmaWxlUGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgIGZvdW5kOiB0cnVlXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2hvdWxkQ2hlY2tGb3JEZWR1cGVzID0gZGVkdXBlRmlsZXMgIT0gbnVsbCAmJiBkZWR1cGVGaWxlcy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICAvLyBCdW5kbGUgYWxsIGltcG9ydHNcclxuICAgICAgICBjb25zdCBjdXJyZW50SW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IGltcCBvZiBpbXBvcnRzKSB7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50VG9SZXBsYWNlO1xyXG5cclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRJbXBvcnQ6IEJ1bmRsZVJlc3VsdDtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIG5laXRoZXIgaW1wb3J0IGZpbGUsIG5vciBwYXJ0aWFsIGlzIGZvdW5kXHJcbiAgICAgICAgICAgIGlmICghaW1wLmZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBBZGQgZW1wdHkgYnVuZGxlIHJlc3VsdCB3aXRoIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogaW1wLmZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIGZpbGUgaXMgbm90IHlldCBpbiB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIC8vIFJlYWRcclxuICAgICAgICAgICAgICAgIGxldCBpbXBDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoaW1wLmZ1bGxQYXRoLCBcInV0Zi04XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFuZCBidW5kbGUgaXRcclxuICAgICAgICAgICAgICAgIGxldCBidW5kbGVkSW1wb3J0ID0gYXdhaXQgdGhpcy5idW5kbGUoaW1wLmZ1bGxQYXRoLCBpbXBDb250ZW50LCBkZWR1cGVGaWxlcywgaW5jbHVkZVBhdGhzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBUaGVuIGFkZCBpdHMgYnVuZGxlZCBjb250ZW50IHRvIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgdGhpcy5maWxlUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9IGJ1bmRsZWRJbXBvcnQuYnVuZGxlZENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQWRkIGl0IHRvIHVzZWQgaW1wb3J0cywgaWYgaXQncyBub3QgdGhlcmVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwgJiYgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIEFuZCB3aG9sZSBCdW5kbGVSZXN1bHQgdG8gY3VycmVudCBpbXBvcnRzXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0gYnVuZGxlZEltcG9ydDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpbGUgaXMgaW4gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICAvLyBJbmNyZW1lbnQgaXQncyB1c2FnZSBjb3VudFxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgY2hpbGQgaW1wb3J0cywgaWYgdGhlcmUgYXJlIGFueVxyXG4gICAgICAgICAgICAgICAgbGV0IGNoaWxkSW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltcG9ydHNCeUZpbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkSW1wb3J0cyA9IHRoaXMuaW1wb3J0c0J5RmlsZVtpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbnN0cnVjdCBhbmQgYWRkIHJlc3VsdCB0byBjdXJyZW50IGltcG9ydHNcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGltcC5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRzOiBjaGlsZEltcG9ydHNcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFRha2UgY29udGVudFRvUmVwbGFjZSBmcm9tIHRoZSBmaWxlUmVnaXN0cnlcclxuICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF07XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB0aGUgY29udGVudCBpcyBub3QgZm91bmRcclxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUb1JlcGxhY2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSW5kaWNhdGUgdGhpcyB3aXRoIGEgY29tbWVudCBmb3IgZWFzaWVyIGRlYnVnZ2luZ1xyXG4gICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IGAvKioqIElNUE9SVEVEIEZJTEUgTk9UIEZPVU5EICoqKi8ke29zLkVPTH0ke2ltcC5pbXBvcnRTdHJpbmd9LyoqKiAtLS0gKioqL2A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIElmIHVzZWRJbXBvcnRzIGRpY3Rpb25hcnkgaXMgZGVmaW5lZFxyXG4gICAgICAgICAgICBpZiAoc2hvdWxkQ2hlY2tGb3JEZWR1cGVzICYmIHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gQW5kIGN1cnJlbnQgaW1wb3J0IHBhdGggc2hvdWxkIGJlIGRlZHVwZWQgYW5kIGlzIHVzZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXNVc2VkID0gdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlZHVwZUZpbGVzLmluZGV4T2YoaW1wLmZ1bGxQYXRoKSAhPT0gLTEgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc1VzZWQgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzVXNlZCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBjb250ZW50IHRvIHJlcGxhY2UgdG8gYW4gZW1wdHkgc3RyaW5nIHRvIHNraXAgaXRcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBBbmQgaW5kaWNhdGUgdGhhdCBpbXBvcnQgd2FzIGRlZHVwZWRcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0LmRlZHVwZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBGaW5hbGx5LCByZXBsYWNlIGltcG9ydCBzdHJpbmcgd2l0aCBidW5kbGVkIGNvbnRlbnQgb3IgYSBkZWJ1ZyBtZXNzYWdlXHJcbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoaW1wLmltcG9ydFN0cmluZywgY29udGVudFRvUmVwbGFjZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBBbmQgcHVzaCBjdXJyZW50IGltcG9ydCBpbnRvIHRoZSBsaXN0XHJcbiAgICAgICAgICAgIGN1cnJlbnRJbXBvcnRzLnB1c2goY3VycmVudEltcG9ydCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZXQgcmVzdWx0IHByb3BlcnRpZXNcclxuICAgICAgICBidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQgPSBjb250ZW50O1xyXG4gICAgICAgIGJ1bmRsZVJlc3VsdC5pbXBvcnRzID0gY3VycmVudEltcG9ydHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmltcG9ydHNCeUZpbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmltcG9ydHNCeUZpbGVbZmlsZVBhdGhdID0gY3VycmVudEltcG9ydHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYnVuZGxlUmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCBpbmNsdWRlUGF0aHMpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBmcy5hY2Nlc3MoaW1wb3J0RGF0YS5mdWxsUGF0aCk7XHJcbiAgICAgICAgICAgIGltcG9ydERhdGEuZm91bmQgPSB0cnVlO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkRGlybmFtZSA9IHBhdGguZGlybmFtZShpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWRCYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoaW1wb3J0RGF0YS5mdWxsUGF0aCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkRmlsZVBhdGggPSBwYXRoLmpvaW4odW5kZXJzY29yZWREaXJuYW1lLCBgXyR7dW5kZXJzY29yZWRCYXNlbmFtZX1gKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGZzLmFjY2Vzcyh1bmRlcnNjb3JlZEZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZnVsbFBhdGggPSB1bmRlcnNjb3JlZEZpbGVQYXRoO1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0RGF0YS5mb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKHVuZGVyc2NvcmVFcnIpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgaW5jbHVkZVBhdGhzXHJcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZVBhdGhzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgZnVsbFBhdGggdXNpbmcgaXRzIGZpcnN0IGVudHJ5XHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0RGF0YS5mdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShpbmNsdWRlUGF0aHNbMF0sIGltcG9ydERhdGEucGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHJlc29sdmluZyBpbXBvcnQgd2l0aCB0aGUgcmVtYWluaW5nIGluY2x1ZGVQYXRoc1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ0luY2x1ZGVQYXRocyA9IGluY2x1ZGVQYXRocy5zbGljZSgxKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlSW1wb3J0KGltcG9ydERhdGEsIHJlbWFpbmluZ0luY2x1ZGVQYXRocyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbXBvcnREYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2xvYkZpbGVzT3JFbXB0eShnbG9ic0xpc3Q6IHN0cmluZ1tdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChnbG9ic0xpc3QgPT0gbnVsbCB8fCBnbG9ic0xpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnbG9icyhnbG9ic0xpc3QsIChlcnI6IEVycm9yLCBmaWxlczogc3RyaW5nW10pID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFJlamVjdCBpZiB0aGVyZSdzIGFuIGVycm9yXHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBmdWxsIHBhdGhzXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBmaWxlcy5tYXAoZmlsZSA9PiBwYXRoLnJlc29sdmUoZmlsZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgcHJvbWlzZVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=