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
const COMMENT_PATTERN = /\/\/.*$/gm;
const MULTILINE_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const FILE_EXTENSION = ".scss";
const NODE_MODULES = "node_modules";
const TILDE = "~";
class Bundler {
    constructor(fileRegistry = {}, projectDirectory) {
        this.fileRegistry = fileRegistry;
        this.projectDirectory = projectDirectory;
        // Full paths of used imports and their count
        this.usedImports = {};
        // Imports dictionary by file
        this.importsByFile = {};
    }
    BundleAll(files, dedupeGlobs = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const resultsPromises = files.map((file) => __awaiter(this, void 0, void 0, function* () { return this.Bundle(file, dedupeGlobs); }));
            return Promise.all(resultsPromises);
        });
    }
    Bundle(file, dedupeGlobs = [], includePaths = [], ignoredImports = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.projectDirectory != null) {
                    file = path.resolve(this.projectDirectory, file);
                }
                yield fs.access(file);
                const contentPromise = fs.readFile(file, "utf-8");
                const dedupeFilesPromise = this.globFilesOrEmpty(dedupeGlobs);
                // Await all async operations and extract results
                const [content, dedupeFiles] = yield Promise.all([contentPromise, dedupeFilesPromise]);
                // Convert string array into regular expressions
                const ignoredImportsRegEx = ignoredImports.map(ignoredImport => new RegExp(ignoredImport));
                return this.bundle(file, content, dedupeFiles, includePaths, ignoredImportsRegEx);
            }
            catch (_a) {
                return {
                    filePath: file,
                    found: false
                };
            }
        });
    }
    bundle(filePath, content, dedupeFiles, includePaths, ignoredImports) {
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
                // Determine if import should be ignored
                const ignored = ignoredImports.findIndex(ignoredImportRegex => ignoredImportRegex.test(importName)) !== -1;
                let fullPath;
                // Check for tilde import.
                const tilde = importName.startsWith(TILDE);
                if (tilde && this.projectDirectory != null) {
                    importName = `./${NODE_MODULES}/${importName.substr(TILDE.length, importName.length)}`;
                    fullPath = path.resolve(this.projectDirectory, importName);
                }
                else {
                    fullPath = path.resolve(dirname, importName);
                }
                const importData = {
                    importString: match[0],
                    tilde: tilde,
                    path: importName,
                    fullPath: fullPath,
                    found: false,
                    ignored: ignored
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
                        tilde: imp.tilde,
                        found: false
                    };
                }
                else if (this.fileRegistry[imp.fullPath] == null) {
                    // If file is not yet in the registry
                    // Read
                    const impContent = yield fs.readFile(imp.fullPath, "utf-8");
                    // and bundle it
                    const bundledImport = yield this.bundle(imp.fullPath, impContent, dedupeFiles, includePaths, ignoredImports);
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
                        tilde: imp.tilde,
                        found: true,
                        imports: childImports
                    };
                }
                if (imp.ignored) {
                    if (this.usedImports[imp.fullPath] > 1) {
                        contentToReplace = "";
                    }
                    else {
                        contentToReplace = imp.importString;
                    }
                }
                else {
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
                        if (dedupeFiles.indexOf(imp.fullPath) !== -1 && timesUsed != null && timesUsed > 1) {
                            // Reset content to replace to an empty string to skip it
                            contentToReplace = "";
                            // And indicate that import was deduped
                            currentImport.deduped = true;
                        }
                    }
                }
                // Finally, replace import string with bundled content or a debug message
                content = this.replaceLastOccurance(content, imp.importString, contentToReplace);
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
    replaceLastOccurance(content, importString, contentToReplace) {
        const index = content.lastIndexOf(importString);
        return content.slice(0, index) + content.slice(index).replace(importString, contentToReplace);
    }
    removeImportsFromComments(text) {
        const patterns = [COMMENT_PATTERN, MULTILINE_COMMENT_PATTERN];
        for (const pattern of patterns) {
            text = text.replace(pattern, x => x.replace(IMPORT_PATTERN, ""));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0FBQ2hELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQztBQUNwQyxNQUFNLHlCQUF5QixHQUFHLG1CQUFtQixDQUFDO0FBQ3RELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxjQUFjLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBMEJsQjtJQU1JLFlBQW9CLGVBQTZCLEVBQUUsRUFBbUIsZ0JBQXlCO1FBQTNFLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtRQUFtQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVM7UUFML0YsNkNBQTZDO1FBQ3JDLGdCQUFXLEdBQThCLEVBQUUsQ0FBQztRQUNwRCw2QkFBNkI7UUFDckIsa0JBQWEsR0FBc0MsRUFBRSxDQUFDO0lBRXFDLENBQUM7SUFFdkYsU0FBUyxDQUFDLEtBQWUsRUFBRSxjQUF3QixFQUFFOztZQUM5RCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUUsZ0RBQUMsT0FBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQSxHQUFBLENBQUMsQ0FBQztZQUNoRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDeEMsQ0FBQztLQUFBO0lBRVksTUFBTSxDQUNmLElBQVksRUFDWixjQUF3QixFQUFFLEVBQzFCLGVBQXlCLEVBQUUsRUFDM0IsaUJBQTJCLEVBQUU7O1lBRTdCLElBQUk7Z0JBQ0EsSUFBSSxJQUFJLENBQUMs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QUFBO0lBRWEsZ0JBQWdCLENBQUMsU0FBbUI7O1lBQzlDLE9BQU8sSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzdDLElBQUksU0FBUyxJQUFJLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDN0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNaLE9BQU87aUJBQ1Y7Z0JBQ0QsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQVUsRUFBRSxLQUFlLEVBQUUsRUFBRTtvQkFDN0MsNkJBQTZCO29CQUM3QixJQUFJLEdBQUcsRUFBRTt3QkFDTCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2Y7b0JBRUQscUJBQXFCO29CQUNyQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUVyRCxrQkFBa0I7b0JBQ2xCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7S0FBQTtDQUNKO0FBL1FELDBCQStRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy1leHRyYVwiO1xyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyBnbG9icyBmcm9tIFwiZ2xvYnNcIjtcclxuXHJcbmltcG9ydCAqIGFzIEhlbHBlcnMgZnJvbSBcIi4vaGVscGVyc1wiO1xyXG5cclxuY29uc3QgSU1QT1JUX1BBVFRFUk4gPSAvQGltcG9ydCBbJ1wiXSguKylbJ1wiXTsvZztcclxuY29uc3QgQ09NTUVOVF9QQVRURVJOID0gL1xcL1xcLy4qJC9nbTtcclxuY29uc3QgTVVMVElMSU5FX0NPTU1FTlRfUEFUVEVSTiA9IC9cXC9cXCpbXFxzXFxTXSo/XFwqXFwvL2c7XHJcbmNvbnN0IEZJTEVfRVhURU5TSU9OID0gXCIuc2Nzc1wiO1xyXG5jb25zdCBOT0RFX01PRFVMRVMgPSBcIm5vZGVfbW9kdWxlc1wiO1xyXG5jb25zdCBUSUxERSA9IFwiflwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlUmVnaXN0cnkge1xyXG4gICAgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0RGF0YSB7XHJcbiAgICBpbXBvcnRTdHJpbmc6IHN0cmluZztcclxuICAgIHRpbGRlOiBib29sZWFuO1xyXG4gICAgcGF0aDogc3RyaW5nO1xyXG4gICAgZnVsbFBhdGg6IHN0cmluZztcclxuICAgIGZvdW5kOiBib29sZWFuO1xyXG4gICAgaWdub3JlZD86IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlUmVzdWx0IHtcclxuICAgIC8vIENoaWxkIGltcG9ydHMgKGlmIGFueSlcclxuICAgIGltcG9ydHM/OiBCdW5kbGVSZXN1bHRbXTtcclxuICAgIHRpbGRlPzogYm9vbGVhbjtcclxuICAgIGRlZHVwZWQ/OiBib29sZWFuO1xyXG4gICAgLy8gRnVsbCBwYXRoIG9mIHRoZSBmaWxlXHJcbiAgICBmaWxlUGF0aDogc3RyaW5nO1xyXG4gICAgYnVuZGxlZENvbnRlbnQ/OiBzdHJpbmc7XHJcbiAgICBmb3VuZDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEJ1bmRsZXIge1xyXG4gICAgLy8gRnVsbCBwYXRocyBvZiB1c2VkIGltcG9ydHMgYW5kIHRoZWlyIGNvdW50XHJcbiAgICBwcml2YXRlIHVzZWRJbXBvcnRzOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9ID0ge307XHJcbiAgICAvLyBJbXBvcnRzIGRpY3Rpb25hcnkgYnkgZmlsZVxyXG4gICAgcHJpdmF0ZSBpbXBvcnRzQnlGaWxlOiB7IFtrZXk6IHN0cmluZ106IEJ1bmRsZVJlc3VsdFtdIH0gPSB7fTtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5ID0ge30sIHByaXZhdGUgcmVhZG9ubHkgcHJvamVjdERpcmVjdG9yeT86IHN0cmluZykgeyB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZUFsbChmaWxlczogc3RyaW5nW10sIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdKTogUHJvbWlzZTxCdW5kbGVSZXN1bHRbXT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHNQcm9taXNlcyA9IGZpbGVzLm1hcChhc3luYyBmaWxlID0+IHRoaXMuQnVuZGxlKGZpbGUsIGRlZHVwZUdsb2JzKSk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHJlc3VsdHNQcm9taXNlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZShcclxuICAgICAgICBmaWxlOiBzdHJpbmcsXHJcbiAgICAgICAgZGVkdXBlR2xvYnM6IHN0cmluZ1tdID0gW10sXHJcbiAgICAgICAgaW5jbHVkZVBhdGhzOiBzdHJpbmdbXSA9IFtdLFxyXG4gICAgICAgIGlnbm9yZWRJbXBvcnRzOiBzdHJpbmdbXSA9IFtdXHJcbiAgICApOiBQcm9taXNlPEJ1bmRsZVJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnByb2plY3REaXJlY3RvcnkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZmlsZSA9IHBhdGgucmVzb2x2ZSh0aGlzLnByb2plY3REaXJlY3RvcnksIGZpbGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBmcy5hY2Nlc3MoZmlsZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRQcm9taXNlID0gZnMucmVhZEZpbGUoZmlsZSwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc3QgZGVkdXBlRmlsZXNQcm9taXNlID0gdGhpcy5nbG9iRmlsZXNPckVtcHR5KGRlZHVwZUdsb2JzKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEF3YWl0IGFsbCBhc3luYyBvcGVyYXRpb25zIGFuZCBleHRyYWN0IHJlc3VsdHNcclxuICAgICAgICAgICAgY29uc3QgW2NvbnRlbnQsIGRlZHVwZUZpbGVzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtjb250ZW50UHJvbWlzZSwgZGVkdXBlRmlsZXNQcm9taXNlXSk7XHJcblxyXG4gICAgICAgICAgICAvLyBDb252ZXJ0IHN0cmluZyBhcnJheSBpbnRvIHJlZ3VsYXIgZXhwcmVzc2lvbnNcclxuICAgICAgICAgICAgY29uc3QgaWdub3JlZEltcG9ydHNSZWdFeCA9IGlnbm9yZWRJbXBvcnRzLm1hcChpZ25vcmVkSW1wb3J0ID0+IG5ldyBSZWdFeHAoaWdub3JlZEltcG9ydCkpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYnVuZGxlKGZpbGUsIGNvbnRlbnQsIGRlZHVwZUZpbGVzLCBpbmNsdWRlUGF0aHMsIGlnbm9yZWRJbXBvcnRzUmVnRXgpO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6IGZpbGUsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBidW5kbGUoXHJcbiAgICAgICAgZmlsZVBhdGg6IHN0cmluZyxcclxuICAgICAgICBjb250ZW50OiBzdHJpbmcsXHJcbiAgICAgICAgZGVkdXBlRmlsZXM6IHN0cmluZ1tdLFxyXG4gICAgICAgIGluY2x1ZGVQYXRoczogc3RyaW5nW10sXHJcbiAgICAgICAgaWdub3JlZEltcG9ydHM6IFJlZ0V4cFtdXHJcbiAgICApOiBQcm9taXNlPEJ1bmRsZVJlc3VsdD4ge1xyXG4gICAgICAgIC8vIFJlbW92ZSBjb21tZW50ZWQgaW1wb3J0c1xyXG4gICAgICAgIGNvbnRlbnQgPSB0aGlzLnJlbW92ZUltcG9ydHNGcm9tQ29tbWVudHMoY29udGVudCk7XHJcblxyXG4gICAgICAgIC8vIFJlc29sdmUgcGF0aCB0byB3b3JrIG9ubHkgd2l0aCBmdWxsIHBhdGhzXHJcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLnJlc29sdmUoZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBjb25zdCBkaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9IGNvbnRlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIGltcG9ydHMgZmlsZSBuYW1lcyAocHJlcGVuZCB1bmRlcnNjb3JlIGZvciBwYXJ0aWFscylcclxuICAgICAgICBjb25zdCBpbXBvcnRzUHJvbWlzZXMgPSBIZWxwZXJzLmdldEFsbE1hdGNoZXMoY29udGVudCwgSU1QT1JUX1BBVFRFUk4pLm1hcChhc3luYyBtYXRjaCA9PiB7XHJcbiAgICAgICAgICAgIGxldCBpbXBvcnROYW1lID0gbWF0Y2hbMV07XHJcbiAgICAgICAgICAgIC8vIEFwcGVuZCBleHRlbnNpb24gaWYgaXQncyBhYnNlbnRcclxuICAgICAgICAgICAgaWYgKGltcG9ydE5hbWUuaW5kZXhPZihGSUxFX0VYVEVOU0lPTikgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnROYW1lICs9IEZJTEVfRVhURU5TSU9OO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgaW1wb3J0IHNob3VsZCBiZSBpZ25vcmVkXHJcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWQgPSBpZ25vcmVkSW1wb3J0cy5maW5kSW5kZXgoaWdub3JlZEltcG9ydFJlZ2V4ID0+IGlnbm9yZWRJbXBvcnRSZWdleC50ZXN0KGltcG9ydE5hbWUpKSAhPT0gLTE7XHJcblxyXG4gICAgICAgICAgICBsZXQgZnVsbFBhdGg6IHN0cmluZztcclxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRpbGRlIGltcG9ydC5cclxuICAgICAgICAgICAgY29uc3QgdGlsZGU6IGJvb2xlYW4gPSBpbXBvcnROYW1lLnN0YXJ0c1dpdGgoVElMREUpO1xyXG4gICAgICAgICAgICBpZiAodGlsZGUgJiYgdGhpcy5wcm9qZWN0RGlyZWN0b3J5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGltcG9ydE5hbWUgPSBgLi8ke05PREVfTU9EVUxFU30vJHtpbXBvcnROYW1lLnN1YnN0cihUSUxERS5sZW5ndGgsIGltcG9ydE5hbWUubGVuZ3RoKX1gO1xyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUodGhpcy5wcm9qZWN0RGlyZWN0b3J5LCBpbXBvcnROYW1lKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGRpcm5hbWUsIGltcG9ydE5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbXBvcnREYXRhOiBJbXBvcnREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0U3RyaW5nOiBtYXRjaFswXSxcclxuICAgICAgICAgICAgICAgIHRpbGRlOiB0aWxkZSxcclxuICAgICAgICAgICAgICAgIHBhdGg6IGltcG9ydE5hbWUsXHJcbiAgICAgICAgICAgICAgICBmdWxsUGF0aDogZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBpZ25vcmVkOiBpZ25vcmVkXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlc29sdmVJbXBvcnQoaW1wb3J0RGF0YSwgaW5jbHVkZVBhdGhzKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbXBvcnREYXRhO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBXYWl0IGZvciBhbGwgaW1wb3J0cyBmaWxlIG5hbWVzIHRvIGJlIHJlc29sdmVkXHJcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IGF3YWl0IFByb21pc2UuYWxsKGltcG9ydHNQcm9taXNlcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0ID0ge1xyXG4gICAgICAgICAgICBmaWxlUGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgIGZvdW5kOiB0cnVlXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2hvdWxkQ2hlY2tGb3JEZWR1cGVzID0gZGVkdXBlRmlsZXMgIT0gbnVsbCAmJiBkZWR1cGVGaWxlcy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICAvLyBCdW5kbGUgYWxsIGltcG9ydHNcclxuICAgICAgICBjb25zdCBjdXJyZW50SW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IGltcCBvZiBpbXBvcnRzKSB7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50VG9SZXBsYWNlO1xyXG5cclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRJbXBvcnQ6IEJ1bmRsZVJlc3VsdDtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIG5laXRoZXIgaW1wb3J0IGZpbGUsIG5vciBwYXJ0aWFsIGlzIGZvdW5kXHJcbiAgICAgICAgICAgIGlmICghaW1wLmZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBBZGQgZW1wdHkgYnVuZGxlIHJlc3VsdCB3aXRoIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogaW1wLmZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbGRlOiBpbXAudGlsZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgZmlsZSBpcyBub3QgeWV0IGluIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgLy8gUmVhZFxyXG4gICAgICAgICAgICAgICAgY29uc3QgaW1wQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGltcC5mdWxsUGF0aCwgXCJ1dGYtOFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhbmQgYnVuZGxlIGl0XHJcbiAgICAgICAgICAgICAgICBjb25zdCBidW5kbGVkSW1wb3J0ID0gYXdhaXQgdGhpcy5idW5kbGUoaW1wLmZ1bGxQYXRoLCBpbXBDb250ZW50LCBkZWR1cGVGaWxlcywgaW5jbHVkZVBhdGhzLCBpZ25vcmVkSW1wb3J0cyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gVGhlbiBhZGQgaXRzIGJ1bmRsZWQgY29udGVudCB0byB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF0gPSBidW5kbGVkSW1wb3J0LmJ1bmRsZWRDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEFkZCBpdCB0byB1c2VkIGltcG9ydHMsIGlmIGl0J3Mgbm90IHRoZXJlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VkSW1wb3J0cyAhPSBudWxsICYmIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBBbmQgd2hvbGUgQnVuZGxlUmVzdWx0IHRvIGN1cnJlbnQgaW1wb3J0c1xyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IGJ1bmRsZWRJbXBvcnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaWxlIGlzIGluIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgLy8gSW5jcmVtZW50IGl0J3MgdXNhZ2UgY291bnRcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0rKztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGNoaWxkIGltcG9ydHMsIGlmIHRoZXJlIGFyZSBhbnlcclxuICAgICAgICAgICAgICAgIGxldCBjaGlsZEltcG9ydHM6IEJ1bmRsZVJlc3VsdFtdID0gW107XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbXBvcnRzQnlGaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZEltcG9ydHMgPSB0aGlzLmltcG9ydHNCeUZpbGVbaW1wLmZ1bGxQYXRoXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDb25zdHJ1Y3QgYW5kIGFkZCByZXN1bHQgdG8gY3VycmVudCBpbXBvcnRzXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBpbXAuZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdGlsZGU6IGltcC50aWxkZSxcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRzOiBjaGlsZEltcG9ydHNcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChpbXAuaWdub3JlZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gXCJcIjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IGltcC5pbXBvcnRTdHJpbmc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gVGFrZSBjb250ZW50VG9SZXBsYWNlIGZyb20gdGhlIGZpbGVSZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF07XHJcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgY29udGVudCBpcyBub3QgZm91bmRcclxuICAgICAgICAgICAgICAgIGlmIChjb250ZW50VG9SZXBsYWNlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbmRpY2F0ZSB0aGlzIHdpdGggYSBjb21tZW50IGZvciBlYXNpZXIgZGVidWdnaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IGAvKioqIElNUE9SVEVEIEZJTEUgTk9UIEZPVU5EICoqKi8ke29zLkVPTH0ke2ltcC5pbXBvcnRTdHJpbmd9LyoqKiAtLS0gKioqL2A7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gSWYgdXNlZEltcG9ydHMgZGljdGlvbmFyeSBpcyBkZWZpbmVkXHJcbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQ2hlY2tGb3JEZWR1cGVzICYmIHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFuZCBjdXJyZW50IGltcG9ydCBwYXRoIHNob3VsZCBiZSBkZWR1cGVkIGFuZCBpcyB1c2VkIGFscmVhZHlcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lc1VzZWQgPSB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlZHVwZUZpbGVzLmluZGV4T2YoaW1wLmZ1bGxQYXRoKSAhPT0gLTEgJiYgdGltZXNVc2VkICE9IG51bGwgJiYgdGltZXNVc2VkID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBjb250ZW50IHRvIHJlcGxhY2UgdG8gYW4gZW1wdHkgc3RyaW5nIHRvIHNraXAgaXRcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFuZCBpbmRpY2F0ZSB0aGF0IGltcG9ydCB3YXMgZGVkdXBlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0LmRlZHVwZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gRmluYWxseSwgcmVwbGFjZSBpbXBvcnQgc3RyaW5nIHdpdGggYnVuZGxlZCBjb250ZW50IG9yIGEgZGVidWcgbWVzc2FnZVxyXG4gICAgICAgICAgICBjb250ZW50ID0gdGhpcy5yZXBsYWNlTGFzdE9jY3VyYW5jZShjb250ZW50LCBpbXAuaW1wb3J0U3RyaW5nLCBjb250ZW50VG9SZXBsYWNlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEFuZCBwdXNoIGN1cnJlbnQgaW1wb3J0IGludG8gdGhlIGxpc3RcclxuICAgICAgICAgICAgY3VycmVudEltcG9ydHMucHVzaChjdXJyZW50SW1wb3J0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCByZXN1bHQgcHJvcGVydGllc1xyXG4gICAgICAgIGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCA9IGNvbnRlbnQ7XHJcbiAgICAgICAgYnVuZGxlUmVzdWx0LmltcG9ydHMgPSBjdXJyZW50SW1wb3J0cztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW1wb3J0c0J5RmlsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW1wb3J0c0J5RmlsZVtmaWxlUGF0aF0gPSBjdXJyZW50SW1wb3J0cztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBidW5kbGVSZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZXBsYWNlTGFzdE9jY3VyYW5jZShjb250ZW50OiBzdHJpbmcsIGltcG9ydFN0cmluZzogc3RyaW5nLCBjb250ZW50VG9SZXBsYWNlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gY29udGVudC5sYXN0SW5kZXhPZihpbXBvcnRTdHJpbmcpO1xyXG4gICAgICAgIHJldHVybiBjb250ZW50LnNsaWNlKDAsIGluZGV4KSArIGNvbnRlbnQuc2xpY2UoaW5kZXgpLnJlcGxhY2UoaW1wb3J0U3RyaW5nLCBjb250ZW50VG9SZXBsYWNlKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZUltcG9ydHNGcm9tQ29tbWVudHModGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBwYXR0ZXJucyA9IFtDT01NRU5UX1BBVFRFUk4sIE1VTFRJTElORV9DT01NRU5UX1BBVFRFUk5dO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcclxuICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShwYXR0ZXJuLCB4ID0+IHgucmVwbGFjZShJTVBPUlRfUEFUVEVSTiwgXCJcIikpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRleHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNvbHZlSW1wb3J0KGltcG9ydERhdGEsIGluY2x1ZGVQYXRocyk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGltcG9ydERhdGEuZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZERpcm5hbWUgPSBwYXRoLmRpcm5hbWUoaW1wb3J0RGF0YS5mdWxsUGF0aCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkQmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGltcG9ydERhdGEuZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZEZpbGVQYXRoID0gcGF0aC5qb2luKHVuZGVyc2NvcmVkRGlybmFtZSwgYF8ke3VuZGVyc2NvcmVkQmFzZW5hbWV9YCk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5hY2Nlc3ModW5kZXJzY29yZWRGaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZ1bGxQYXRoID0gdW5kZXJzY29yZWRGaWxlUGF0aDtcclxuICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGNhdGNoICh1bmRlcnNjb3JlRXJyKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGluY2x1ZGVQYXRoc1xyXG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVQYXRocy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGZ1bGxQYXRoIHVzaW5nIGl0cyBmaXJzdCBlbnRyeVxyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoaW5jbHVkZVBhdGhzWzBdLCBpbXBvcnREYXRhLnBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSByZXNvbHZpbmcgaW1wb3J0IHdpdGggdGhlIHJlbWFpbmluZyBpbmNsdWRlUGF0aHNcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdJbmNsdWRlUGF0aHMgPSBpbmNsdWRlUGF0aHMuc2xpY2UoMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCByZW1haW5pbmdJbmNsdWRlUGF0aHMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW1wb3J0RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdsb2JGaWxlc09yRW1wdHkoZ2xvYnNMaXN0OiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgaWYgKGdsb2JzTGlzdCA9PSBudWxsIHx8IGdsb2JzTGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoW10pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdsb2JzKGdsb2JzTGlzdCwgKGVycjogRXJyb3IsIGZpbGVzOiBzdHJpbmdbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVqZWN0IGlmIHRoZXJlJ3MgYW4gZXJyb3JcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGZ1bGwgcGF0aHNcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbGVzLm1hcChmaWxlID0+IHBhdGgucmVzb2x2ZShmaWxlKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBwcm9taXNlXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==