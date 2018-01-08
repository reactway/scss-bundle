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
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const globs = require("globs");
const Helpers = require("./helpers");
const IMPORT_PATTERN = /@import ['"](.+)['"];/g;
const COMMENT_PATTERN = /\/\/.+?[\r\n|\n]/g;
const MULTILINE_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
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
            const resultsPromises = files.map((file) => __awaiter(this, void 0, void 0, function* () { return this.Bundle(file, dedupeGlobs); }));
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
            content = this.removeImportsFromComments(content);
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
                    const impContent = yield fs.readFile(imp.fullPath, "utf-8");
                    // and bundle it
                    const bundledImport = yield this.bundle(imp.fullPath, impContent, dedupeFiles, includePaths);
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
    removeImportsFromComments(text) {
        const patterns = [
            COMMENT_PATTERN,
            MULTILINE_COMMENT_PATTERN
        ];
        for (const pattern of patterns) {
            text = text.replace(pattern, x => x.replace(IMPORT_PATTERN, "").trim());
        }
        return text;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0FBQ2hELE1BQU0sZUFBZSxHQUFHLG1CQUFtQixDQUFDO0FBQzVDLE1BQU0seUJBQXlCLEdBQUcsbUJBQW1CLENBQUM7QUFDdEQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDO0FBdUIvQjtJQU1JLFlBQW9CLGVBQTZCLEVBQUU7UUFBL0IsaUJBQVksR0FBWixZQUFZLENBQW1CO1FBTG5ELDZDQUE2QztRQUNyQyxnQkFBVyxHQUE4QixFQUFFLENBQUM7UUFDcEQsNkJBQTZCO1FBQ3JCLGtCQUFhLEdBQXNDLEVBQUUsQ0FBQztJQUVQLENBQUM7SUFFM0MsU0FBUyxDQUNsQixLQUFlLEVBQ2YsV0FBcUI7O1lBRXJCLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBTSxJQUFJLEVBQUMsRUFBRSxnREFBQyxNQUFNLENBQU4sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUEsR0FBQSxDQUFDLENBQUM7WUFDaEYsTUFBTSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM5QyxDQUFDO0tBQUE7SUFFWSxNQUFNLENBQUMsSUFBWSxFQUFFLGNBQXdCLEVBQUUsRUFBRSxlQUF5QixFQUFFOztZQUNyRixJQUFJLENBQUM7Z0JBQ0QsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxrQkFB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WUFFRCxNQUFNLENBQUMsVUFBVSxDQUFDO1FBQ3RCLENBQUM7S0FBQTtJQUVhLGdCQUFnQixDQUFDLFNBQW1COztZQUM5QyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzdDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5QyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ1osTUFBTSxDQUFDO2dCQUNYLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQVUsRUFBRSxLQUFlLEVBQUUsRUFBRTtvQkFDN0MsNkJBQTZCO29CQUM3QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUNOLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEIsQ0FBQztvQkFFRCxxQkFBcUI7b0JBQ3JCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRXJELGtCQUFrQjtvQkFDbEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUFBO0NBQ0o7QUE3T0QsMEJBNk9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzLWV4dHJhXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGdsb2JzIGZyb20gXCJnbG9ic1wiO1xyXG5cclxuaW1wb3J0ICogYXMgSGVscGVycyBmcm9tIFwiLi9oZWxwZXJzXCI7XHJcblxyXG5jb25zdCBJTVBPUlRfUEFUVEVSTiA9IC9AaW1wb3J0IFsnXCJdKC4rKVsnXCJdOy9nO1xyXG5jb25zdCBDT01NRU5UX1BBVFRFUk4gPSAvXFwvXFwvLis/W1xcclxcbnxcXG5dL2c7XHJcbmNvbnN0IE1VTFRJTElORV9DT01NRU5UX1BBVFRFUk4gPSAvXFwvXFwqW1xcc1xcU10qP1xcKlxcLy9nO1xyXG5jb25zdCBGSUxFX0VYVEVOU0lPTiA9IFwiLnNjc3NcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVJlZ2lzdHJ5IHtcclxuICAgIFtpZDogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydERhdGEge1xyXG4gICAgaW1wb3J0U3RyaW5nOiBzdHJpbmc7XHJcbiAgICBwYXRoOiBzdHJpbmc7XHJcbiAgICBmdWxsUGF0aDogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlUmVzdWx0IHtcclxuICAgIC8vIENoaWxkIGltcG9ydHMgKGlmIGFueSlcclxuICAgIGltcG9ydHM/OiBCdW5kbGVSZXN1bHRbXTtcclxuICAgIGRlZHVwZWQ/OiBib29sZWFuO1xyXG4gICAgLy8gRnVsbCBwYXRoIG9mIHRoZSBmaWxlXHJcbiAgICBmaWxlUGF0aDogc3RyaW5nO1xyXG4gICAgYnVuZGxlZENvbnRlbnQ/OiBzdHJpbmc7XHJcbiAgICBmb3VuZDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEJ1bmRsZXIge1xyXG4gICAgLy8gRnVsbCBwYXRocyBvZiB1c2VkIGltcG9ydHMgYW5kIHRoZWlyIGNvdW50XHJcbiAgICBwcml2YXRlIHVzZWRJbXBvcnRzOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9ID0ge307XHJcbiAgICAvLyBJbXBvcnRzIGRpY3Rpb25hcnkgYnkgZmlsZVxyXG4gICAgcHJpdmF0ZSBpbXBvcnRzQnlGaWxlOiB7IFtrZXk6IHN0cmluZ106IEJ1bmRsZVJlc3VsdFtdIH0gPSB7fTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5ID0ge30pIHsgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGVBbGwoXHJcbiAgICAgICAgZmlsZXM6IHN0cmluZ1tdLFxyXG4gICAgICAgIGRlZHVwZUdsb2JzOiBzdHJpbmdbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHRbXT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHNQcm9taXNlcyA9IGZpbGVzLm1hcChhc3luYyBmaWxlID0+IHRoaXMuQnVuZGxlKGZpbGUsIGRlZHVwZUdsb2JzKSk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IFByb21pc2UuYWxsKHJlc3VsdHNQcm9taXNlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZShmaWxlOiBzdHJpbmcsIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdLCBpbmNsdWRlUGF0aHM6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPEJ1bmRsZVJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhmaWxlKTtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudFByb21pc2UgPSBmcy5yZWFkRmlsZShmaWxlLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBkZWR1cGVGaWxlc1Byb21pc2UgPSB0aGlzLmdsb2JGaWxlc09yRW1wdHkoZGVkdXBlR2xvYnMpO1xyXG5cclxuICAgICAgICAgICAgLy8gQXdhaXQgYWxsIGFzeW5jIG9wZXJhdGlvbnMgYW5kIGV4dHJhY3QgcmVzdWx0c1xyXG4gICAgICAgICAgICBjb25zdCBbY29udGVudCwgZGVkdXBlRmlsZXNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW2NvbnRlbnRQcm9taXNlLCBkZWR1cGVGaWxlc1Byb21pc2VdKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJ1bmRsZShmaWxlLCBjb250ZW50LCBkZWR1cGVGaWxlcywgaW5jbHVkZVBhdGhzKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6IGZpbGUsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBidW5kbGUoXHJcbiAgICAgICAgZmlsZVBhdGg6IHN0cmluZyxcclxuICAgICAgICBjb250ZW50OiBzdHJpbmcsXHJcbiAgICAgICAgZGVkdXBlRmlsZXM6IHN0cmluZ1tdLFxyXG4gICAgICAgIGluY2x1ZGVQYXRoczogc3RyaW5nW11cclxuICAgICk6IFByb21pc2U8QnVuZGxlUmVzdWx0PiB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIGNvbW1lbnRlZCBpbXBvcnRzXHJcbiAgICAgICAgY29udGVudCA9IHRoaXMucmVtb3ZlSW1wb3J0c0Zyb21Db21tZW50cyhjb250ZW50KTtcclxuXHJcbiAgICAgICAgLy8gUmVzb2x2ZSBwYXRoIHRvIHdvcmsgb25seSB3aXRoIGZ1bGwgcGF0aHNcclxuICAgICAgICBmaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRpcm5hbWUgPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5maWxlUmVnaXN0cnlbZmlsZVBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5maWxlUmVnaXN0cnlbZmlsZVBhdGhdID0gY29udGVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlc29sdmUgaW1wb3J0cyBmaWxlIG5hbWVzIChwcmVwZW5kIHVuZGVyc2NvcmUgZm9yIHBhcnRpYWxzKVxyXG4gICAgICAgIGNvbnN0IGltcG9ydHNQcm9taXNlcyA9IEhlbHBlcnMuZ2V0QWxsTWF0Y2hlcyhjb250ZW50LCBJTVBPUlRfUEFUVEVSTikubWFwKGFzeW5jIG1hdGNoID0+IHtcclxuICAgICAgICAgICAgbGV0IGltcG9ydE5hbWUgPSBtYXRjaFsxXTtcclxuICAgICAgICAgICAgLy8gQXBwZW5kIGV4dGVuc2lvbiBpZiBpdCdzIGFic2VudFxyXG4gICAgICAgICAgICBpZiAoaW1wb3J0TmFtZS5pbmRleE9mKEZJTEVfRVhURU5TSU9OKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGltcG9ydE5hbWUgKz0gRklMRV9FWFRFTlNJT047XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoZGlybmFtZSwgaW1wb3J0TmFtZSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbXBvcnREYXRhOiBJbXBvcnREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0U3RyaW5nOiBtYXRjaFswXSxcclxuICAgICAgICAgICAgICAgIHBhdGg6IGltcG9ydE5hbWUsXHJcbiAgICAgICAgICAgICAgICBmdWxsUGF0aDogZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCBpbmNsdWRlUGF0aHMpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGltcG9ydERhdGE7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFdhaXQgZm9yIGFsbCBpbXBvcnRzIGZpbGUgbmFtZXMgdG8gYmUgcmVzb2x2ZWRcclxuICAgICAgICBjb25zdCBpbXBvcnRzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1wb3J0c1Byb21pc2VzKTtcclxuXHJcbiAgICAgICAgY29uc3QgYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIGZpbGVQYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICAgICAgZm91bmQ6IHRydWVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBzaG91bGRDaGVja0ZvckRlZHVwZXMgPSBkZWR1cGVGaWxlcyAhPSBudWxsICYmIGRlZHVwZUZpbGVzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgIC8vIEJ1bmRsZSBhbGwgaW1wb3J0c1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJbXBvcnRzOiBCdW5kbGVSZXN1bHRbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgaW1wIG9mIGltcG9ydHMpIHtcclxuICAgICAgICAgICAgbGV0IGNvbnRlbnRUb1JlcGxhY2U7XHJcblxyXG4gICAgICAgICAgICBsZXQgY3VycmVudEltcG9ydDogQnVuZGxlUmVzdWx0O1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgbmVpdGhlciBpbXBvcnQgZmlsZSwgbm9yIHBhcnRpYWwgaXMgZm91bmRcclxuICAgICAgICAgICAgaWYgKCFpbXAuZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIC8vIEFkZCBlbXB0eSBidW5kbGUgcmVzdWx0IHdpdGggZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBpbXAuZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgZmlsZSBpcyBub3QgeWV0IGluIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgLy8gUmVhZFxyXG4gICAgICAgICAgICAgICAgY29uc3QgaW1wQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGltcC5mdWxsUGF0aCwgXCJ1dGYtOFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhbmQgYnVuZGxlIGl0XHJcbiAgICAgICAgICAgICAgICBjb25zdCBidW5kbGVkSW1wb3J0ID0gYXdhaXQgdGhpcy5idW5kbGUoaW1wLmZ1bGxQYXRoLCBpbXBDb250ZW50LCBkZWR1cGVGaWxlcywgaW5jbHVkZVBhdGhzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBUaGVuIGFkZCBpdHMgYnVuZGxlZCBjb250ZW50IHRvIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgdGhpcy5maWxlUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9IGJ1bmRsZWRJbXBvcnQuYnVuZGxlZENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQWRkIGl0IHRvIHVzZWQgaW1wb3J0cywgaWYgaXQncyBub3QgdGhlcmVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwgJiYgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIEFuZCB3aG9sZSBCdW5kbGVSZXN1bHQgdG8gY3VycmVudCBpbXBvcnRzXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0gYnVuZGxlZEltcG9ydDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpbGUgaXMgaW4gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICAvLyBJbmNyZW1lbnQgaXQncyB1c2FnZSBjb3VudFxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgY2hpbGQgaW1wb3J0cywgaWYgdGhlcmUgYXJlIGFueVxyXG4gICAgICAgICAgICAgICAgbGV0IGNoaWxkSW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltcG9ydHNCeUZpbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkSW1wb3J0cyA9IHRoaXMuaW1wb3J0c0J5RmlsZVtpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbnN0cnVjdCBhbmQgYWRkIHJlc3VsdCB0byBjdXJyZW50IGltcG9ydHNcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGltcC5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRzOiBjaGlsZEltcG9ydHNcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFRha2UgY29udGVudFRvUmVwbGFjZSBmcm9tIHRoZSBmaWxlUmVnaXN0cnlcclxuICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF07XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB0aGUgY29udGVudCBpcyBub3QgZm91bmRcclxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUb1JlcGxhY2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSW5kaWNhdGUgdGhpcyB3aXRoIGEgY29tbWVudCBmb3IgZWFzaWVyIGRlYnVnZ2luZ1xyXG4gICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IGAvKioqIElNUE9SVEVEIEZJTEUgTk9UIEZPVU5EICoqKi8ke29zLkVPTH0ke2ltcC5pbXBvcnRTdHJpbmd9LyoqKiAtLS0gKioqL2A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIElmIHVzZWRJbXBvcnRzIGRpY3Rpb25hcnkgaXMgZGVmaW5lZFxyXG4gICAgICAgICAgICBpZiAoc2hvdWxkQ2hlY2tGb3JEZWR1cGVzICYmIHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gQW5kIGN1cnJlbnQgaW1wb3J0IHBhdGggc2hvdWxkIGJlIGRlZHVwZWQgYW5kIGlzIHVzZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXNVc2VkID0gdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlZHVwZUZpbGVzLmluZGV4T2YoaW1wLmZ1bGxQYXRoKSAhPT0gLTEgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc1VzZWQgIT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzVXNlZCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBjb250ZW50IHRvIHJlcGxhY2UgdG8gYW4gZW1wdHkgc3RyaW5nIHRvIHNraXAgaXRcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBBbmQgaW5kaWNhdGUgdGhhdCBpbXBvcnQgd2FzIGRlZHVwZWRcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0LmRlZHVwZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBGaW5hbGx5LCByZXBsYWNlIGltcG9ydCBzdHJpbmcgd2l0aCBidW5kbGVkIGNvbnRlbnQgb3IgYSBkZWJ1ZyBtZXNzYWdlXHJcbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoaW1wLmltcG9ydFN0cmluZywgY29udGVudFRvUmVwbGFjZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBBbmQgcHVzaCBjdXJyZW50IGltcG9ydCBpbnRvIHRoZSBsaXN0XHJcbiAgICAgICAgICAgIGN1cnJlbnRJbXBvcnRzLnB1c2goY3VycmVudEltcG9ydCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZXQgcmVzdWx0IHByb3BlcnRpZXNcclxuICAgICAgICBidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQgPSBjb250ZW50O1xyXG4gICAgICAgIGJ1bmRsZVJlc3VsdC5pbXBvcnRzID0gY3VycmVudEltcG9ydHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmltcG9ydHNCeUZpbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmltcG9ydHNCeUZpbGVbZmlsZVBhdGhdID0gY3VycmVudEltcG9ydHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYnVuZGxlUmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVtb3ZlSW1wb3J0c0Zyb21Db21tZW50cyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IHBhdHRlcm5zID0gW1xyXG4gICAgICAgICAgICBDT01NRU5UX1BBVFRFUk4sXHJcbiAgICAgICAgICAgIE1VTFRJTElORV9DT01NRU5UX1BBVFRFUk5cclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcclxuICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShwYXR0ZXJuLCB4ID0+IHgucmVwbGFjZShJTVBPUlRfUEFUVEVSTiwgXCJcIikudHJpbSgpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCBpbmNsdWRlUGF0aHMpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgaW1wb3J0RGF0YS5mb3VuZCA9IHRydWU7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWREaXJuYW1lID0gcGF0aC5kaXJuYW1lKGltcG9ydERhdGEuZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZEJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWRGaWxlUGF0aCA9IHBhdGguam9pbih1bmRlcnNjb3JlZERpcm5hbWUsIGBfJHt1bmRlcnNjb3JlZEJhc2VuYW1lfWApO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKHVuZGVyc2NvcmVkRmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0RGF0YS5mdWxsUGF0aCA9IHVuZGVyc2NvcmVkRmlsZVBhdGg7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBjYXRjaCAodW5kZXJzY29yZUVycikge1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGFueSBpbmNsdWRlUGF0aHNcclxuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlUGF0aHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBmdWxsUGF0aCB1c2luZyBpdHMgZmlyc3QgZW50cnlcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGluY2x1ZGVQYXRoc1swXSwgaW1wb3J0RGF0YS5wYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgcmVzb2x2aW5nIGltcG9ydCB3aXRoIHRoZSByZW1haW5pbmcgaW5jbHVkZVBhdGhzXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nSW5jbHVkZVBhdGhzID0gaW5jbHVkZVBhdGhzLnNsaWNlKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVJbXBvcnQoaW1wb3J0RGF0YSwgcmVtYWluaW5nSW5jbHVkZVBhdGhzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGltcG9ydERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnbG9iRmlsZXNPckVtcHR5KGdsb2JzTGlzdDogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChnbG9ic0xpc3QgPT0gbnVsbCB8fCBnbG9ic0xpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnbG9icyhnbG9ic0xpc3QsIChlcnI6IEVycm9yLCBmaWxlczogc3RyaW5nW10pID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFJlamVjdCBpZiB0aGVyZSdzIGFuIGVycm9yXHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBmdWxsIHBhdGhzXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBmaWxlcy5tYXAoZmlsZSA9PiBwYXRoLnJlc29sdmUoZmlsZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgcHJvbWlzZVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=