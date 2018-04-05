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
                yield fs.access(file);
                const contentPromise = fs.readFile(file, "utf-8");
                const dedupeFilesPromise = this.globFilesOrEmpty(dedupeGlobs);
                // Await all async operations and extract results
                const [content, dedupeFiles] = yield Promise.all([contentPromise, dedupeFilesPromise]);
                return this.bundle(file, content, dedupeFiles, includePaths);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0FBQ2hELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQztBQUNwQyxNQUFNLHlCQUF5QixHQUFHLG1CQUFtQixDQUFDO0FBQ3RELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxjQUFjLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBeUJsQjtJQU1JLFlBQW9CLGVBQTZCLEVBQUUsRUFBbUIsZ0JBQXlCO1FBQTNFLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtRQUFtQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVM7UUFML0YsNkNBQTZDO1FBQ3JDLGdCQUFXLEdBQThCLEVBQUUsQ0FBQztRQUNwRCw2QkFBNkI7UUFDckIsa0JBQWEsR0FBc0MsRUFBRSxDQUFDO0lBRW9DLENBQUM7SUFFdEYsU0FBUyxDQUFDLEtBQWUsRUFBRSxjQUF3QixFQUFFOztZQUM5RCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUUsZ0RBQUMsT0FBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQSxHQUFBLENBQUMsQ0FBQztZQUNoRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDeEMsQ0FBQztLQUFBO0lBRVksTUFBTSxDQUFDLElBQVksRUFBRSxjQUF3QixFQUFFLEVBQUUsZUFBeUIsRUFBRTs7WUFDckYsSUFBSTtnQkFDQSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFD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Q0FBQztLQUFBO0lBRWEsZ0JBQWdCLENBQUMsU0FBbUI7O1lBQzlDLE9BQU8sSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzdDLElBQUksU0FBUyxJQUFJLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDN0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNaLE9BQU87aUJBQ1Y7Z0JBQ0QsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQVUsRUFBRSxLQUFlLEVBQUUsRUFBRTtvQkFDN0MsNkJBQTZCO29CQUM3QixJQUFJLEdBQUcsRUFBRTt3QkFDTCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2Y7b0JBRUQscUJBQXFCO29CQUNyQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUVyRCxrQkFBa0I7b0JBQ2xCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7S0FBQTtDQUNKO0FBM09ELDBCQTJPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy1leHRyYVwiO1xyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyBnbG9icyBmcm9tIFwiZ2xvYnNcIjtcclxuXHJcbmltcG9ydCAqIGFzIEhlbHBlcnMgZnJvbSBcIi4vaGVscGVyc1wiO1xyXG5cclxuY29uc3QgSU1QT1JUX1BBVFRFUk4gPSAvQGltcG9ydCBbJ1wiXSguKylbJ1wiXTsvZztcclxuY29uc3QgQ09NTUVOVF9QQVRURVJOID0gL1xcL1xcLy4qJC9nbTtcclxuY29uc3QgTVVMVElMSU5FX0NPTU1FTlRfUEFUVEVSTiA9IC9cXC9cXCpbXFxzXFxTXSo/XFwqXFwvL2c7XHJcbmNvbnN0IEZJTEVfRVhURU5TSU9OID0gXCIuc2Nzc1wiO1xyXG5jb25zdCBOT0RFX01PRFVMRVMgPSBcIm5vZGVfbW9kdWxlc1wiO1xyXG5jb25zdCBUSUxERSA9IFwiflwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlUmVnaXN0cnkge1xyXG4gICAgW2lkOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0RGF0YSB7XHJcbiAgICBpbXBvcnRTdHJpbmc6IHN0cmluZztcclxuICAgIHRpbGRlOiBib29sZWFuO1xyXG4gICAgcGF0aDogc3RyaW5nO1xyXG4gICAgZnVsbFBhdGg6IHN0cmluZztcclxuICAgIGZvdW5kOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEJ1bmRsZVJlc3VsdCB7XHJcbiAgICAvLyBDaGlsZCBpbXBvcnRzIChpZiBhbnkpXHJcbiAgICBpbXBvcnRzPzogQnVuZGxlUmVzdWx0W107XHJcbiAgICB0aWxkZT86IGJvb2xlYW47XHJcbiAgICBkZWR1cGVkPzogYm9vbGVhbjtcclxuICAgIC8vIEZ1bGwgcGF0aCBvZiB0aGUgZmlsZVxyXG4gICAgZmlsZVBhdGg6IHN0cmluZztcclxuICAgIGJ1bmRsZWRDb250ZW50Pzogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCdW5kbGVyIHtcclxuICAgIC8vIEZ1bGwgcGF0aHMgb2YgdXNlZCBpbXBvcnRzIGFuZCB0aGVpciBjb3VudFxyXG4gICAgcHJpdmF0ZSB1c2VkSW1wb3J0czogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9O1xyXG4gICAgLy8gSW1wb3J0cyBkaWN0aW9uYXJ5IGJ5IGZpbGVcclxuICAgIHByaXZhdGUgaW1wb3J0c0J5RmlsZTogeyBba2V5OiBzdHJpbmddOiBCdW5kbGVSZXN1bHRbXSB9ID0ge307XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBmaWxlUmVnaXN0cnk6IEZpbGVSZWdpc3RyeSA9IHt9LCBwcml2YXRlIHJlYWRvbmx5IHByb2plY3REaXJlY3Rvcnk/OiBzdHJpbmcpIHt9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZUFsbChmaWxlczogc3RyaW5nW10sIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdKTogUHJvbWlzZTxCdW5kbGVSZXN1bHRbXT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHNQcm9taXNlcyA9IGZpbGVzLm1hcChhc3luYyBmaWxlID0+IHRoaXMuQnVuZGxlKGZpbGUsIGRlZHVwZUdsb2JzKSk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHJlc3VsdHNQcm9taXNlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZShmaWxlOiBzdHJpbmcsIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdLCBpbmNsdWRlUGF0aHM6IHN0cmluZ1tdID0gW10pOiBQcm9taXNlPEJ1bmRsZVJlc3VsdD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhmaWxlKTtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudFByb21pc2UgPSBmcy5yZWFkRmlsZShmaWxlLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBkZWR1cGVGaWxlc1Byb21pc2UgPSB0aGlzLmdsb2JGaWxlc09yRW1wdHkoZGVkdXBlR2xvYnMpO1xyXG5cclxuICAgICAgICAgICAgLy8gQXdhaXQgYWxsIGFzeW5jIG9wZXJhdGlvbnMgYW5kIGV4dHJhY3QgcmVzdWx0c1xyXG4gICAgICAgICAgICBjb25zdCBbY29udGVudCwgZGVkdXBlRmlsZXNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW2NvbnRlbnRQcm9taXNlLCBkZWR1cGVGaWxlc1Byb21pc2VdKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJ1bmRsZShmaWxlLCBjb250ZW50LCBkZWR1cGVGaWxlcywgaW5jbHVkZVBhdGhzKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6IGZpbGUsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBidW5kbGUoZmlsZVBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBkZWR1cGVGaWxlczogc3RyaW5nW10sIGluY2x1ZGVQYXRoczogc3RyaW5nW10pOiBQcm9taXNlPEJ1bmRsZVJlc3VsdD4ge1xyXG4gICAgICAgIC8vIFJlbW92ZSBjb21tZW50ZWQgaW1wb3J0c1xyXG4gICAgICAgIGNvbnRlbnQgPSB0aGlzLnJlbW92ZUltcG9ydHNGcm9tQ29tbWVudHMoY29udGVudCk7XHJcblxyXG4gICAgICAgIC8vIFJlc29sdmUgcGF0aCB0byB3b3JrIG9ubHkgd2l0aCBmdWxsIHBhdGhzXHJcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLnJlc29sdmUoZmlsZVBhdGgpO1xyXG5cclxuICAgICAgICBjb25zdCBkaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5W2ZpbGVQYXRoXSA9IGNvbnRlbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIGltcG9ydHMgZmlsZSBuYW1lcyAocHJlcGVuZCB1bmRlcnNjb3JlIGZvciBwYXJ0aWFscylcclxuICAgICAgICBjb25zdCBpbXBvcnRzUHJvbWlzZXMgPSBIZWxwZXJzLmdldEFsbE1hdGNoZXMoY29udGVudCwgSU1QT1JUX1BBVFRFUk4pLm1hcChhc3luYyBtYXRjaCA9PiB7XHJcbiAgICAgICAgICAgIGxldCBpbXBvcnROYW1lID0gbWF0Y2hbMV07XHJcbiAgICAgICAgICAgIC8vIEFwcGVuZCBleHRlbnNpb24gaWYgaXQncyBhYnNlbnRcclxuICAgICAgICAgICAgaWYgKGltcG9ydE5hbWUuaW5kZXhPZihGSUxFX0VYVEVOU0lPTikgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnROYW1lICs9IEZJTEVfRVhURU5TSU9OO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZnVsbFBhdGg6IHN0cmluZztcclxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRpbGRlIGltcG9ydC5cclxuICAgICAgICAgICAgY29uc3QgdGlsZGU6IGJvb2xlYW4gPSBpbXBvcnROYW1lLnN0YXJ0c1dpdGgoVElMREUpO1xyXG4gICAgICAgICAgICBpZiAodGlsZGUgJiYgdGhpcy5wcm9qZWN0RGlyZWN0b3J5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGltcG9ydE5hbWUgPSBgLi8ke05PREVfTU9EVUxFU30vJHtpbXBvcnROYW1lLnN1YnN0cihUSUxERS5sZW5ndGgsIGltcG9ydE5hbWUubGVuZ3RoKX1gO1xyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUodGhpcy5wcm9qZWN0RGlyZWN0b3J5LCBpbXBvcnROYW1lKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGRpcm5hbWUsIGltcG9ydE5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbXBvcnREYXRhOiBJbXBvcnREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0U3RyaW5nOiBtYXRjaFswXSxcclxuICAgICAgICAgICAgICAgIHRpbGRlOiB0aWxkZSxcclxuICAgICAgICAgICAgICAgIHBhdGg6IGltcG9ydE5hbWUsXHJcbiAgICAgICAgICAgICAgICBmdWxsUGF0aDogZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCBpbmNsdWRlUGF0aHMpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGltcG9ydERhdGE7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFdhaXQgZm9yIGFsbCBpbXBvcnRzIGZpbGUgbmFtZXMgdG8gYmUgcmVzb2x2ZWRcclxuICAgICAgICBjb25zdCBpbXBvcnRzID0gYXdhaXQgUHJvbWlzZS5hbGwoaW1wb3J0c1Byb21pc2VzKTtcclxuXHJcbiAgICAgICAgY29uc3QgYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQgPSB7XHJcbiAgICAgICAgICAgIGZpbGVQYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICAgICAgZm91bmQ6IHRydWVcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBzaG91bGRDaGVja0ZvckRlZHVwZXMgPSBkZWR1cGVGaWxlcyAhPSBudWxsICYmIGRlZHVwZUZpbGVzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgIC8vIEJ1bmRsZSBhbGwgaW1wb3J0c1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJbXBvcnRzOiBCdW5kbGVSZXN1bHRbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgaW1wIG9mIGltcG9ydHMpIHtcclxuICAgICAgICAgICAgbGV0IGNvbnRlbnRUb1JlcGxhY2U7XHJcblxyXG4gICAgICAgICAgICBsZXQgY3VycmVudEltcG9ydDogQnVuZGxlUmVzdWx0O1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgbmVpdGhlciBpbXBvcnQgZmlsZSwgbm9yIHBhcnRpYWwgaXMgZm91bmRcclxuICAgICAgICAgICAgaWYgKCFpbXAuZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIC8vIEFkZCBlbXB0eSBidW5kbGUgcmVzdWx0IHdpdGggZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBpbXAuZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdGlsZGU6IGltcC50aWxkZSxcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5maWxlUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiBmaWxlIGlzIG5vdCB5ZXQgaW4gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICAvLyBSZWFkXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbXBDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoaW1wLmZ1bGxQYXRoLCBcInV0Zi04XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFuZCBidW5kbGUgaXRcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJ1bmRsZWRJbXBvcnQgPSBhd2FpdCB0aGlzLmJ1bmRsZShpbXAuZnVsbFBhdGgsIGltcENvbnRlbnQsIGRlZHVwZUZpbGVzLCBpbmNsdWRlUGF0aHMpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFRoZW4gYWRkIGl0cyBidW5kbGVkIGNvbnRlbnQgdG8gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdID0gYnVuZGxlZEltcG9ydC5idW5kbGVkQ29udGVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBBZGQgaXQgdG8gdXNlZCBpbXBvcnRzLCBpZiBpdCdzIG5vdCB0aGVyZVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCAmJiB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSA9IDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQW5kIHdob2xlIEJ1bmRsZVJlc3VsdCB0byBjdXJyZW50IGltcG9ydHNcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSBidW5kbGVkSW1wb3J0O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gRmlsZSBpcyBpbiB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIC8vIEluY3JlbWVudCBpdCdzIHVzYWdlIGNvdW50XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VkSW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBjaGlsZCBpbXBvcnRzLCBpZiB0aGVyZSBhcmUgYW55XHJcbiAgICAgICAgICAgICAgICBsZXQgY2hpbGRJbXBvcnRzOiBCdW5kbGVSZXN1bHRbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW1wb3J0c0J5RmlsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRJbXBvcnRzID0gdGhpcy5pbXBvcnRzQnlGaWxlW2ltcC5mdWxsUGF0aF07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ29uc3RydWN0IGFuZCBhZGQgcmVzdWx0IHRvIGN1cnJlbnQgaW1wb3J0c1xyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogaW1wLmZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbGRlOiBpbXAudGlsZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0czogY2hpbGRJbXBvcnRzXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBUYWtlIGNvbnRlbnRUb1JlcGxhY2UgZnJvbSB0aGUgZmlsZVJlZ2lzdHJ5XHJcbiAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSB0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAvLyBJZiB0aGUgY29udGVudCBpcyBub3QgZm91bmRcclxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUb1JlcGxhY2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gSW5kaWNhdGUgdGhpcyB3aXRoIGEgY29tbWVudCBmb3IgZWFzaWVyIGRlYnVnZ2luZ1xyXG4gICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IGAvKioqIElNUE9SVEVEIEZJTEUgTk9UIEZPVU5EICoqKi8ke29zLkVPTH0ke2ltcC5pbXBvcnRTdHJpbmd9LyoqKiAtLS0gKioqL2A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIElmIHVzZWRJbXBvcnRzIGRpY3Rpb25hcnkgaXMgZGVmaW5lZFxyXG4gICAgICAgICAgICBpZiAoc2hvdWxkQ2hlY2tGb3JEZWR1cGVzICYmIHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgLy8gQW5kIGN1cnJlbnQgaW1wb3J0IHBhdGggc2hvdWxkIGJlIGRlZHVwZWQgYW5kIGlzIHVzZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZXNVc2VkID0gdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlZHVwZUZpbGVzLmluZGV4T2YoaW1wLmZ1bGxQYXRoKSAhPT0gLTEgJiYgdGltZXNVc2VkICE9IG51bGwgJiYgdGltZXNVc2VkID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IGNvbnRlbnQgdG8gcmVwbGFjZSB0byBhbiBlbXB0eSBzdHJpbmcgdG8gc2tpcCBpdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFuZCBpbmRpY2F0ZSB0aGF0IGltcG9ydCB3YXMgZGVkdXBlZFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQuZGVkdXBlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmFsbHksIHJlcGxhY2UgaW1wb3J0IHN0cmluZyB3aXRoIGJ1bmRsZWQgY29udGVudCBvciBhIGRlYnVnIG1lc3NhZ2VcclxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShpbXAuaW1wb3J0U3RyaW5nLCBjb250ZW50VG9SZXBsYWNlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEFuZCBwdXNoIGN1cnJlbnQgaW1wb3J0IGludG8gdGhlIGxpc3RcclxuICAgICAgICAgICAgY3VycmVudEltcG9ydHMucHVzaChjdXJyZW50SW1wb3J0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCByZXN1bHQgcHJvcGVydGllc1xyXG4gICAgICAgIGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCA9IGNvbnRlbnQ7XHJcbiAgICAgICAgYnVuZGxlUmVzdWx0LmltcG9ydHMgPSBjdXJyZW50SW1wb3J0cztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW1wb3J0c0J5RmlsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW1wb3J0c0J5RmlsZVtmaWxlUGF0aF0gPSBjdXJyZW50SW1wb3J0cztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBidW5kbGVSZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmVJbXBvcnRzRnJvbUNvbW1lbnRzKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgcGF0dGVybnMgPSBbQ09NTUVOVF9QQVRURVJOLCBNVUxUSUxJTkVfQ09NTUVOVF9QQVRURVJOXTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XHJcbiAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UocGF0dGVybiwgeCA9PiB4LnJlcGxhY2UoSU1QT1JUX1BBVFRFUk4sIFwiXCIpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCBpbmNsdWRlUGF0aHMpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgaW1wb3J0RGF0YS5mb3VuZCA9IHRydWU7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWREaXJuYW1lID0gcGF0aC5kaXJuYW1lKGltcG9ydERhdGEuZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZEJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWRGaWxlUGF0aCA9IHBhdGguam9pbih1bmRlcnNjb3JlZERpcm5hbWUsIGBfJHt1bmRlcnNjb3JlZEJhc2VuYW1lfWApO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKHVuZGVyc2NvcmVkRmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0RGF0YS5mdWxsUGF0aCA9IHVuZGVyc2NvcmVkRmlsZVBhdGg7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBjYXRjaCAodW5kZXJzY29yZUVycikge1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGFueSBpbmNsdWRlUGF0aHNcclxuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlUGF0aHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBmdWxsUGF0aCB1c2luZyBpdHMgZmlyc3QgZW50cnlcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGluY2x1ZGVQYXRoc1swXSwgaW1wb3J0RGF0YS5wYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgcmVzb2x2aW5nIGltcG9ydCB3aXRoIHRoZSByZW1haW5pbmcgaW5jbHVkZVBhdGhzXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nSW5jbHVkZVBhdGhzID0gaW5jbHVkZVBhdGhzLnNsaWNlKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVJbXBvcnQoaW1wb3J0RGF0YSwgcmVtYWluaW5nSW5jbHVkZVBhdGhzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGltcG9ydERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnbG9iRmlsZXNPckVtcHR5KGdsb2JzTGlzdDogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChnbG9ic0xpc3QgPT0gbnVsbCB8fCBnbG9ic0xpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnbG9icyhnbG9ic0xpc3QsIChlcnI6IEVycm9yLCBmaWxlczogc3RyaW5nW10pID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFJlamVjdCBpZiB0aGVyZSdzIGFuIGVycm9yXHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBmdWxsIHBhdGhzXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBmaWxlcy5tYXAoZmlsZSA9PiBwYXRoLnJlc29sdmUoZmlsZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgcHJvbWlzZVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=