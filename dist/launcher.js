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
    }
    Bundle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileRegistry = {};
                const bundler = new bundler_1.Bundler(fileRegistry, this.config.ProjectDirectory);
                const bundleResult = yield bundler.Bundle(this.config.Entry, this.config.DedupeGlobs, this.config.IncludePaths);
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
                    data: content
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGF1bmNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQiw0Q0FBNEM7QUFFNUMsc0NBQXNDO0FBRXRDLHlDQUF5QztBQUN6Qyx1Q0FBZ0U7QUFFaEU7SUFDSSxZQUFvQixNQUF3QjtRQUF4QixXQUFNLEdBQU4sTUFBTSxDQUFrQjtJQUFHLENBQUM7SUFFbkMsTUFBTTs7WUFDZixJQUFJO2dCQUNBLE1BQU0sWUFBWSxHQUFpQixFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQU8sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUN4RSxNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFaEgsd0JBQXdCO2dCQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRTtvQkFDckIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRTt3QkFDcEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3pELElBQUksWUFBWSxHQUFHLCtCQUErQixFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQzNELFlBQVksSUFBSSw0QkFBNEIsRUFBRSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDdEYs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QUMsQ0FBQztRQUNwRCxJQUFJLFlBQVksQ0FBQyxPQUFPLEtBQUssSUFBSSxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDbEQsVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDL0I7UUFDRCxJQUFJLFlBQVksQ0FBQyxPQUFPLElBQUksSUFBSSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNqRSxLQUFLLE1BQU0sWUFBWSxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUU7Z0JBQzdDLFVBQVUsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQzVFO1NBQ0o7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUN0QixDQUFDO0lBRU8sYUFBYSxDQUFDLE9BQWU7UUFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRTtZQUNwRCxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0o7QUFuSkQsNEJBbUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzLWV4dHJhXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCAqIGFzIGFyY2h5IGZyb20gXCJhcmNoeVwiO1xyXG5pbXBvcnQgKiBhcyBwcmV0dHlCeXRlcyBmcm9tIFwicHJldHR5LWJ5dGVzXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBub2RlU2FzcyBmcm9tIFwibm9kZS1zYXNzXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IEJ1bmRsZXIsIEJ1bmRsZVJlc3VsdCwgRmlsZVJlZ2lzdHJ5IH0gZnJvbSBcIi4vYnVuZGxlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIExhdW5jaGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY29uZmlnOiBDb250cmFjdHMuQ29uZmlnKSB7fVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkgPSB7fTtcclxuICAgICAgICAgICAgY29uc3QgYnVuZGxlciA9IG5ldyBCdW5kbGVyKGZpbGVSZWdpc3RyeSwgdGhpcy5jb25maWcuUHJvamVjdERpcmVjdG9yeSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1bmRsZVJlc3VsdCA9IGF3YWl0IGJ1bmRsZXIuQnVuZGxlKHRoaXMuY29uZmlnLkVudHJ5LCB0aGlzLmNvbmZpZy5EZWR1cGVHbG9icywgdGhpcy5jb25maWcuSW5jbHVkZVBhdGhzKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEVudHJ5IGZpbGUgc2VhcmNoaW5nLlxyXG4gICAgICAgICAgICBpZiAoIWJ1bmRsZVJlc3VsdC5mb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKGJ1bmRsZVJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYEVudHJ5IGZpbGUgd2FzIG5vdCBmb3VuZDoke29zLkVPTH0ke2J1bmRsZVJlc3VsdC5maWxlUGF0aH0ke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgTG9va2VkIGF0IChmdWxsIHBhdGgpOiR7b3MuRU9MfSR7cmVzb2x2ZWRQYXRofWA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGVycm9yTWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEltcG9ydHMgc2VhcmNoaW5nLiBUT0RPOiBSZW1ha2UgdGhpcyBpbiBtYWpvciB2ZXJzaW9uLlxyXG4gICAgICAgICAgICB0aGlzLmJ1bmRsZVJlc3VsdEZvckVhY2goYnVuZGxlUmVzdWx0LCByZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgICFyZXN1bHQuZm91bmQgJiZcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQudGlsZGUgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5Qcm9qZWN0RGlyZWN0b3J5ID09IG51bGwgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKGJ1bmRsZVJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYEltcG9ydCBmaWxlIHdhcyBub3QgZm91bmQ6JHtvcy5FT0x9JHtyZXN1bHQuZmlsZVBhdGh9JHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYExvb2tlZCBhdCAoZnVsbCBwYXRoKToke29zLkVPTH0ke3Jlc29sdmVkUGF0aH0ke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgTk9USUNFOiBGb3VuZCB0aWxkZSBpbXBvcnQsIGJ1dCBwcm9qZWN0IGxvY2F0aW9uIHdhcyBub3Qgc3BlY2lmaWVkLiR7b3MuRU9MfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGVycm9yTWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJJbXBvcnRzIHRyZWU6XCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXJjaHlEYXRhID0gdGhpcy5nZXRBcmNoeURhdGEoYnVuZGxlUmVzdWx0LCBwYXRoLmRpcm5hbWUodGhpcy5jb25maWcuRW50cnkpKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhhcmNoeShhcmNoeURhdGEpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH1Db25jYXRlbmF0aW9uIHJlc3VsdCBoYXMgbm8gY29udGVudC5gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJTY3NzKGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKHNjc3NFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIFRoZXJlIGlzIGFuIGVycm9yIGluIHlvdXIgc3R5bGVzOiR7b3MuRU9MfSR7c2Nzc0Vycm9yfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgICAgZnMubWtkaXJwU3luYyhwYXRoLmRpcm5hbWUodGhpcy5jb25maWcuRGVzdGluYXRpb24pKTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IGZzLndyaXRlRmlsZSh0aGlzLmNvbmZpZy5EZXN0aW5hdGlvbiwgYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHRoaXMuY29uZmlnLkRlc3RpbmF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYFtEb25lXSBCdW5kbGVkIGludG86JHtvcy5FT0x9JHtmdWxsUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgVG90YWwgc2l6ZSAgICAgICA6ICR7cHJldHR5Qnl0ZXMoYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50Lmxlbmd0aCl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYFNhdmVkIGJ5IGRlZHVwaW5nOiAke3ByZXR0eUJ5dGVzKHRoaXMuY291bnRTYXZlZEJ5dGVzQnlEZWR1cGluZyhidW5kbGVSZXN1bHQsIGZpbGVSZWdpc3RyeSkpfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH0ke2Vycm9yfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVuZGVyU2Nzcyhjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHt9PiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgbm9kZVNhc3MucmVuZGVyKFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGNvbnRlbnRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChgJHtlcnJvci5tZXNzYWdlfSBvbiBsaW5lICgke2Vycm9yLmxpbmV9LCAke2Vycm9yLmNvbHVtbn0pYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgc291cmNlRGlyZWN0b3J5Pzogc3RyaW5nKTogYXJjaHkuRGF0YSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZURpcmVjdG9yeSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGFyY2h5RGF0YTogYXJjaHkuRGF0YSA9IHtcclxuICAgICAgICAgICAgbGFiZWw6IHBhdGgucmVsYXRpdmUoc291cmNlRGlyZWN0b3J5LCBidW5kbGVSZXN1bHQuZmlsZVBhdGgpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKCFidW5kbGVSZXN1bHQuZm91bmQpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLmxhYmVsICs9IGAgW05PVCBGT1VORF1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmRlZHVwZWQpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLmxhYmVsICs9IGAgW0RFRFVQRURdYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5ub2RlcyA9IGJ1bmRsZVJlc3VsdC5pbXBvcnRzLm1hcCh4ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh4ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBcmNoeURhdGEoeCwgc291cmNlRGlyZWN0b3J5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFyY2h5RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE86IFJld3JpdGUgdGhpcyBpbiBtYWpvciB2ZXJzaW9uLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGJ1bmRsZVJlc3VsdEZvckVhY2goYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQsIGNiOiAoYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgICAgICBjYihidW5kbGVSZXN1bHQpO1xyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgYnVuZGxlUmVzdWx0Q2hpbGQgb2YgYnVuZGxlUmVzdWx0LmltcG9ydHMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVuZGxlUmVzdWx0Rm9yRWFjaChidW5kbGVSZXN1bHRDaGlsZCwgY2IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY291bnRTYXZlZEJ5dGVzQnlEZWR1cGluZyhidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBzYXZlZEJ5dGVzID0gMDtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gZmlsZVJlZ2lzdHJ5W2J1bmRsZVJlc3VsdC5maWxlUGF0aF07XHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5kZWR1cGVkID09PSB0cnVlICYmIGNvbnRlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzYXZlZEJ5dGVzID0gY29udGVudC5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsICYmIGJ1bmRsZVJlc3VsdC5pbXBvcnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpbXBvcnRSZXN1bHQgb2YgYnVuZGxlUmVzdWx0LmltcG9ydHMpIHtcclxuICAgICAgICAgICAgICAgIHNhdmVkQnl0ZXMgKz0gdGhpcy5jb3VudFNhdmVkQnl0ZXNCeURlZHVwaW5nKGltcG9ydFJlc3VsdCwgZmlsZVJlZ2lzdHJ5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc2F2ZWRCeXRlcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICAgIH1cclxufVxyXG4iXX0=