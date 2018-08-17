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
const DEFAULT_FILE_EXTENSION = ".scss";
const ALLOWED_FILE_EXTENSIONS = [".scss", ".css"];
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
    isExtensionExists(importName) {
        return ALLOWED_FILE_EXTENSIONS.some((extension => importName.indexOf(extension) !== -1));
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
                if (!this.isExtensionExists(importName)) {
                    importName += DEFAULT_FILE_EXTENSION;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0IscUNBQXFDO0FBRXJDLE1BQU0sY0FBYyxHQUFHLDBCQUEwQixDQUFDO0FBQ2xELE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQztBQUNwQyxNQUFNLHlCQUF5QixHQUFHLG1CQUFtQixDQUFDO0FBQ3RELE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDO0FBQ3ZDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbEQsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDO0FBQ3BDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQztBQTJCbEI7SUFNSSxZQUFvQixlQUE2QixFQUFFLEVBQW1CLGdCQUF5QjtRQUEzRSxpQkFBWSxHQUFaLFlBQVksQ0FBbUI7UUFBbUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFTO1FBTC9GLDZDQUE2QztRQUNyQyxnQkFBVyxHQUE4QixFQUFFLENBQUM7UUFDcEQsNkJBQTZCO1FBQ3JCLGtCQUFhLEdBQXNDLEVBQUUsQ0FBQztJQUVxQyxDQUFDO0lBRXZGLFNBQVMsQ0FBQyxLQUFlLEVBQUUsY0FBd0IsRUFBRTs7WUFDOUQsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFNLElBQUksRUFBQyxFQUFFLGdEQUFDLE9BQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUEsR0FBQSxDQUFDLENBQUM7WUFDaEYsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7S0FBQTtJQUVZLE1BQU0sQ0FDZixJQUFZLEVBQ1osY0FBd0IsRUFBRSxFQUMxQixlQUF5QixF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LFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3JFLHVEQUF1RDt3QkFDdkQsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNwRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLENBQUM7cUJBQ2hFO2lCQUNKO2FBQ0o7WUFFRCxPQUFPLFVBQVUsQ0FBQztRQUN0QixDQUFDO0tBQUE7SUFFYSxnQkFBZ0IsQ0FBQyxTQUFtQjs7WUFDOUMsT0FBTyxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxTQUFTLElBQUksSUFBSSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUM3QyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ1osT0FBTztpQkFDVjtnQkFDRCxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBVSxFQUFFLEtBQWUsRUFBRSxFQUFFO29CQUM3Qyw2QkFBNkI7b0JBQzdCLElBQUksR0FBRyxFQUFFO3dCQUNMLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDZjtvQkFFRCxxQkFBcUI7b0JBQ3JCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRXJELGtCQUFrQjtvQkFDbEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUFBO0NBQ0o7QUFuUkQsMEJBbVJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzLWV4dHJhXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGdsb2JzIGZyb20gXCJnbG9ic1wiO1xyXG5cclxuaW1wb3J0ICogYXMgSGVscGVycyBmcm9tIFwiLi9oZWxwZXJzXCI7XHJcblxyXG5jb25zdCBJTVBPUlRfUEFUVEVSTiA9IC9AaW1wb3J0XFxzK1snXCJdKC4rKVsnXCJdOy9nO1xyXG5jb25zdCBDT01NRU5UX1BBVFRFUk4gPSAvXFwvXFwvLiokL2dtO1xyXG5jb25zdCBNVUxUSUxJTkVfQ09NTUVOVF9QQVRURVJOID0gL1xcL1xcKltcXHNcXFNdKj9cXCpcXC8vZztcclxuY29uc3QgREVGQVVMVF9GSUxFX0VYVEVOU0lPTiA9IFwiLnNjc3NcIjtcclxuY29uc3QgQUxMT1dFRF9GSUxFX0VYVEVOU0lPTlMgPSBbXCIuc2Nzc1wiLCBcIi5jc3NcIl07XHJcbmNvbnN0IE5PREVfTU9EVUxFUyA9IFwibm9kZV9tb2R1bGVzXCI7XHJcbmNvbnN0IFRJTERFID0gXCJ+XCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVSZWdpc3RyeSB7XHJcbiAgICBbaWQ6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnREYXRhIHtcclxuICAgIGltcG9ydFN0cmluZzogc3RyaW5nO1xyXG4gICAgdGlsZGU6IGJvb2xlYW47XHJcbiAgICBwYXRoOiBzdHJpbmc7XHJcbiAgICBmdWxsUGF0aDogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbiAgICBpZ25vcmVkPzogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVSZXN1bHQge1xyXG4gICAgLy8gQ2hpbGQgaW1wb3J0cyAoaWYgYW55KVxyXG4gICAgaW1wb3J0cz86IEJ1bmRsZVJlc3VsdFtdO1xyXG4gICAgdGlsZGU/OiBib29sZWFuO1xyXG4gICAgZGVkdXBlZD86IGJvb2xlYW47XHJcbiAgICAvLyBGdWxsIHBhdGggb2YgdGhlIGZpbGVcclxuICAgIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgICBidW5kbGVkQ29udGVudD86IHN0cmluZztcclxuICAgIGZvdW5kOiBib29sZWFuO1xyXG4gICAgaWdub3JlZD86IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCdW5kbGVyIHtcclxuICAgIC8vIEZ1bGwgcGF0aHMgb2YgdXNlZCBpbXBvcnRzIGFuZCB0aGVpciBjb3VudFxyXG4gICAgcHJpdmF0ZSB1c2VkSW1wb3J0czogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9O1xyXG4gICAgLy8gSW1wb3J0cyBkaWN0aW9uYXJ5IGJ5IGZpbGVcclxuICAgIHByaXZhdGUgaW1wb3J0c0J5RmlsZTogeyBba2V5OiBzdHJpbmddOiBCdW5kbGVSZXN1bHRbXSB9ID0ge307XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBmaWxlUmVnaXN0cnk6IEZpbGVSZWdpc3RyeSA9IHt9LCBwcml2YXRlIHJlYWRvbmx5IHByb2plY3REaXJlY3Rvcnk/OiBzdHJpbmcpIHsgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGVBbGwoZmlsZXM6IHN0cmluZ1tdLCBkZWR1cGVHbG9iczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8QnVuZGxlUmVzdWx0W10+IHtcclxuICAgICAgICBjb25zdCByZXN1bHRzUHJvbWlzZXMgPSBmaWxlcy5tYXAoYXN5bmMgZmlsZSA9PiB0aGlzLkJ1bmRsZShmaWxlLCBkZWR1cGVHbG9icykpO1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChyZXN1bHRzUHJvbWlzZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGUoXHJcbiAgICAgICAgZmlsZTogc3RyaW5nLFxyXG4gICAgICAgIGRlZHVwZUdsb2JzOiBzdHJpbmdbXSA9IFtdLFxyXG4gICAgICAgIGluY2x1ZGVQYXRoczogc3RyaW5nW10gPSBbXSxcclxuICAgICAgICBpZ25vcmVkSW1wb3J0czogc3RyaW5nW10gPSBbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcm9qZWN0RGlyZWN0b3J5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGZpbGUgPSBwYXRoLnJlc29sdmUodGhpcy5wcm9qZWN0RGlyZWN0b3J5LCBmaWxlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZpbGUpO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50UHJvbWlzZSA9IGZzLnJlYWRGaWxlKGZpbGUsIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlZHVwZUZpbGVzUHJvbWlzZSA9IHRoaXMuZ2xvYkZpbGVzT3JFbXB0eShkZWR1cGVHbG9icyk7XHJcblxyXG4gICAgICAgICAgICAvLyBBd2FpdCBhbGwgYXN5bmMgb3BlcmF0aW9ucyBhbmQgZXh0cmFjdCByZXN1bHRzXHJcbiAgICAgICAgICAgIGNvbnN0IFtjb250ZW50LCBkZWR1cGVGaWxlc10gPSBhd2FpdCBQcm9taXNlLmFsbChbY29udGVudFByb21pc2UsIGRlZHVwZUZpbGVzUHJvbWlzZV0pO1xyXG5cclxuICAgICAgICAgICAgLy8gQ29udmVydCBzdHJpbmcgYXJyYXkgaW50byByZWd1bGFyIGV4cHJlc3Npb25zXHJcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWRJbXBvcnRzUmVnRXggPSBpZ25vcmVkSW1wb3J0cy5tYXAoaWdub3JlZEltcG9ydCA9PiBuZXcgUmVnRXhwKGlnbm9yZWRJbXBvcnQpKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJ1bmRsZShmaWxlLCBjb250ZW50LCBkZWR1cGVGaWxlcywgaW5jbHVkZVBhdGhzLCBpZ25vcmVkSW1wb3J0c1JlZ0V4KTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBmaWxlLFxyXG4gICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaXNFeHRlbnNpb25FeGlzdHMoaW1wb3J0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIEFMTE9XRURfRklMRV9FWFRFTlNJT05TLnNvbWUoKGV4dGVuc2lvbiA9PiBpbXBvcnROYW1lLmluZGV4T2YoZXh0ZW5zaW9uKSAhPT0gLTEpKTtcclxuICAgIH1cclxuICAgIHByaXZhdGUgYXN5bmMgYnVuZGxlKFxyXG4gICAgICAgIGZpbGVQYXRoOiBzdHJpbmcsXHJcbiAgICAgICAgY29udGVudDogc3RyaW5nLFxyXG4gICAgICAgIGRlZHVwZUZpbGVzOiBzdHJpbmdbXSxcclxuICAgICAgICBpbmNsdWRlUGF0aHM6IHN0cmluZ1tdLFxyXG4gICAgICAgIGlnbm9yZWRJbXBvcnRzOiBSZWdFeHBbXVxyXG4gICAgKTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICAvLyBSZW1vdmUgY29tbWVudGVkIGltcG9ydHNcclxuICAgICAgICBjb250ZW50ID0gdGhpcy5yZW1vdmVJbXBvcnRzRnJvbUNvbW1lbnRzKGNvbnRlbnQpO1xyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIHBhdGggdG8gd29yayBvbmx5IHdpdGggZnVsbCBwYXRoc1xyXG4gICAgICAgIGZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmZpbGVSZWdpc3RyeVtmaWxlUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmZpbGVSZWdpc3RyeVtmaWxlUGF0aF0gPSBjb250ZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVzb2x2ZSBpbXBvcnRzIGZpbGUgbmFtZXMgKHByZXBlbmQgdW5kZXJzY29yZSBmb3IgcGFydGlhbHMpXHJcbiAgICAgICAgY29uc3QgaW1wb3J0c1Byb21pc2VzID0gSGVscGVycy5nZXRBbGxNYXRjaGVzKGNvbnRlbnQsIElNUE9SVF9QQVRURVJOKS5tYXAoYXN5bmMgbWF0Y2ggPT4ge1xyXG4gICAgICAgICAgICBsZXQgaW1wb3J0TmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICAgICAgICAvLyBBcHBlbmQgZXh0ZW5zaW9uIGlmIGl0J3MgYWJzZW50XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5pc0V4dGVuc2lvbkV4aXN0cyhpbXBvcnROYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0TmFtZSArPSBERUZBVUxUX0ZJTEVfRVhURU5TSU9OO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgaW1wb3J0IHNob3VsZCBiZSBpZ25vcmVkXHJcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWQgPSBpZ25vcmVkSW1wb3J0cy5maW5kSW5kZXgoaWdub3JlZEltcG9ydFJlZ2V4ID0+IGlnbm9yZWRJbXBvcnRSZWdleC50ZXN0KGltcG9ydE5hbWUpKSAhPT0gLTE7XHJcblxyXG4gICAgICAgICAgICBsZXQgZnVsbFBhdGg6IHN0cmluZztcclxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHRpbGRlIGltcG9ydC5cclxuICAgICAgICAgICAgY29uc3QgdGlsZGU6IGJvb2xlYW4gPSBpbXBvcnROYW1lLnN0YXJ0c1dpdGgoVElMREUpO1xyXG4gICAgICAgICAgICBpZiAodGlsZGUgJiYgdGhpcy5wcm9qZWN0RGlyZWN0b3J5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGltcG9ydE5hbWUgPSBgLi8ke05PREVfTU9EVUxFU30vJHtpbXBvcnROYW1lLnN1YnN0cihUSUxERS5sZW5ndGgsIGltcG9ydE5hbWUubGVuZ3RoKX1gO1xyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUodGhpcy5wcm9qZWN0RGlyZWN0b3J5LCBpbXBvcnROYW1lKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGRpcm5hbWUsIGltcG9ydE5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbXBvcnREYXRhOiBJbXBvcnREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0U3RyaW5nOiBtYXRjaFswXSxcclxuICAgICAgICAgICAgICAgIHRpbGRlOiB0aWxkZSxcclxuICAgICAgICAgICAgICAgIHBhdGg6IGltcG9ydE5hbWUsXHJcbiAgICAgICAgICAgICAgICBmdWxsUGF0aDogZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBpZ25vcmVkOiBpZ25vcmVkXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlc29sdmVJbXBvcnQoaW1wb3J0RGF0YSwgaW5jbHVkZVBhdGhzKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbXBvcnREYXRhO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBXYWl0IGZvciBhbGwgaW1wb3J0cyBmaWxlIG5hbWVzIHRvIGJlIHJlc29sdmVkXHJcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IGF3YWl0IFByb21pc2UuYWxsKGltcG9ydHNQcm9taXNlcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0ID0ge1xyXG4gICAgICAgICAgICBmaWxlUGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgIGZvdW5kOiB0cnVlXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2hvdWxkQ2hlY2tGb3JEZWR1cGVzID0gZGVkdXBlRmlsZXMgIT0gbnVsbCAmJiBkZWR1cGVGaWxlcy5sZW5ndGggPiAwO1xyXG5cclxuICAgICAgICAvLyBCdW5kbGUgYWxsIGltcG9ydHNcclxuICAgICAgICBjb25zdCBjdXJyZW50SW1wb3J0czogQnVuZGxlUmVzdWx0W10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IGltcCBvZiBpbXBvcnRzKSB7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50VG9SZXBsYWNlO1xyXG5cclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRJbXBvcnQ6IEJ1bmRsZVJlc3VsdDtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIG5laXRoZXIgaW1wb3J0IGZpbGUsIG5vciBwYXJ0aWFsIGlzIGZvdW5kXHJcbiAgICAgICAgICAgIGlmICghaW1wLmZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBBZGQgZW1wdHkgYnVuZGxlIHJlc3VsdCB3aXRoIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogaW1wLmZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbGRlOiBpbXAudGlsZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlnbm9yZWQ6ICBpbXAuaWdub3JlZFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIC8vIElmIGZpbGUgaXMgbm90IHlldCBpbiB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIC8vIFJlYWRcclxuICAgICAgICAgICAgICAgIGNvbnN0IGltcENvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShpbXAuZnVsbFBhdGgsIFwidXRmLThcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYW5kIGJ1bmRsZSBpdFxyXG4gICAgICAgICAgICAgICAgY29uc3QgYnVuZGxlZEltcG9ydCA9IGF3YWl0IHRoaXMuYnVuZGxlKGltcC5mdWxsUGF0aCwgaW1wQ29udGVudCwgZGVkdXBlRmlsZXMsIGluY2x1ZGVQYXRocywgaWdub3JlZEltcG9ydHMpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFRoZW4gYWRkIGl0cyBidW5kbGVkIGNvbnRlbnQgdG8gdGhlIHJlZ2lzdHJ5XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdID0gYnVuZGxlZEltcG9ydC5idW5kbGVkQ29udGVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBBZGQgaXQgdG8gdXNlZCBpbXBvcnRzLCBpZiBpdCdzIG5vdCB0aGVyZVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXNlZEltcG9ydHMgIT0gbnVsbCAmJiB0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXNlZEltcG9ydHNbaW1wLmZ1bGxQYXRoXSA9IDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQW5kIHdob2xlIEJ1bmRsZVJlc3VsdCB0byBjdXJyZW50IGltcG9ydHNcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRJbXBvcnQgPSBidW5kbGVkSW1wb3J0O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gRmlsZSBpcyBpbiB0aGUgcmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIC8vIEluY3JlbWVudCBpdCdzIHVzYWdlIGNvdW50XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VkSW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBjaGlsZCBpbXBvcnRzLCBpZiB0aGVyZSBhcmUgYW55XHJcbiAgICAgICAgICAgICAgICBsZXQgY2hpbGRJbXBvcnRzOiBCdW5kbGVSZXN1bHRbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW1wb3J0c0J5RmlsZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRJbXBvcnRzID0gdGhpcy5pbXBvcnRzQnlGaWxlW2ltcC5mdWxsUGF0aF07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ29uc3RydWN0IGFuZCBhZGQgcmVzdWx0IHRvIGN1cnJlbnQgaW1wb3J0c1xyXG4gICAgICAgICAgICAgICAgY3VycmVudEltcG9ydCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogaW1wLmZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbGRlOiBpbXAudGlsZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0czogY2hpbGRJbXBvcnRzXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaW1wLmlnbm9yZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZWRJbXBvcnRzW2ltcC5mdWxsUGF0aF0gPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSBpbXAuaW1wb3J0U3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFRha2UgY29udGVudFRvUmVwbGFjZSBmcm9tIHRoZSBmaWxlUmVnaXN0cnlcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSB0aGlzLmZpbGVSZWdpc3RyeVtpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGNvbnRlbnQgaXMgbm90IGZvdW5kXHJcbiAgICAgICAgICAgICAgICBpZiAoY29udGVudFRvUmVwbGFjZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5kaWNhdGUgdGhpcyB3aXRoIGEgY29tbWVudCBmb3IgZWFzaWVyIGRlYnVnZ2luZ1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSBgLyoqKiBJTVBPUlRFRCBGSUxFIE5PVCBGT1VORCAqKiovJHtvcy5FT0x9JHtpbXAuaW1wb3J0U3RyaW5nfS8qKiogLS0tICoqKi9gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIElmIHVzZWRJbXBvcnRzIGRpY3Rpb25hcnkgaXMgZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgaWYgKHNob3VsZENoZWNrRm9yRGVkdXBlcyAmJiB0aGlzLnVzZWRJbXBvcnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBBbmQgY3VycmVudCBpbXBvcnQgcGF0aCBzaG91bGQgYmUgZGVkdXBlZCBhbmQgaXMgdXNlZCBhbHJlYWR5XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXNVc2VkID0gdGhpcy51c2VkSW1wb3J0c1tpbXAuZnVsbFBhdGhdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWR1cGVGaWxlcy5pbmRleE9mKGltcC5mdWxsUGF0aCkgIT09IC0xICYmIHRpbWVzVXNlZCAhPSBudWxsICYmIHRpbWVzVXNlZCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgY29udGVudCB0byByZXBsYWNlIHRvIGFuIGVtcHR5IHN0cmluZyB0byBza2lwIGl0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbmQgaW5kaWNhdGUgdGhhdCBpbXBvcnQgd2FzIGRlZHVwZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudEltcG9ydC5kZWR1cGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIEZpbmFsbHksIHJlcGxhY2UgaW1wb3J0IHN0cmluZyB3aXRoIGJ1bmRsZWQgY29udGVudCBvciBhIGRlYnVnIG1lc3NhZ2VcclxuICAgICAgICAgICAgY29udGVudCA9IHRoaXMucmVwbGFjZUxhc3RPY2N1cmFuY2UoY29udGVudCwgaW1wLmltcG9ydFN0cmluZywgY29udGVudFRvUmVwbGFjZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBBbmQgcHVzaCBjdXJyZW50IGltcG9ydCBpbnRvIHRoZSBsaXN0XHJcbiAgICAgICAgICAgIGN1cnJlbnRJbXBvcnRzLnB1c2goY3VycmVudEltcG9ydCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTZXQgcmVzdWx0IHByb3BlcnRpZXNcclxuICAgICAgICBidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQgPSBjb250ZW50O1xyXG4gICAgICAgIGJ1bmRsZVJlc3VsdC5pbXBvcnRzID0gY3VycmVudEltcG9ydHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmltcG9ydHNCeUZpbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmltcG9ydHNCeUZpbGVbZmlsZVBhdGhdID0gY3VycmVudEltcG9ydHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYnVuZGxlUmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVwbGFjZUxhc3RPY2N1cmFuY2UoY29udGVudDogc3RyaW5nLCBpbXBvcnRTdHJpbmc6IHN0cmluZywgY29udGVudFRvUmVwbGFjZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBpbmRleCA9IGNvbnRlbnQubGFzdEluZGV4T2YoaW1wb3J0U3RyaW5nKTtcclxuICAgICAgICByZXR1cm4gY29udGVudC5zbGljZSgwLCBpbmRleCkgKyBjb250ZW50LnNsaWNlKGluZGV4KS5yZXBsYWNlKGltcG9ydFN0cmluZywgY29udGVudFRvUmVwbGFjZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmVJbXBvcnRzRnJvbUNvbW1lbnRzKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgcGF0dGVybnMgPSBbQ09NTUVOVF9QQVRURVJOLCBNVUxUSUxJTkVfQ09NTUVOVF9QQVRURVJOXTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XHJcbiAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UocGF0dGVybiwgeCA9PiB4LnJlcGxhY2UoSU1QT1JUX1BBVFRFUk4sIFwiXCIpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0ZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUltcG9ydChpbXBvcnREYXRhLCBpbmNsdWRlUGF0aHMpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgaW1wb3J0RGF0YS5mb3VuZCA9IHRydWU7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWREaXJuYW1lID0gcGF0aC5kaXJuYW1lKGltcG9ydERhdGEuZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmRlcnNjb3JlZEJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShpbXBvcnREYXRhLmZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgY29uc3QgdW5kZXJzY29yZWRGaWxlUGF0aCA9IHBhdGguam9pbih1bmRlcnNjb3JlZERpcm5hbWUsIGBfJHt1bmRlcnNjb3JlZEJhc2VuYW1lfWApO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKHVuZGVyc2NvcmVkRmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaW1wb3J0RGF0YS5mdWxsUGF0aCA9IHVuZGVyc2NvcmVkRmlsZVBhdGg7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBjYXRjaCAodW5kZXJzY29yZUVycikge1xyXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGFueSBpbmNsdWRlUGF0aHNcclxuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlUGF0aHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBmdWxsUGF0aCB1c2luZyBpdHMgZmlyc3QgZW50cnlcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGluY2x1ZGVQYXRoc1swXSwgaW1wb3J0RGF0YS5wYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgcmVzb2x2aW5nIGltcG9ydCB3aXRoIHRoZSByZW1haW5pbmcgaW5jbHVkZVBhdGhzXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nSW5jbHVkZVBhdGhzID0gaW5jbHVkZVBhdGhzLnNsaWNlKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVJbXBvcnQoaW1wb3J0RGF0YSwgcmVtYWluaW5nSW5jbHVkZVBhdGhzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGltcG9ydERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnbG9iRmlsZXNPckVtcHR5KGdsb2JzTGlzdDogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZ1tdPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChnbG9ic0xpc3QgPT0gbnVsbCB8fCBnbG9ic0xpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnbG9icyhnbG9ic0xpc3QsIChlcnI6IEVycm9yLCBmaWxlczogc3RyaW5nW10pID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFJlamVjdCBpZiB0aGVyZSdzIGFuIGVycm9yXHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSBmdWxsIHBhdGhzXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBmaWxlcy5tYXAoZmlsZSA9PiBwYXRoLnJlc29sdmUoZmlsZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgcHJvbWlzZVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG4iXX0=