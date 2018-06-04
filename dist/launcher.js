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
const path = require("path");
const os = require("os");
const archy = require("archy");
const prettyBytes = require("pretty-bytes");
const nodeSass = require("node-sass");
const Contracts = require("./contracts");
const bundler_1 = require("./bundler");
class Launcher {
    constructor(config) {
        this.config = config;
        this.tildeImporter = (url) => {
            if (url[0] === "~") {
                const filePath = path.resolve("node_modules", url.substr(1));
                return { file: filePath };
            }
            return { file: url };
        };
    }
    Bundle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileRegistry = {};
                const bundler = new bundler_1.Bundler(fileRegistry, this.config.ProjectDirectory);
                const bundleResult = yield bundler.Bundle(this.config.Entry, this.config.DedupeGlobs, this.config.IncludePaths, this.config.IgnoredImports);
                // Entry file searching.
                if (!bundleResult.found) {
                    if (this.config.Verbosity !== Contracts.Verbosity.None) {
                        const resolvedPath = path.resolve(bundleResult.filePath);
                        let errorMessage = `[Error] An error has occured${os.EOL}`;
                        errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
                        errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
                        this.exitWithError(errorMessage);
                    }
                }
                // Imports searching. TODO: Remake this in major version.
                this.bundleResultForEach(bundleResult, result => {
                    if (!result.found &&
                        result.tilde &&
                        this.config.ProjectDirectory == null &&
                        this.config.Verbosity !== Contracts.Verbosity.None) {
                        const resolvedPath = path.resolve(bundleResult.filePath);
                        let errorMessage = `[Error] An error has occured${os.EOL}`;
                        errorMessage += `Import file was not found:${os.EOL}${result.filePath}${os.EOL}`;
                        errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}${os.EOL}`;
                        errorMessage += `NOTICE: Found tilde import, but project location was not specified.${os.EOL}`;
                        this.exitWithError(errorMessage);
                    }
                });
                if (this.config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info("Imports tree:");
                    const archyData = this.getArchyData(bundleResult, path.dirname(this.config.Entry));
                    console.info(archy(archyData));
                }
                if (bundleResult.bundledContent == null) {
                    if (this.config.Verbosity !== Contracts.Verbosity.None) {
                        this.exitWithError(`[Error] An error has occured${os.EOL}Concatenation result has no content.`);
                    }
                    return;
                }
                try {
                    yield this.renderScss(bundleResult.bundledContent);
                }
                catch (scssError) {
                    this.exitWithError(`[Error] There is an error in your styles:${os.EOL}${scssError}`);
                }
                // Ensure the directory exists
                fs.mkdirpSync(path.dirname(this.config.Destination));
                yield fs.writeFile(this.config.Destination, bundleResult.bundledContent);
                const fullPath = path.resolve(this.config.Destination);
                if (this.config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info(`[Done] Bundled into:${os.EOL}${fullPath}`);
                    console.info(`Total size       : ${prettyBytes(bundleResult.bundledContent.length)}`);
                    console.info(`Saved by deduping: ${prettyBytes(this.countSavedBytesByDeduping(bundleResult, fileRegistry))}`);
                }
            }
            catch (error) {
                if (this.config.Verbosity !== Contracts.Verbosity.None) {
                    this.exitWithError(`[Error] An error has occured${os.EOL}${error}`);
                }
            }
        });
    }
    renderScss(content) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                nodeSass.render({
                    data: content,
                    importer: this.tildeImporter
                }, (error, result) => {
                    if (error != null) {
                        reject(`${error.message} on line (${error.line}, ${error.column})`);
                    }
                    resolve(result);
                });
            });
        });
    }
    getArchyData(bundleResult, sourceDirectory) {
        if (sourceDirectory == null) {
            sourceDirectory = process.cwd();
        }
        const archyData = {
            label: path.relative(sourceDirectory, bundleResult.filePath)
        };
        if (!bundleResult.found) {
            archyData.label += ` [NOT FOUND]`;
        }
        if (bundleResult.deduped) {
            archyData.label += ` [DEDUPED]`;
        }
        if (bundleResult.ignored) {
            archyData.label += ` [IGNORED]`;
        }
        if (bundleResult.imports != null) {
            archyData.nodes = bundleResult.imports.map(x => {
                if (x != null) {
                    return this.getArchyData(x, sourceDirectory);
                }
                return "";
            });
        }
        return archyData;
    }
    /**
     * TODO: Rewrite this in major version.
     */
    bundleResultForEach(bundleResult, cb) {
        cb(bundleResult);
        if (bundleResult.imports != null) {
            for (const bundleResultChild of bundleResult.imports) {
                this.bundleResultForEach(bundleResultChild, cb);
            }
        }
    }
    countSavedBytesByDeduping(bundleResult, fileRegistry) {
        let savedBytes = 0;
        const content = fileRegistry[bundleResult.filePath];
        if (bundleResult.deduped === true && content != null) {
            savedBytes = content.length;
        }
        if (bundleResult.imports != null && bundleResult.imports.length > 0) {
            for (const importResult of bundleResult.imports) {
                savedBytes += this.countSavedBytesByDeduping(importResult, fileRegistry);
            }
        }
        return savedBytes;
    }
    exitWithError(message) {
        if (this.config.Verbosity !== Contracts.Verbosity.None) {
            console.error(message);
        }
        process.exit(1);
    }
}
exports.Launcher = Launcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGF1bmNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQiw0Q0FBNEM7QUFFNUMsc0NBQXNDO0FBRXRDLHlDQUF5QztBQUN6Qyx1Q0FBZ0U7QUFFaEU7SUFDSSxZQUFvQixNQUF3QjtRQUF4QixXQUFNLEdBQU4sTUFBTSxDQUFrQjtRQStGcEMsa0JBQWEsR0FBc0IsQ0FBQyxHQUFXLEVBQUUsRUFBRTtZQUN2RCxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ2hCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0QsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQzthQUM3QjtZQUNELE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDekIsQ0FBQyxDQUFBO0lBckc4QyxDQUFDO0lBRW5DLE1BQU07O1lBQ2YsSUFBSTtnQkFDQSxNQUFNLFlBQVksR0FBaUIsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFPLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFFeEUsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FDN0IsQ0FBQztnQkFFRix3QkFBd0I7Z0JBQ3hCLElB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O1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0o7QUFyS0QsNEJBcUtDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzLWV4dHJhXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCAqIGFzIGFyY2h5IGZyb20gXCJhcmNoeVwiO1xyXG5pbXBvcnQgKiBhcyBwcmV0dHlCeXRlcyBmcm9tIFwicHJldHR5LWJ5dGVzXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBub2RlU2FzcyBmcm9tIFwibm9kZS1zYXNzXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IEJ1bmRsZXIsIEJ1bmRsZVJlc3VsdCwgRmlsZVJlZ2lzdHJ5IH0gZnJvbSBcIi4vYnVuZGxlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIExhdW5jaGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY29uZmlnOiBDb250cmFjdHMuQ29uZmlnKSB7fVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkgPSB7fTtcclxuICAgICAgICAgICAgY29uc3QgYnVuZGxlciA9IG5ldyBCdW5kbGVyKGZpbGVSZWdpc3RyeSwgdGhpcy5jb25maWcuUHJvamVjdERpcmVjdG9yeSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBidW5kbGVSZXN1bHQgPSBhd2FpdCBidW5kbGVyLkJ1bmRsZShcclxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLkVudHJ5LFxyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWcuRGVkdXBlR2xvYnMsXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5JbmNsdWRlUGF0aHMsXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5JZ25vcmVkSW1wb3J0c1xyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgLy8gRW50cnkgZmlsZSBzZWFyY2hpbmcuXHJcbiAgICAgICAgICAgIGlmICghYnVuZGxlUmVzdWx0LmZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZFBhdGggPSBwYXRoLnJlc29sdmUoYnVuZGxlUmVzdWx0LmZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgRW50cnkgZmlsZSB3YXMgbm90IGZvdW5kOiR7b3MuRU9MfSR7YnVuZGxlUmVzdWx0LmZpbGVQYXRofSR7b3MuRU9MfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlICs9IGBMb29rZWQgYXQgKGZ1bGwgcGF0aCk6JHtvcy5FT0x9JHtyZXNvbHZlZFBhdGh9YDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoZXJyb3JNZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gSW1wb3J0cyBzZWFyY2hpbmcuIFRPRE86IFJlbWFrZSB0aGlzIGluIG1ham9yIHZlcnNpb24uXHJcbiAgICAgICAgICAgIHRoaXMuYnVuZGxlUmVzdWx0Rm9yRWFjaChidW5kbGVSZXN1bHQsIHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgICAgIXJlc3VsdC5mb3VuZCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC50aWxkZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLlByb2plY3REaXJlY3RvcnkgPT0gbnVsbCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lXHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZFBhdGggPSBwYXRoLnJlc29sdmUoYnVuZGxlUmVzdWx0LmZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgSW1wb3J0IGZpbGUgd2FzIG5vdCBmb3VuZDoke29zLkVPTH0ke3Jlc3VsdC5maWxlUGF0aH0ke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgTG9va2VkIGF0IChmdWxsIHBhdGgpOiR7b3MuRU9MfSR7cmVzb2x2ZWRQYXRofSR7b3MuRU9MfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlICs9IGBOT1RJQ0U6IEZvdW5kIHRpbGRlIGltcG9ydCwgYnV0IHByb2plY3QgbG9jYXRpb24gd2FzIG5vdCBzcGVjaWZpZWQuJHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoZXJyb3JNZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkltcG9ydHMgdHJlZTpcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhcmNoeURhdGEgPSB0aGlzLmdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQsIHBhdGguZGlybmFtZSh0aGlzLmNvbmZpZy5FbnRyeSkpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGFyY2h5KGFyY2h5RGF0YSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfUNvbmNhdGVuYXRpb24gcmVzdWx0IGhhcyBubyBjb250ZW50LmApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlclNjc3MoYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoc2Nzc0Vycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gVGhlcmUgaXMgYW4gZXJyb3IgaW4geW91ciBzdHlsZXM6JHtvcy5FT0x9JHtzY3NzRXJyb3J9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEVuc3VyZSB0aGUgZGlyZWN0b3J5IGV4aXN0c1xyXG4gICAgICAgICAgICBmcy5ta2RpcnBTeW5jKHBhdGguZGlybmFtZSh0aGlzLmNvbmZpZy5EZXN0aW5hdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKHRoaXMuY29uZmlnLkRlc3RpbmF0aW9uLCBidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUodGhpcy5jb25maWcuRGVzdGluYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgW0RvbmVdIEJ1bmRsZWQgaW50bzoke29zLkVPTH0ke2Z1bGxQYXRofWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBUb3RhbCBzaXplICAgICAgIDogJHtwcmV0dHlCeXRlcyhidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQubGVuZ3RoKX1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgU2F2ZWQgYnkgZGVkdXBpbmc6ICR7cHJldHR5Qnl0ZXModGhpcy5jb3VudFNhdmVkQnl0ZXNCeURlZHVwaW5nKGJ1bmRsZVJlc3VsdCwgZmlsZVJlZ2lzdHJ5KSl9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfSR7ZXJyb3J9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZW5kZXJTY3NzKGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8e30+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBub2RlU2Fzcy5yZW5kZXIoXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY29udGVudCxcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlcjogdGhpcy50aWxkZUltcG9ydGVyXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoYCR7ZXJyb3IubWVzc2FnZX0gb24gbGluZSAoJHtlcnJvci5saW5lfSwgJHtlcnJvci5jb2x1bW59KWApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0aWxkZUltcG9ydGVyOiBub2RlU2Fzcy5JbXBvcnRlciA9ICh1cmw6IHN0cmluZykgPT4ge1xyXG4gICAgICAgIGlmICh1cmxbMF0gPT09IFwiflwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKFwibm9kZV9tb2R1bGVzXCIsIHVybC5zdWJzdHIoMSkpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBmaWxlOiBmaWxlUGF0aCB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyBmaWxlOiB1cmwgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgc291cmNlRGlyZWN0b3J5Pzogc3RyaW5nKTogYXJjaHkuRGF0YSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZURpcmVjdG9yeSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGFyY2h5RGF0YTogYXJjaHkuRGF0YSA9IHtcclxuICAgICAgICAgICAgbGFiZWw6IHBhdGgucmVsYXRpdmUoc291cmNlRGlyZWN0b3J5LCBidW5kbGVSZXN1bHQuZmlsZVBhdGgpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKCFidW5kbGVSZXN1bHQuZm91bmQpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLmxhYmVsICs9IGAgW05PVCBGT1VORF1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmRlZHVwZWQpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLmxhYmVsICs9IGAgW0RFRFVQRURdYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5pZ25vcmVkKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5sYWJlbCArPSBgIFtJR05PUkVEXWA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBhcmNoeURhdGEubm9kZXMgPSBidW5kbGVSZXN1bHQuaW1wb3J0cy5tYXAoeCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoeCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QXJjaHlEYXRhKHgsIHNvdXJjZURpcmVjdG9yeSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhcmNoeURhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUT0RPOiBSZXdyaXRlIHRoaXMgaW4gbWFqb3IgdmVyc2lvbi5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBidW5kbGVSZXN1bHRGb3JFYWNoKGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0LCBjYjogKGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0KSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICAgICAgY2IoYnVuZGxlUmVzdWx0KTtcclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJ1bmRsZVJlc3VsdENoaWxkIG9mIGJ1bmRsZVJlc3VsdC5pbXBvcnRzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1bmRsZVJlc3VsdEZvckVhY2goYnVuZGxlUmVzdWx0Q2hpbGQsIGNiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvdW50U2F2ZWRCeXRlc0J5RGVkdXBpbmcoYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQsIGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5KTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgc2F2ZWRCeXRlcyA9IDA7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9IGZpbGVSZWdpc3RyeVtidW5kbGVSZXN1bHQuZmlsZVBhdGhdO1xyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuZGVkdXBlZCA9PT0gdHJ1ZSAmJiBjb250ZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgc2F2ZWRCeXRlcyA9IGNvbnRlbnQubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmltcG9ydHMgIT0gbnVsbCAmJiBidW5kbGVSZXN1bHQuaW1wb3J0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaW1wb3J0UmVzdWx0IG9mIGJ1bmRsZVJlc3VsdC5pbXBvcnRzKSB7XHJcbiAgICAgICAgICAgICAgICBzYXZlZEJ5dGVzICs9IHRoaXMuY291bnRTYXZlZEJ5dGVzQnlEZWR1cGluZyhpbXBvcnRSZXN1bHQsIGZpbGVSZWdpc3RyeSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHNhdmVkQnl0ZXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBleGl0V2l0aEVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKG1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XHJcbiAgICB9XHJcbn1cclxuIl19