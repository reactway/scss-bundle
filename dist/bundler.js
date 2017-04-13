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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0FBQ2hELE1BQU0sd0JBQXdCLEdBQUcsc0JBQXNCLENBQUM7QUFDeEQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDO0FBdUIvQjtJQU1JLFlBQW9CLGVBQTZCLEVBQUU7UUFBL0IsaUJBQVksR0FBWixZQUFZLENBQW1CO1FBTG5ELDZDQUE2QztRQUNyQyxnQkFBVyxHQUE4QixFQUFFLENBQUM7UUFDcEQsNkJBQTZCO1FBQ3JCLGtCQUFhLEdBQXNDLEVBQUUsQ0FBQztJQUVQLENBQUM7SUFFM0MsU0FBUyxDQUNsQixLQUFlLEVBQ2YsV0FBcUI7O1lBRXJCLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsTUFBTSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM5QyxDQUFDO0tBQUE7SUFFWSxNQUFNLENBQUMsSUFBWSxFQUFFLGNBQXdCLEVBQUU7O1lBQ3hELElBQUksQ0FBQztnQkFDRCxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RCLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNsRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFFOUQsaURBQWlEO2dCQUNqRCxNQUFNLENBQUMsT0FBTyxFQUFF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Q0FBQztZQUNsRCxDQUFDO1lBRUQsTUFBTSxDQUFDLFlBQVksQ0FBQztRQUN4QixDQUFDO0tBQUE7SUFFYSxnQkFBZ0IsQ0FBQyxTQUFtQjs7WUFDOUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFXLENBQUMsT0FBTyxFQUFFLE1BQU07Z0JBQ3pDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5QyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ1osTUFBTSxDQUFDO2dCQUNYLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQVUsRUFBRSxLQUFlO29CQUN6Qyw2QkFBNkI7b0JBQzdCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ04sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQixDQUFDO29CQUVELHFCQUFxQjtvQkFDckIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUVyRCxrQkFBa0I7b0JBQ2xCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7S0FBQTtDQUNKO0FBbk5ELDBCQW1OQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJtei9mc1wiO1xyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyBnbG9icyBmcm9tIFwiZ2xvYnNcIjtcclxuXHJcbmltcG9ydCAqIGFzIEhlbHBlcnMgZnJvbSBcIi4vaGVscGVyc1wiO1xyXG5cclxuY29uc3QgSU1QT1JUX1BBVFRFUk4gPSAvQGltcG9ydCBbJ1wiXSguKylbJ1wiXTsvZztcclxuY29uc3QgQ09NTUVOVEVEX0lNUE9SVF9QQVRURVJOID0gL1xcL1xcL0BpbXBvcnQgJyguKyknOy9nO1xyXG5jb25zdCBGSUxFX0VYVEVOU0lPTiA9IFwiLnNjc3NcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVJlZ2lzdHJ5IHtcclxuICAgIFtpZDogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydERhdGEge1xyXG4gICAgaW1wb3J0U3RyaW5nOiBzdHJpbmc7XHJcbiAgICBwYXRoOiBzdHJpbmc7XHJcbiAgICBmdWxsUGF0aDogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlUmVzdWx0IHtcclxuICAgIC8vIENoaWxkIGltcG9ydHMgKGlmIGFueSlcclxuICAgIGltcG9ydHM/OiBCdW5kbGVSZXN1bHRbXTtcclxuICAgIGRlZHVwZWQ/OiBib29sZWFuO1xyXG4gICAgLy8gRnVsbCBwYXRoIG9mIHRoZSBmaWxlXHJcbiAgICBmaWxlUGF0aDogc3RyaW5nO1xyXG4gICAgYnVuZGxlZENvbnRlbnQ/OiBzdHJpbmc7XHJcbiAgICBmb3VuZDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEJ1bmRsZXIge1xyXG4gICAgLy8gRnVsbCBwYXRocyBvZiB1c2VkIGltcG9ydHMgYW5kIHRoZWlyIGNvdW50XHJcbiAgICBwcml2YXRlIHVzZWRJbXBvcnRzOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9ID0ge307XHJcbiAgICAvLyBJbXBvcnRzIGRpY3Rpb25hcnkgYnkgZmlsZVxyXG4gICAgcHJpdmF0ZSBpbXBvcnRzQnlGaWxlOiB7IFtrZXk6IHN0cmluZ106IEJ1bmRsZVJlc3VsdFtdIH0gPSB7fTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5ID0ge30pIHsgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGVBbGwoXHJcbiAgICAgICAgZmlsZXM6IHN0cmluZ1tdLFxyXG4gICAgICAgIGRlZHVwZUdsb2JzOiBzdHJpbmdbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHRbXT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHNQcm9taXNlcyA9IGZpbGVzLm1hcChmaWxlID0+IHRoaXMuQnVuZGxlKGZpbGUsIGRlZHVwZUdsb2JzKSk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IFByb21pc2UuYWxsKHJlc3VsdHNQcm9taXNlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZShmaWxlOiBzdHJpbmcsIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdKTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBmcy5hY2Nlc3MoZmlsZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRQcm9taXNlID0gZnMucmVhZEZpbGUoZmlsZSwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc3QgZGVkdXBlRmlsZXNQcm9taXNlID0gdGhpcy5nbG9iRmlsZXNPckVtcHR5KGRlZHVwZUdsb2JzKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEF3YWl0IGFsbCBhc3luYyBvcGVyYXRpb25zIGFuZCBleHRyYWN0IHJlc3VsdHNcclxuICAgICAgICAgICAgY29uc3QgW2NvbnRlbnQsIGRlZHVwZUZpbGVzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtjb250ZW50UHJvbWlzZSwgZGVkdXBlRmlsZXNQcm9taXNlXSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5idW5kbGUoZmlsZSwgY29udGVudCwgZGVkdXBlRmlsZXMpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogZmlsZSxcclxuICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1bmRsZShcclxuICAgICAgICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gICAgICAgIGNvbnRlbnQ6IHN0cmluZyxcclxuICAgICAgICBkZWR1cGVGaWxlczogc3RyaW5nW11cclxuICAgICk6IFByb21pc2U8QnVuZGxlUmVzdWx0PiB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIGNvbW1lbnRlZCBpbXBvcnRzXHJcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShDT01NRU5URURfSU1QT1JUX1BBVFRFUk4sIFwiXCIpO1xyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIHBhdGggdG8gd29yayBvbmx5IHdpdGggZnVsbCBwYXRoc1xyXG4gICAgICAgIGZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmZpbGVSZWdpc3RyeVtmaWxlUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVSZWdpc3RyeVtmaWxlUGF0aF0gPSBjb250ZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVzb2x2ZSBpbXBvcnRzIGZpbGUgbmFtZXMgKHByZXBlbmQgdW5kZXJzY29yZSBmb3IgcGFydGlhbHMpXHJcbiAgICAgICAgY29uc3QgaW1wb3J0c1Byb21pc2VzID0gSGVscGVycy5nZXRBbGxNYXRjaGVzKGNvbnRlbnQsIElNUE9SVF9QQVRURVJOKS5tYXAoYXN5bmMgbWF0Y2ggPT4ge1xyXG4gICAgICAgICAgICBsZXQgaW1wb3J0TmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICAgICAgICAvLyBBcHBlbmQgZXh0ZW5zaW9uIGlmIGl0J3MgYWJzZW50XHJcbiAgICAgICAgICAgIGlmIChpbXBvcnROYW1lLmluZGV4T2YoRklMRV9FWFRFTlNJT04pID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0TmFtZSArPSBGSUxFX0VYVEVOU0lPTjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShkaXJuYW1lLCBpbXBvcnROYW1lKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGltcG9ydERhdGE6IEltcG9ydERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnRTdHJpbmc6IG1hdGNoWzBdLFxyXG4gICAgICAgICAgICAgICAgcGF0aDogaW1wb3J0TmFtZSxcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoOiBmdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkRGlybmFtZSA9IHBhdGguZGlybmFtZShmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZEJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZEZpbGVQYXRoID0gcGF0aC5qb2luKHVuZGVyc2NvcmVkRGlybmFtZSwgYF8ke3VuZGVyc2NvcmVkQmFzZW5hbWV9YCk7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLmFjY2Vzcyh1bmRlcnNjb3JlZEZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZ1bGxQYXRoID0gdW5kZXJzY29yZWRGaWxlUGF0aDtcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHVuZGVyc2NvcmVFcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBOZWl0aGVyIGZpbGUsIG5vciBwYXJ0aWFsIHdhcyBmb3VuZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXBwaW5nLi4uXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbXBvcnREYXRhO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBXYWl0IGZvciBhbGwgaW1wb3J0cyBmaWxlIG5hbWVzIHRvIGJlIHJlc29sdmVkXHJcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IGF3YWl0IFByb21pc2UuYWxsKGltcG9ydHNQcm9taXNlcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0ID0ge1xyXG4gICAgICAgICAgICBmaWxlUGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgIGZvdW5kOiB0cnVlXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2hvdWxkQ2hlY2tGb3JEZWR1cGVzID0gZGVkdXBlRmlsZXMgIT0gbnVsbCAmJiBkZWR1cGVGaWxlcy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICAvLyBCdW5kbGUgYWxsIGltcG9ydHNcclxuICAgICAgICBjb25zdCBjdXJyZW50SW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IGltcCBvZiBpbXBvcnRzKSB7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50VG9SZXBsYWNlO1xyXG5cclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRJbXBvcnQ6IEJ1bmRsZVJlc3VsdDtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIG5laXRoZXIgaW1wb3J0IGZpbGUsIG5vciBwYXJ0aWFsIGlzIGZvdW5kXHJcbiAgICAgICAgICAgIGlmICghaW1wLmZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBBZGQgZW1wdHkgYnVuZGxlIHJlc3VsdCB3aXRoIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogaW1wLmZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIGZpbGUgaXMgbm90IHlldCBpbiB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIC8vIFJlYWRcclxuICAgICAgICAgICAgICAgIGxldCBpbXBDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoaW1wLmZ1bGxQYXRoLCBcInV0Zi04XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFuZCBidW5kbGUgaXRcclxuICAgICAgICAgICAgICAgIGxldCBidW5kbGVkSW1wb3J0ID0gYXdhaXQgdGhpcy5idW5kbGUoaW1wLmZ1bGxQYXRoLCBpbXBDb250ZW50LCBkZWR1cGVGaWxlcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gVGhlbiBhZGQgaXRzIGJ1bmRsZWQgY29udGVudCB0byB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF0gPSBidW5kbGVkSW1wb3J0LmJ1bmRsZWRDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEFkZCBpdCB0byB1c2VkIGltcG9ydHMsIGlmIGl0J3Mgbm90IHRoZXJlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VkSW1wb3J0cyAhPSBudWxsICYmIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBBbmQgd2hvbGUgQnVuZGxlUmVzdWx0IHRvIGN1cnJlbnQgaW1wb3J0c1xyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IGJ1bmRsZWRJbXBvcnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaWxlIGlzIGluIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgLy8gSW5jcmVtZW50IGl0J3MgdXNhZ2UgY291bnRcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0rKztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGNoaWxkIGltcG9ydHMsIGlmIHRoZXJlIGFyZSBhbnlcclxuICAgICAgICAgICAgICAgIGxldCBjaGlsZEltcG9ydHM6IEJ1bmRsZVJlc3VsdFtdID0gW107XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbXBvcnRzQnlGaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZEltcG9ydHMgPSB0aGlzLmltcG9ydHNCeUZpbGVbaW1wLmZ1bGxQYXRoXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDb25zdHJ1Y3QgYW5kIGFkZCByZXN1bHQgdG8gY3VycmVudCBpbXBvcnRzXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBpbXAuZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0czogY2hpbGRJbXBvcnRzXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBUYWtlIGNvbnRlbnRUb1JlcGxhY2UgZnJvbSB0aGUgZmlsZVJlZ2lzdHJ5XHJcbiAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSB0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgdGhlIGNvbnRlbnQgaXMgbm90IGZvdW5kXHJcbiAgICAgICAgICAgIGlmIChjb250ZW50VG9SZXBsYWNlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vIEluZGljYXRlIHRoaXMgd2l0aCBhIGNvbW1lbnQgZm9yIGVhc2llciBkZWJ1Z2dpbmdcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSBgLyoqKiBJTVBPUlRFRCBGSUxFIE5PVCBGT1VORCAqKiovJHtvcy5FT0x9JHtpbXAuaW1wb3J0U3RyaW5nfS8qKiogLS0tICoqKi9gO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB1c2VkSW1wb3J0cyBkaWN0aW9uYXJ5IGlzIGRlZmluZWRcclxuICAgICAgICAgICAgaWYgKHNob3VsZENoZWNrRm9yRGVkdXBlcyAmJiB0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vIEFuZCBjdXJyZW50IGltcG9ydCBwYXRoIHNob3VsZCBiZSBkZWR1cGVkIGFuZCBpcyB1c2VkIGFscmVhZHlcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzVXNlZCA9IHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXTtcclxuICAgICAgICAgICAgICAgIGlmIChkZWR1cGVGaWxlcy5pbmRleE9mKGltcC5mdWxsUGF0aCkgIT09IC0xICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZXNVc2VkICE9IG51bGwgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc1VzZWQgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgY29udGVudCB0byBhbiBlbXB0eSBzdHJpbmcgdG8gc2tpcCBpdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFuZCBpbmRpY2F0ZSB0aGF0IGltcG9ydCB3YXMgZGVkdXBlZFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQuZGVkdXBlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmFsbHksIHJlcGxhY2UgaW1wb3J0IHN0cmluZyB3aXRoIGJ1bmRsZWQgY29udGVudCBvciBhIGRlYnVnIG1lc3NhZ2VcclxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShpbXAuaW1wb3J0U3RyaW5nLCBjb250ZW50VG9SZXBsYWNlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEFuZCBwdXNoIGN1cnJlbnQgaW1wb3J0IGludG8gdGhlIGxpc3RcclxuICAgICAgICAgICAgY3VycmVudEltcG9ydHMucHVzaChjdXJyZW50SW1wb3J0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCByZXN1bHQgcHJvcGVydGllc1xyXG4gICAgICAgIGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCA9IGNvbnRlbnQ7XHJcbiAgICAgICAgYnVuZGxlUmVzdWx0LmltcG9ydHMgPSBjdXJyZW50SW1wb3J0cztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW1wb3J0c0J5RmlsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW1wb3J0c0J5RmlsZVtmaWxlUGF0aF0gPSBjdXJyZW50SW1wb3J0cztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBidW5kbGVSZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnbG9iRmlsZXNPckVtcHR5KGdsb2JzTGlzdDogc3RyaW5nW10pIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgaWYgKGdsb2JzTGlzdCA9PSBudWxsIHx8IGdsb2JzTGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoW10pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdsb2JzKGdsb2JzTGlzdCwgKGVycjogRXJyb3IsIGZpbGVzOiBzdHJpbmdbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVqZWN0IGlmIHRoZXJlJ3MgYW4gZXJyb3JcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGZ1bGwgcGF0aHNcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbGVzLm1hcChmaWxlID0+IHBhdGgucmVzb2x2ZShmaWxlKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBwcm9taXNlXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==