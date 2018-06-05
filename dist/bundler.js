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
const IMPORT_PATTERN = /@import\s+['"](.+)['"];/g;
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
                        found: false,
                        ignored: imp.ignored
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLDBCQUEwQixDQUFDO0FBQ2xELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQztBQUNwQyxNQUFNLHlCQUF5QixHQUFHLG1CQUFtQixDQUFDO0FBQ3RELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQztBQUMvQixNQUFNLFlBQVksR0FBRyxjQUFjLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBMkJsQjtJQU1JLFlBQW9CLGVBQTZCLEVBQUUsRUFBbUIsZ0JBQXlCO1FBQTNFLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtRQUFtQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVM7UUFML0YsNkNBQTZDO1FBQ3JDLGdCQUFXLEdBQThCLEVBQUUsQ0FBQztRQUNwRCw2QkFBNkI7UUFDckIsa0JBQWEsR0FBc0MsRUFBRSxDQUFDO0lBRXFDLENBQUM7SUFFdkYsU0FBUyxDQUFDLEtBQWUsRUFBRSxjQUF3QixFQUFFOztZQUM5RCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUUsZ0RBQUMsT0FBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQSxHQUFBLENBQUMsQ0FBQztZQUNoRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDeEMsQ0FBQztLQUFBO0lBRVksTUFBTSxDQUNmLElBQVksRUFDWixjQUF3QixFQUFFLEVBQzFCLGVBQXlCLEVBQUUsRUFDM0IsaUJBQTJCLEVBQUU7O1lBRTdCLElBQUk7Z0JBQ0EsSUFBSSxJQUFJLENBQUMs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WUFFRCxPQUFPLFVBQVUsQ0FBQztRQUN0QixDQUFDO0tBQUE7SUFFYSxnQkFBZ0IsQ0FBQyxTQUFtQjs7WUFDOUMsT0FBTyxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxTQUFTLElBQUksSUFBSSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUM3QyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ1osT0FBTztpQkFDVjtnQkFDRCxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBVSxFQUFFLEtBQWUsRUFBRSxFQUFFO29CQUM3Qyw2QkFBNkI7b0JBQzdCLElBQUksR0FBRyxFQUFFO3dCQUNMLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDZjtvQkFFRCxxQkFBcUI7b0JBQ3JCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRXJELGtCQUFrQjtvQkFDbEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUFBO0NBQ0o7QUFoUkQsMEJBZ1JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzLWV4dHJhXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGdsb2JzIGZyb20gXCJnbG9ic1wiO1xyXG5cclxuaW1wb3J0ICogYXMgSGVscGVycyBmcm9tIFwiLi9oZWxwZXJzXCI7XHJcblxyXG5jb25zdCBJTVBPUlRfUEFUVEVSTiA9IC9AaW1wb3J0XFxzK1snXCJdKC4rKVsnXCJdOy9nO1xyXG5jb25zdCBDT01NRU5UX1BBVFRFUk4gPSAvXFwvXFwvLiokL2dtO1xyXG5jb25zdCBNVUxUSUxJTkVfQ09NTUVOVF9QQVRURVJOID0gL1xcL1xcKltcXHNcXFNdKj9cXCpcXC8vZztcclxuY29uc3QgRklMRV9FWFRFTlNJT04gPSBcIi5zY3NzXCI7XHJcbmNvbnN0IE5PREVfTU9EVUxFUyA9IFwibm9kZV9tb2R1bGVzXCI7XHJcbmNvbnN0IFRJTERFID0gXCJ+XCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVSZWdpc3RyeSB7XHJcbiAgICBbaWQ6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnREYXRhIHtcclxuICAgIGltcG9ydFN0cmluZzogc3RyaW5nO1xyXG4gICAgdGlsZGU6IGJvb2xlYW47XHJcbiAgICBwYXRoOiBzdHJpbmc7XHJcbiAgICBmdWxsUGF0aDogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbiAgICBpZ25vcmVkPzogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVSZXN1bHQge1xyXG4gICAgLy8gQ2hpbGQgaW1wb3J0cyAoaWYgYW55KVxyXG4gICAgaW1wb3J0cz86IEJ1bmRsZVJlc3VsdFtdO1xyXG4gICAgdGlsZGU/OiBib29sZWFuO1xyXG4gICAgZGVkdXBlZD86IGJvb2xlYW47XHJcbiAgICAvLyBGdWxsIHBhdGggb2YgdGhlIGZpbGVcclxuICAgIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgICBidW5kbGVkQ29udGVudD86IHN0cmluZztcclxuICAgIGZvdW5kOiBib29sZWFuO1xyXG4gICAgaWdub3JlZD86IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCdW5kbGVyIHtcclxuICAgIC8vIEZ1bGwgcGF0aHMgb2YgdXNlZCBpbXBvcnRzIGFuZCB0aGVpciBjb3VudFxyXG4gICAgcHJpdmF0ZSB1c2VkSW1wb3J0czogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9O1xyXG4gICAgLy8gSW1wb3J0cyBkaWN0aW9uYXJ5IGJ5IGZpbGVcclxuICAgIHByaXZhdGUgaW1wb3J0c0J5RmlsZTogeyBba2V5OiBzdHJpbmddOiBCdW5kbGVSZXN1bHRbXSB9ID0ge307XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBmaWxlUmVnaXN0cnk6IEZpbGVSZWdpc3RyeSA9IHt9LCBwcml2YXRlIHJlYWRvbmx5IHByb2plY3REaXJlY3Rvcnk/OiBzdHJpbmcpIHsgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGVBbGwoZmlsZXM6IHN0cmluZ1tdLCBkZWR1cGVHbG9iczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8QnVuZGxlUmVzdWx0W10+IHtcclxuICAgICAgICBjb25zdCByZXN1bHRzUHJvbWlzZXMgPSBmaWxlcy5tYXAoYXN5bmMgZmlsZSA9PiB0aGlzLkJ1bmRsZShmaWxlLCBkZWR1cGVHbG9icykpO1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChyZXN1bHRzUHJvbWlzZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGUoXHJcbiAgICAgICAgZmlsZTogc3RyaW5nLFxyXG4gICAgICAgIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdLFxyXG4gICAgICAgIGluY2x1ZGVQYXRoczogc3RyaW5nW10gPSBbXSxcclxuICAgICAgICBpZ25vcmVkSW1wb3J0czogc3RyaW5nW10gPSBbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcm9qZWN0RGlyZWN0b3J5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGZpbGUgPSBwYXRoLnJlc29sdmUodGhpcy5wcm9qZWN0RGlyZWN0b3J5LCBmaWxlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZpbGUpO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50UHJvbWlzZSA9IGZzLnJlYWRGaWxlKGZpbGUsIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlZHVwZUZpbGVzUHJvbWlzZSA9IHRoaXMuZ2xvYkZpbGVzT3JFbXB0eShkZWR1cGVHbG9icyk7XHJcblxyXG4gICAgICAgICAgICAvLyBBd2FpdCBhbGwgYXN5bmMgb3BlcmF0aW9ucyBhbmQgZXh0cmFjdCByZXN1bHRzXHJcbiAgICAgICAgICAgIGNvbnN0IFtjb250ZW50LCBkZWR1cGVGaWxlc10gPSBhd2FpdCBQcm9taXNlLmFsbChbY29udGVudFByb21pc2UsIGRlZHVwZUZpbGVzUHJvbWlzZV0pO1xyXG5cclxuICAgICAgICAgICAgLy8gQ29udmVydCBzdHJpbmcgYXJyYXkgaW50byByZWd1bGFyIGV4cHJlc3Npb25zXHJcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWRJbXBvcnRzUmVnRXggPSBpZ25vcmVkSW1wb3J0cy5tYXAoaWdub3JlZEltcG9ydCA9PiBuZXcgUmVnRXhwKGlnbm9yZWRJbXBvcnQpKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJ1bmRsZShmaWxlLCBjb250ZW50LCBkZWR1cGVGaWxlcywgaW5jbHVkZVBhdGhzLCBpZ25vcmVkSW1wb3J0c1JlZ0V4KTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBmaWxlLFxyXG4gICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYnVuZGxlKFxyXG4gICAgICAgIGZpbGVQYXRoOiBzdHJpbmcsXHJcbiAgICAgICAgY29udGVudDogc3RyaW5nLFxyXG4gICAgICAgIGRlZHVwZUZpbGVzOiBzdHJpbmdbXSxcclxuICAgICAgICBpbmNsdWRlUGF0aHM6IHN0cmluZ1tdLFxyXG4gICAgICAgIGlnbm9yZWRJbXBvcnRzOiBSZWdFeHBbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICAvLyBSZW1vdmUgY29tbWVudGVkIGltcG9ydHNcclxuICAgICAgICBjb250ZW50ID0gdGhpcy5yZW1vdmVJbXBvcnRzRnJvbUNvbW1lbnRzKGNvbnRlbnQpO1xyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIHBhdGggdG8gd29yayBvbmx5IHdpdGggZnVsbCBwYXRoc1xyXG4gICAgICAgIGZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmZpbGVSZWdpc3RyeVtmaWxlUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVSZWdpc3RyeVtmaWxlUGF0aF0gPSBjb250ZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVzb2x2ZSBpbXBvcnRzIGZpbGUgbmFtZXMgKHByZXBlbmQgdW5kZXJzY29yZSBmb3IgcGFydGlhbHMpXHJcbiAgICAgICAgY29uc3QgaW1wb3J0c1Byb21pc2VzID0gSGVscGVycy5nZXRBbGxNYXRjaGVzKGNvbnRlbnQsIElNUE9SVF9QQVRURVJOKS5tYXAoYXN5bmMgbWF0Y2ggPT4ge1xyXG4gICAgICAgICAgICBsZXQgaW1wb3J0TmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICAgICAgICAvLyBBcHBlbmQgZXh0ZW5zaW9uIGlmIGl0J3MgYWJzZW50XHJcbiAgICAgICAgICAgIGlmIChpbXBvcnROYW1lLmluZGV4T2YoRklMRV9FWFRFTlNJT04pID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0TmFtZSArPSBGSUxFX0VYVEVOU0lPTjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIGltcG9ydCBzaG91bGQgYmUgaWdub3JlZFxyXG4gICAgICAgICAgICBjb25zdCBpZ25vcmVkID0gaWdub3JlZEltcG9ydHMuZmluZEluZGV4KGlnbm9yZWRJbXBvcnRSZWdleCA9PiBpZ25vcmVkSW1wb3J0UmVnZXgudGVzdChpbXBvcnROYW1lKSkgIT09IC0xO1xyXG5cclxuICAgICAgICAgICAgbGV0IGZ1bGxQYXRoOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciB0aWxkZSBpbXBvcnQuXHJcbiAgICAgICAgICAgIGNvbnN0IHRpbGRlOiBib29sZWFuID0gaW1wb3J0TmFtZS5zdGFydHNXaXRoKFRJTERFKTtcclxuICAgICAgICAgICAgaWYgKHRpbGRlICYmIHRoaXMucHJvamVjdERpcmVjdG9yeSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnROYW1lID0gYC4vJHtOT0RFX01PRFVMRVN9LyR7aW1wb3J0TmFtZS5zdWJzdHIoVElMREUubGVuZ3RoLCBpbXBvcnROYW1lLmxlbmd0aCl9YDtcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHRoaXMucHJvamVjdERpcmVjdG9yeSwgaW1wb3J0TmFtZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShkaXJuYW1lLCBpbXBvcnROYW1lKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaW1wb3J0RGF0YTogSW1wb3J0RGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIGltcG9ydFN0cmluZzogbWF0Y2hbMF0sXHJcbiAgICAgICAgICAgICAgICB0aWxkZTogdGlsZGUsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBpbXBvcnROYW1lLFxyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGg6IGZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgaWdub3JlZDogaWdub3JlZFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZXNvbHZlSW1wb3J0KGltcG9ydERhdGEsIGluY2x1ZGVQYXRocyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW1wb3J0RGF0YTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gV2FpdCBmb3IgYWxsIGltcG9ydHMgZmlsZSBuYW1lcyB0byBiZSByZXNvbHZlZFxyXG4gICAgICAgIGNvbnN0IGltcG9ydHMgPSBhd2FpdCBQcm9taXNlLmFsbChpbXBvcnRzUHJvbWlzZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCA9IHtcclxuICAgICAgICAgICAgZmlsZVBhdGg6IGZpbGVQYXRoLFxyXG4gICAgICAgICAgICBmb3VuZDogdHJ1ZVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHNob3VsZENoZWNrRm9yRGVkdXBlcyA9IGRlZHVwZUZpbGVzICE9IG51bGwgJiYgZGVkdXBlRmlsZXMubGVuZ3RoID4gMDtcclxuXHJcbiAgICAgICAgLy8gQnVuZGxlIGFsbCBpbXBvcnRzXHJcbiAgICAgICAgY29uc3QgY3VycmVudEltcG9ydHM6IEJ1bmRsZVJlc3VsdFtdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBpbXAgb2YgaW1wb3J0cykge1xyXG4gICAgICAgICAgICBsZXQgY29udGVudFRvUmVwbGFjZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50SW1wb3J0OiBCdW5kbGVSZXN1bHQ7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBuZWl0aGVyIGltcG9ydCBmaWxlLCBub3IgcGFydGlhbCBpcyBmb3VuZFxyXG4gICAgICAgICAgICBpZiAoIWltcC5mb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gQWRkIGVtcHR5IGJ1bmRsZSByZXN1bHQgd2l0aCBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGltcC5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0aWxkZTogaW1wLnRpbGRlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBpZ25vcmVkOiAgaW1wLmlnbm9yZWRcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5maWxlUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiBmaWxlIGlzIG5vdCB5ZXQgaW4gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICAvLyBSZWFkXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbXBDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoaW1wLmZ1bGxQYXRoLCBcInV0Zi04XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFuZCBidW5kbGUgaXRcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJ1bmRsZWRJbXBvcnQgPSBhd2FpdCB0aGlzLmJ1bmRsZShpbXAuZnVsbFBhdGgsIGltcENvbnRlbnQsIGRlZHVwZUZpbGVzLCBpbmNsdWRlUGF0aHMsIGlnbm9yZWRJbXBvcnRzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBUaGVuIGFkZCBpdHMgYnVuZGxlZCBjb250ZW50IHRvIHRoZSByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgdGhpcy5maWxlUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9IGJ1bmRsZWRJbXBvcnQuYnVuZGxlZENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQWRkIGl0IHRvIHVzZWQgaW1wb3J0cywgaWYgaXQncyBub3QgdGhlcmVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwgJiYgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIEFuZCB3aG9sZSBCdW5kbGVSZXN1bHQgdG8gY3VycmVudCBpbXBvcnRzXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50SW1wb3J0ID0gYnVuZGxlZEltcG9ydDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpbGUgaXMgaW4gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICAvLyBJbmNyZW1lbnQgaXQncyB1c2FnZSBjb3VudFxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgY2hpbGQgaW1wb3J0cywgaWYgdGhlcmUgYXJlIGFueVxyXG4gICAgICAgICAgICAgICAgbGV0IGNoaWxkSW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltcG9ydHNCeUZpbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkSW1wb3J0cyA9IHRoaXMuaW1wb3J0c0J5RmlsZVtpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbnN0cnVjdCBhbmQgYWRkIHJlc3VsdCB0byBjdXJyZW50IGltcG9ydHNcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGltcC5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0aWxkZTogaW1wLnRpbGRlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydHM6IGNoaWxkSW1wb3J0c1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGltcC5pZ25vcmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gaW1wLmltcG9ydFN0cmluZztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBUYWtlIGNvbnRlbnRUb1JlcGxhY2UgZnJvbSB0aGUgZmlsZVJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gdGhpcy5maWxlUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXTtcclxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjb250ZW50IGlzIG5vdCBmb3VuZFxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbnRlbnRUb1JlcGxhY2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEluZGljYXRlIHRoaXMgd2l0aCBhIGNvbW1lbnQgZm9yIGVhc2llciBkZWJ1Z2dpbmdcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gYC8qKiogSU1QT1JURUQgRklMRSBOT1QgRk9VTkQgKioqLyR7b3MuRU9MfSR7aW1wLmltcG9ydFN0cmluZ30vKioqIC0tLSAqKiovYDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBJZiB1c2VkSW1wb3J0cyBkaWN0aW9uYXJ5IGlzIGRlZmluZWRcclxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRDaGVja0ZvckRlZHVwZXMgJiYgdGhpcy51c2VkSW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQW5kIGN1cnJlbnQgaW1wb3J0IHBhdGggc2hvdWxkIGJlIGRlZHVwZWQgYW5kIGlzIHVzZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzVXNlZCA9IHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGVkdXBlRmlsZXMuaW5kZXhPZihpbXAuZnVsbFBhdGgpICE9PSAtMSAmJiB0aW1lc1VzZWQgIT0gbnVsbCAmJiB0aW1lc1VzZWQgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IGNvbnRlbnQgdG8gcmVwbGFjZSB0byBhbiBlbXB0eSBzdHJpbmcgdG8gc2tpcCBpdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50VG9SZXBsYWNlID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW5kIGluZGljYXRlIHRoYXQgaW1wb3J0IHdhcyBkZWR1cGVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQuZGVkdXBlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBGaW5hbGx5LCByZXBsYWNlIGltcG9ydCBzdHJpbmcgd2l0aCBidW5kbGVkIGNvbnRlbnQgb3IgYSBkZWJ1ZyBtZXNzYWdlXHJcbiAgICAgICAgICAgIGNvbnRlbnQgPSB0aGlzLnJlcGxhY2VMYXN0T2NjdXJhbmNlKGNvbnRlbnQsIGltcC5pbXBvcnRTdHJpbmcsIGNvbnRlbnRUb1JlcGxhY2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gQW5kIHB1c2ggY3VycmVudCBpbXBvcnQgaW50byB0aGUgbGlzdFxyXG4gICAgICAgICAgICBjdXJyZW50SW1wb3J0cy5wdXNoKGN1cnJlbnRJbXBvcnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2V0IHJlc3VsdCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50ID0gY29udGVudDtcclxuICAgICAgICBidW5kbGVSZXN1bHQuaW1wb3J0cyA9IGN1cnJlbnRJbXBvcnRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pbXBvcnRzQnlGaWxlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5pbXBvcnRzQnlGaWxlW2ZpbGVQYXRoXSA9IGN1cnJlbnRJbXBvcnRzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJ1bmRsZVJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlcGxhY2VMYXN0T2NjdXJhbmNlKGNvbnRlbnQ6IHN0cmluZywgaW1wb3J0U3RyaW5nOiBzdHJpbmcsIGNvbnRlbnRUb1JlcGxhY2U6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBjb250ZW50Lmxhc3RJbmRleE9mKGltcG9ydFN0cmluZyk7XHJcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQuc2xpY2UoMCwgaW5kZXgpICsgY29udGVudC5zbGljZShpbmRleCkucmVwbGFjZShpbXBvcnRTdHJpbmcsIGNvbnRlbnRUb1JlcGxhY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVtb3ZlSW1wb3J0c0Zyb21Db21tZW50cyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IHBhdHRlcm5zID0gW0NPTU1FTlRfUEFUVEVSTiwgTVVMVElMSU5FX0NPTU1FTlRfUEFUVEVSTl07XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xyXG4gICAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKHBhdHRlcm4sIHggPT4geC5yZXBsYWNlKElNUE9SVF9QQVRURVJOLCBcIlwiKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGV4dDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVJbXBvcnQoaW1wb3J0RGF0YSwgaW5jbHVkZVBhdGhzKTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBmcy5hY2Nlc3MoaW1wb3J0RGF0YS5mdWxsUGF0aCk7XHJcbiAgICAgICAgICAgIGltcG9ydERhdGEuZm91bmQgPSB0cnVlO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkRGlybmFtZSA9IHBhdGguZGlybmFtZShpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWRCYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoaW1wb3J0RGF0YS5mdWxsUGF0aCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVuZGVyc2NvcmVkRmlsZVBhdGggPSBwYXRoLmpvaW4odW5kZXJzY29yZWREaXJuYW1lLCBgXyR7dW5kZXJzY29yZWRCYXNlbmFtZX1gKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGZzLmFjY2Vzcyh1bmRlcnNjb3JlZEZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgIGltcG9ydERhdGEuZnVsbFBhdGggPSB1bmRlcnNjb3JlZEZpbGVQYXRoO1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0RGF0YS5mb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKHVuZGVyc2NvcmVFcnIpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgaW5jbHVkZVBhdGhzXHJcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZVBhdGhzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgZnVsbFBhdGggdXNpbmcgaXRzIGZpcnN0IGVudHJ5XHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0RGF0YS5mdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShpbmNsdWRlUGF0aHNbMF0sIGltcG9ydERhdGEucGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHJlc29sdmluZyBpbXBvcnQgd2l0aCB0aGUgcmVtYWluaW5nIGluY2x1ZGVQYXRoc1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ0luY2x1ZGVQYXRocyA9IGluY2x1ZGVQYXRocy5zbGljZSgxKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlSW1wb3J0KGltcG9ydERhdGEsIHJlbWFpbmluZ0luY2x1ZGVQYXRocyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbXBvcnREYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2xvYkZpbGVzT3JFbXB0eShnbG9ic0xpc3Q6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZ2xvYnNMaXN0ID09IG51bGwgfHwgZ2xvYnNMaXN0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShbXSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZ2xvYnMoZ2xvYnNMaXN0LCAoZXJyOiBFcnJvciwgZmlsZXM6IHN0cmluZ1tdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZWplY3QgaWYgdGhlcmUncyBhbiBlcnJvclxyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgZnVsbCBwYXRoc1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZmlsZXMubWFwKGZpbGUgPT4gcGF0aC5yZXNvbHZlKGZpbGUpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIHByb21pc2VcclxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuIl19