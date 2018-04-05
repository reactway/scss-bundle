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
    Bundle(file, dedupeGlobs = [], includePaths = []) {
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
                return this.bundle(file, content, dedupeFiles, includePaths);
            }
            catch (_a) {
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
                        tilde: imp.tilde,
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
                        tilde: imp.tilde,
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
                    if (dedupeFiles.indexOf(imp.fullPath) !== -1 && timesUsed != null && timesUsed > 1) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0FBQ2hELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQztBQUNwQyxNQUFNLHlCQUF5QixHQUFHLG1CQUFtQixDQUFDO0FBQ3RELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxjQUFjLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBeUJsQjtJQU1JLFlBQW9CLGVBQTZCLEVBQUUsRUFBbUIsZ0JBQXlCO1FBQTNFLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtRQUFtQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVM7UUFML0YsNkNBQTZDO1FBQ3JDLGdCQUFXLEdBQThCLEVBQUUsQ0FBQztRQUNwRCw2QkFBNkI7UUFDckIsa0JBQWEsR0FBc0MsRUFBRSxDQUFDO0lBRW9DLENBQUM7SUFFdEYsU0FBUyxDQUFDLEtBQWUsRUFBRSxjQUF3QixFQUFFOztZQUM5RCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUUsZ0RBQUMsT0FBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQSxHQUFBLENBQUMsQ0FBQztZQUNoRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDeEMsQ0FBQztLQUFBO0lBRVksTUFBTSxDQUFDLElBQVksRUFBRSxjQUF3QixFQUFFLEVBQUUsZUFBeUIsRUFBRTs7WUFDckYsSUFBSTtnQkFDQSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLEVB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LENBQUMsQ0FBQzt3QkFDcEQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO3FCQUNoRTtpQkFDSjthQUNKO1lBRUQsT0FBTyxVQUFVLENBQUM7UUFDdEIsQ0FBQztLQUFBO0lBRWEsZ0JBQWdCLENBQUMsU0FBbUI7O1lBQzlDLE9BQU8sSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzdDLElBQUksU0FBUyxJQUFJLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDN0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNaLE9BQU87aUJBQ1Y7Z0JBQ0QsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQVUsRUFBRSxLQUFlLEVBQUUsRUFBRTtvQkFDN0MsNkJBQTZCO29CQUM3QixJQUFJLEdBQUcsRUFBRTt3QkFDTCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2Y7b0JBRUQscUJBQXFCO29CQUNyQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUVyRCxrQkFBa0I7b0JBQ2xCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7S0FBQTtDQUNKO0FBL09ELDBCQStPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy1leHRyYVwiO1xyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyBnbG9icyBmcm9tIFwiZ2xvYnNcIjtcclxuXHJcbmltcG9ydCAqIGFzIEhlbHBlcnMgZnJvbSBcIi4vaGVscGVyc1wiO1xyXG5cclxuY29uc3QgSU1QT1JUX1BBVFRFUk4gPSAvQGltcG9ydCBbJ1wiXSguKylbJ1wiXTsvZztcclxuY29uc3QgQ09NTUVOVF9QQVRURVJOID0gL1xcL1xcLy4qJC9nbTtcclxuY29uc3QgTVVMVElMSU5FX0NPTU1FTlRfUEFUVEVSTiA9IC9cXC9cXCpbXFxzXFxTXSo/XFwqXFwvL2c7XHJcbmNvbnN0IEZJTEVfRVhURU5TSU9OID0gXCIuc2Nzc1wiO1xyXG5jb25zdCBOT0RFX01PRFVMRVMgPSBcIm5vZGVfbW9kdWxlc1wiO1xyXG5jb25zdCBUSUxERSA9IFwiflwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlUmVnaXN0cnkge1xyXG4gICAgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0RGF0YSB7XHJcbiAgICBpbXBvcnRTdHJpbmc6IHN0cmluZztcclxuICAgIHRpbGRlOiBib29sZWFuO1xyXG4gICAgcGF0aDogc3RyaW5nO1xyXG4gICAgZnVsbFBhdGg6IHN0cmluZztcclxuICAgIGZvdW5kOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEJ1bmRsZVJlc3VsdCB7XHJcbiAgICAvLyBDaGlsZCBpbXBvcnRzIChpZiBhbnkpXHJcbiAgICBpbXBvcnRzPzogQnVuZGxlUmVzdWx0W107XHJcbiAgICB0aWxkZT86IGJvb2xlYW47XHJcbiAgICBkZWR1cGVkPzogYm9vbGVhbjtcclxuICAgIC8vIEZ1bGwgcGF0aCBvZiB0aGUgZmlsZVxyXG4gICAgZmlsZVBhdGg6IHN0cmluZztcclxuICAgIGJ1bmRsZWRDb250ZW50Pzogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCdW5kbGVyIHtcclxuICAgIC8vIEZ1bGwgcGF0aHMgb2YgdXNlZCBpbXBvcnRzIGFuZCB0aGVpciBjb3VudFxyXG4gICAgcHJpdmF0ZSB1c2VkSW1wb3J0czogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9O1xyXG4gICAgLy8gSW1wb3J0cyBkaWN0aW9uYXJ5IGJ5IGZpbGVcclxuICAgIHByaXZhdGUgaW1wb3J0c0J5RmlsZTogeyBba2V5OiBzdHJpbmddOiBCdW5kbGVSZXN1bHRbXSB9ID0ge307XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBmaWxlUmVnaXN0cnk6IEZpbGVSZWdpc3RyeSA9IHt9LCBwcml2YXRlIHJlYWRvbmx5IHByb2plY3REaXJlY3Rvcnk/OiBzdHJpbmcpIHt9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZUFsbChmaWxlczogc3RyaW5nW10sIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdKTogUHJvbWlzZTxCdW5kbGVSZXN1bHRbXT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHNQcm9taXNlcyA9IGZpbGVzLm1hcChhc3luYyBmaWxlID0+IHRoaXMuQnVuZGxlKGZpbGUsIGRlZHVwZUdsb2JzKSk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHJlc3VsdHNQcm9taXNlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZShmaWxlOiBzdHJpbmcsIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdLCBpbmNsdWRlUGF0aHM6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPEJ1bmRsZVJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnByb2plY3REaXJlY3RvcnkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZmlsZSA9IHBhdGgucmVzb2x2ZSh0aGlzLnByb2plY3REaXJlY3RvcnksIGZpbGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBmcy5hY2Nlc3MoZmlsZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRQcm9taXNlID0gZnMucmVhZEZpbGUoZmlsZSwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgY29uc3QgZGVkdXBlRmlsZXNQcm9taXNlID0gdGhpcy5nbG9iRmlsZXNPckVtcHR5KGRlZHVwZUdsb2JzKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEF3YWl0IGFsbCBhc3luYyBvcGVyYXRpb25zIGFuZCBleHRyYWN0IHJlc3VsdHNcclxuICAgICAgICAgICAgY29uc3QgW2NvbnRlbnQsIGRlZHVwZUZpbGVzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtjb250ZW50UHJvbWlzZSwgZGVkdXBlRmlsZXNQcm9taXNlXSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5idW5kbGUoZmlsZSwgY29udGVudCwgZGVkdXBlRmlsZXMsIGluY2x1ZGVQYXRocyk7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogZmlsZSxcclxuICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1bmRsZShmaWxlUGF0aDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIGRlZHVwZUZpbGVzOiBzdHJpbmdbXSwgaW5jbHVkZVBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8QnVuZGxlUmVzdWx0PiB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIGNvbW1lbnRlZCBpbXBvcnRzXHJcbiAgICAgICAgY29udGVudCA9IHRoaXMucmVtb3ZlSW1wb3J0c0Zyb21Db21tZW50cyhjb250ZW50KTtcclxuXHJcbiAgICAgICAgLy8gUmVzb2x2ZSBwYXRoIHRvIHdvcmsgb25seSB3aXRoIGZ1bGwgcGF0aHNcclxuICAgICAgICBmaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRpcm5hbWUgPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5maWxlUmVnaXN0cnlbZmlsZVBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5maWxlUmVnaXN0cnlbZmlsZVBhdGhdID0gY29udGVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlc29sdmUgaW1wb3J0cyBmaWxlIG5hbWVzIChwcmVwZW5kIHVuZGVyc2NvcmUgZm9yIHBhcnRpYWxzKVxyXG4gICAgICAgIGNvbnN0IGltcG9ydHNQcm9taXNlcyA9IEhlbHBlcnMuZ2V0QWxsTWF0Y2hlcyhjb250ZW50LCBJTVBPUlRfUEFUVEVSTikubWFwKGFzeW5jIG1hdGNoID0+IHtcclxuICAgICAgICAgICAgbGV0IGltcG9ydE5hbWUgPSBtYXRjaFsxXTtcclxuICAgICAgICAgICAgLy8gQXBwZW5kIGV4dGVuc2lvbiBpZiBpdCdzIGFic2VudFxyXG4gICAgICAgICAgICBpZiAoaW1wb3J0TmFtZS5pbmRleE9mKEZJTEVfRVhURU5TSU9OKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGltcG9ydE5hbWUgKz0gRklMRV9FWFRFTlNJT047XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBmdWxsUGF0aDogc3RyaW5nO1xyXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgdGlsZGUgaW1wb3J0LlxyXG4gICAgICAgICAgICBjb25zdCB0aWxkZTogYm9vbGVhbiA9IGltcG9ydE5hbWUuc3RhcnRzV2l0aChUSUxERSk7XHJcbiAgICAgICAgICAgIGlmICh0aWxkZSAmJiB0aGlzLnByb2plY3REaXJlY3RvcnkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0TmFtZSA9IGAuLyR7Tk9ERV9NT0RVTEVTfS8ke2ltcG9ydE5hbWUuc3Vic3RyKFRJTERFLmxlbmd0aCwgaW1wb3J0TmFtZS5sZW5ndGgpfWA7XHJcbiAgICAgICAgICAgICAgICBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZSh0aGlzLnByb2plY3REaXJlY3RvcnksIGltcG9ydE5hbWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoZGlybmFtZSwgaW1wb3J0TmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGltcG9ydERhdGE6IEltcG9ydERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnRTdHJpbmc6IG1hdGNoWzBdLFxyXG4gICAgICAgICAgICAgICAgdGlsZGU6IHRpbGRlLFxyXG4gICAgICAgICAgICAgICAgcGF0aDogaW1wb3J0TmFtZSxcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoOiBmdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNvbHZlSW1wb3J0KGltcG9ydERhdGEsIGluY2x1ZGVQYXRocyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW1wb3J0RGF0YTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gV2FpdCBmb3IgYWxsIGltcG9ydHMgZmlsZSBuYW1lcyB0byBiZSByZXNvbHZlZFxyXG4gICAgICAgIGNvbnN0IGltcG9ydHMgPSBhd2FpdCBQcm9taXNlLmFsbChpbXBvcnRzUHJvbWlzZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCA9IHtcclxuICAgICAgICAgICAgZmlsZVBhdGg6IGZpbGVQYXRoLFxyXG4gICAgICAgICAgICBmb3VuZDogdHJ1ZVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHNob3VsZENoZWNrRm9yRGVkdXBlcyA9IGRlZHVwZUZpbGVzICE9IG51bGwgJiYgZGVkdXBlRmlsZXMubGVuZ3RoID4gMDtcclxuXHJcbiAgICAgICAgLy8gQnVuZGxlIGFsbCBpbXBvcnRzXHJcbiAgICAgICAgY29uc3QgY3VycmVudEltcG9ydHM6IEJ1bmRsZVJlc3VsdFtdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBpbXAgb2YgaW1wb3J0cykge1xyXG4gICAgICAgICAgICBsZXQgY29udGVudFRvUmVwbGFjZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50SW1wb3J0OiBCdW5kbGVSZXN1bHQ7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBuZWl0aGVyIGltcG9ydCBmaWxlLCBub3IgcGFydGlhbCBpcyBmb3VuZFxyXG4gICAgICAgICAgICBpZiAoIWltcC5mb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gQWRkIGVtcHR5IGJ1bmRsZSByZXN1bHQgd2l0aCBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGltcC5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0aWxkZTogaW1wLnRpbGRlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIGZpbGUgaXMgbm90IHlldCBpbiB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIC8vIFJlYWRcclxuICAgICAgICAgICAgICAgIGNvbnN0IGltcENvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShpbXAuZnVsbFBhdGgsIFwidXRmLThcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYW5kIGJ1bmRsZSBpdFxyXG4gICAgICAgICAgICAgICAgY29uc3QgYnVuZGxlZEltcG9ydCA9IGF3YWl0IHRoaXMuYnVuZGxlKGltcC5mdWxsUGF0aCwgaW1wQ29udGVudCwgZGVkdXBlRmlsZXMsIGluY2x1ZGVQYXRocyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gVGhlbiBhZGQgaXRzIGJ1bmRsZWQgY29udGVudCB0byB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF0gPSBidW5kbGVkSW1wb3J0LmJ1bmRsZWRDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEFkZCBpdCB0byB1c2VkIGltcG9ydHMsIGlmIGl0J3Mgbm90IHRoZXJlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VkSW1wb3J0cyAhPSBudWxsICYmIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBBbmQgd2hvbGUgQnVuZGxlUmVzdWx0IHRvIGN1cnJlbnQgaW1wb3J0c1xyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IGJ1bmRsZWRJbXBvcnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaWxlIGlzIGluIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgLy8gSW5jcmVtZW50IGl0J3MgdXNhZ2UgY291bnRcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0rKztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGNoaWxkIGltcG9ydHMsIGlmIHRoZXJlIGFyZSBhbnlcclxuICAgICAgICAgICAgICAgIGxldCBjaGlsZEltcG9ydHM6IEJ1bmRsZVJlc3VsdFtdID0gW107XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbXBvcnRzQnlGaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZEltcG9ydHMgPSB0aGlzLmltcG9ydHNCeUZpbGVbaW1wLmZ1bGxQYXRoXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDb25zdHJ1Y3QgYW5kIGFkZCByZXN1bHQgdG8gY3VycmVudCBpbXBvcnRzXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBpbXAuZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdGlsZGU6IGltcC50aWxkZSxcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRzOiBjaGlsZEltcG9ydHNcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFRha2UgY29udGVudFRvUmVwbGFjZSBmcm9tIHRoZSBmaWxlUmVnaXN0cnlcclxuICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IHRoaXMuZmlsZVJlZ2lzdHJ5W2ltcC5mdWxsUGF0aF07XHJcbiAgICAgICAgICAgIC8vIElmIHRoZSBjb250ZW50IGlzIG5vdCBmb3VuZFxyXG4gICAgICAgICAgICBpZiAoY29udGVudFRvUmVwbGFjZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJbmRpY2F0ZSB0aGlzIHdpdGggYSBjb21tZW50IGZvciBlYXNpZXIgZGVidWdnaW5nXHJcbiAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gYC8qKiogSU1QT1JURUQgRklMRSBOT1QgRk9VTkQgKioqLyR7b3MuRU9MfSR7aW1wLmltcG9ydFN0cmluZ30vKioqIC0tLSAqKiovYDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gSWYgdXNlZEltcG9ydHMgZGljdGlvbmFyeSBpcyBkZWZpbmVkXHJcbiAgICAgICAgICAgIGlmIChzaG91bGRDaGVja0ZvckRlZHVwZXMgJiYgdGhpcy51c2VkSW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBBbmQgY3VycmVudCBpbXBvcnQgcGF0aCBzaG91bGQgYmUgZGVkdXBlZCBhbmQgaXMgdXNlZCBhbHJlYWR5XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lc1VzZWQgPSB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF07XHJcbiAgICAgICAgICAgICAgICBpZiAoZGVkdXBlRmlsZXMuaW5kZXhPZihpbXAuZnVsbFBhdGgpICE9PSAtMSAmJiB0aW1lc1VzZWQgIT0gbnVsbCAmJiB0aW1lc1VzZWQgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgY29udGVudCB0byByZXBsYWNlIHRvIGFuIGVtcHR5IHN0cmluZyB0byBza2lwIGl0XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQW5kIGluZGljYXRlIHRoYXQgaW1wb3J0IHdhcyBkZWR1cGVkXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEltcG9ydC5kZWR1cGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmluYWxseSwgcmVwbGFjZSBpbXBvcnQgc3RyaW5nIHdpdGggYnVuZGxlZCBjb250ZW50IG9yIGEgZGVidWcgbWVzc2FnZVxyXG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKGltcC5pbXBvcnRTdHJpbmcsIGNvbnRlbnRUb1JlcGxhY2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gQW5kIHB1c2ggY3VycmVudCBpbXBvcnQgaW50byB0aGUgbGlzdFxyXG4gICAgICAgICAgICBjdXJyZW50SW1wb3J0cy5wdXNoKGN1cnJlbnRJbXBvcnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0IHJlc3VsdCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50ID0gY29udGVudDtcclxuICAgICAgICBidW5kbGVSZXN1bHQuaW1wb3J0cyA9IGN1cnJlbnRJbXBvcnRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pbXBvcnRzQnlGaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbXBvcnRzQnlGaWxlW2ZpbGVQYXRoXSA9IGN1cnJlbnRJbXBvcnRzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJ1bmRsZVJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZUltcG9ydHNGcm9tQ29tbWVudHModGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBwYXR0ZXJucyA9IFtDT01NRU5UX1BBVFRFUk4sIE1VTFRJTElORV9DT01NRU5UX1BBVFRFUk5dO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcclxuICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShwYXR0ZXJuLCB4ID0+IHgucmVwbGFjZShJTVBPUlRfUEFUVEVSTiwgXCJcIikpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRleHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNvbHZlSW1wb3J0KGltcG9ydERhdGEsIGluY2x1ZGVQYXRocyk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGltcG9ydERhdGEuZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZERpcm5hbWUgPSBwYXRoLmRpcm5hbWUoaW1wb3J0RGF0YS5mdWxsUGF0aCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkQmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGltcG9ydERhdGEuZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZEZpbGVQYXRoID0gcGF0aC5qb2luKHVuZGVyc2NvcmVkRGlybmFtZSwgYF8ke3VuZGVyc2NvcmVkQmFzZW5hbWV9YCk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5hY2Nlc3ModW5kZXJzY29yZWRGaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZ1bGxQYXRoID0gdW5kZXJzY29yZWRGaWxlUGF0aDtcclxuICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGNhdGNoICh1bmRlcnNjb3JlRXJyKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGluY2x1ZGVQYXRoc1xyXG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVQYXRocy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGZ1bGxQYXRoIHVzaW5nIGl0cyBmaXJzdCBlbnRyeVxyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoaW5jbHVkZVBhdGhzWzBdLCBpbXBvcnREYXRhLnBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSByZXNvbHZpbmcgaW1wb3J0IHdpdGggdGhlIHJlbWFpbmluZyBpbmNsdWRlUGF0aHNcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdJbmNsdWRlUGF0aHMgPSBpbmNsdWRlUGF0aHMuc2xpY2UoMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCByZW1haW5pbmdJbmNsdWRlUGF0aHMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW1wb3J0RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdsb2JGaWxlc09yRW1wdHkoZ2xvYnNMaXN0OiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgaWYgKGdsb2JzTGlzdCA9PSBudWxsIHx8IGdsb2JzTGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoW10pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdsb2JzKGdsb2JzTGlzdCwgKGVycjogRXJyb3IsIGZpbGVzOiBzdHJpbmdbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVqZWN0IGlmIHRoZXJlJ3MgYW4gZXJyb3JcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGZ1bGwgcGF0aHNcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbGVzLm1hcChmaWxlID0+IHBhdGgucmVzb2x2ZShmaWxlKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBwcm9taXNlXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==