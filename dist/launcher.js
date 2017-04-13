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
const path = require("path");
const os = require("os");
const archy = require("archy");
const prettyBytes = require("pretty-bytes");
const nodeSass = require("node-sass");
const mkdirp = require("mkdirp");
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
                const bundler = new bundler_1.Bundler(fileRegistry);
                const bundleResult = yield bundler.Bundle(this.config.Entry, this.config.DedupeGlobs);
                if (!bundleResult.found) {
                    if (this.config.Verbosity !== Contracts.Verbosity.None) {
                        const resolvedPath = path.resolve(bundleResult.filePath);
                        let errorMessage = `[Error] An error has occured${os.EOL}`;
                        errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
                        errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
                        this.exitWithError(errorMessage);
                    }
                }
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
                mkdirp.sync(path.dirname(this.config.Destination));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGF1bmNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQiw0Q0FBNEM7QUFFNUMsc0NBQXNDO0FBQ3RDLGlDQUFpQztBQUVqQyx5Q0FBeUM7QUFDekMsdUNBQWdFO0FBRWhFO0lBQ0ksWUFBb0IsTUFBd0I7UUFBeEIsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7SUFBSSxDQUFDO0lBRXBDLE1BQU07O1lBQ2YsSUFBSSxDQUFDO2dCQUNELE1BQU0sWUFBWSxHQUFpQixFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBRXRGLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDckQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3pELElBQUksWUFBWSxHQUFHLCtCQUErQixFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQzNELFlBQVksSUFBSSw0QkFBNEIsRUFBRSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDdEYsWUFBWSxJQUFJLHlCQUF5QixF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QUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0o7QUFsSEQsNEJBa0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcIm16L2ZzXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCAqIGFzIGFyY2h5IGZyb20gXCJhcmNoeVwiO1xyXG5pbXBvcnQgKiBhcyBwcmV0dHlCeXRlcyBmcm9tIFwicHJldHR5LWJ5dGVzXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBub2RlU2FzcyBmcm9tIFwibm9kZS1zYXNzXCI7XHJcbmltcG9ydCAqIGFzIG1rZGlycCBmcm9tIFwibWtkaXJwXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IEJ1bmRsZXIsIEJ1bmRsZVJlc3VsdCwgRmlsZVJlZ2lzdHJ5IH0gZnJvbSBcIi4vYnVuZGxlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIExhdW5jaGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY29uZmlnOiBDb250cmFjdHMuQ29uZmlnKSB7IH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgQnVuZGxlKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5ID0ge307XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1bmRsZXIgPSBuZXcgQnVuZGxlcihmaWxlUmVnaXN0cnkpO1xyXG4gICAgICAgICAgICBjb25zdCBidW5kbGVSZXN1bHQgPSBhd2FpdCBidW5kbGVyLkJ1bmRsZSh0aGlzLmNvbmZpZy5FbnRyeSwgdGhpcy5jb25maWcuRGVkdXBlR2xvYnMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFidW5kbGVSZXN1bHQuZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkUGF0aCA9IHBhdGgucmVzb2x2ZShidW5kbGVSZXN1bHQuZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSBgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlICs9IGBFbnRyeSBmaWxlIHdhcyBub3QgZm91bmQ6JHtvcy5FT0x9JHtidW5kbGVSZXN1bHQuZmlsZVBhdGh9JHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYExvb2tlZCBhdCAoZnVsbCBwYXRoKToke29zLkVPTH0ke3Jlc29sdmVkUGF0aH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihlcnJvck1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkltcG9ydHMgdHJlZTpcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhcmNoeURhdGEgPSB0aGlzLmdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQsIHBhdGguZGlybmFtZSh0aGlzLmNvbmZpZy5FbnRyeSkpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGFyY2h5KGFyY2h5RGF0YSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfUNvbmNhdGVuYXRpb24gcmVzdWx0IGhhcyBubyBjb250ZW50LmApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlclNjc3MoYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoc2Nzc0Vycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gVGhlcmUgaXMgYW4gZXJyb3IgaW4geW91ciBzdHlsZXM6JHtvcy5FT0x9JHtzY3NzRXJyb3J9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEVuc3VyZSB0aGUgZGlyZWN0b3J5IGV4aXN0c1xyXG4gICAgICAgICAgICBta2RpcnAuc3luYyhwYXRoLmRpcm5hbWUodGhpcy5jb25maWcuRGVzdGluYXRpb24pKTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IGZzLndyaXRlRmlsZSh0aGlzLmNvbmZpZy5EZXN0aW5hdGlvbiwgYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHRoaXMuY29uZmlnLkRlc3RpbmF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYFtEb25lXSBCdW5kbGVkIGludG86JHtvcy5FT0x9JHtmdWxsUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgVG90YWwgc2l6ZSAgICAgICA6ICR7cHJldHR5Qnl0ZXMoYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50Lmxlbmd0aCl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYFNhdmVkIGJ5IGRlZHVwaW5nOiAke3ByZXR0eUJ5dGVzKHRoaXMuY291bnRTYXZlZEJ5dGVzQnlEZWR1cGluZyhidW5kbGVSZXN1bHQsIGZpbGVSZWdpc3RyeSkpfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH0ke2Vycm9yfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVuZGVyU2Nzcyhjb250ZW50OiBzdHJpbmcpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBub2RlU2Fzcy5yZW5kZXIoe1xyXG4gICAgICAgICAgICAgICAgZGF0YTogY29udGVudFxyXG4gICAgICAgICAgICB9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoYCR7ZXJyb3IubWVzc2FnZX0gb24gbGluZSAoJHtlcnJvci5saW5lfSwgJHtlcnJvci5jb2x1bW59KWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgc291cmNlRGlyZWN0b3J5Pzogc3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZURpcmVjdG9yeSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGFyY2h5RGF0YTogYXJjaHkuRGF0YSA9IHtcclxuICAgICAgICAgICAgbGFiZWw6IHBhdGgucmVsYXRpdmUoc291cmNlRGlyZWN0b3J5LCBidW5kbGVSZXN1bHQuZmlsZVBhdGgpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKCFidW5kbGVSZXN1bHQuZm91bmQpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLmxhYmVsICs9IGAgW05PVCBGT1VORF1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmRlZHVwZWQpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLmxhYmVsICs9IGAgW0RFRFVQRURdYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5ub2RlcyA9IGJ1bmRsZVJlc3VsdC5pbXBvcnRzLm1hcCh4ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh4ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBcmNoeURhdGEoeCwgc291cmNlRGlyZWN0b3J5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFyY2h5RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvdW50U2F2ZWRCeXRlc0J5RGVkdXBpbmcoYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQsIGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5KSB7XHJcbiAgICAgICAgbGV0IHNhdmVkQnl0ZXMgPSAwO1xyXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmaWxlUmVnaXN0cnlbYnVuZGxlUmVzdWx0LmZpbGVQYXRoXTtcclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmRlZHVwZWQgPT09IHRydWUgJiYgY29udGVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNhdmVkQnl0ZXMgPSBjb250ZW50Lmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5pbXBvcnRzICE9IG51bGwgJiYgYnVuZGxlUmVzdWx0LmltcG9ydHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGltcG9ydFJlc3VsdCBvZiBidW5kbGVSZXN1bHQuaW1wb3J0cykge1xyXG4gICAgICAgICAgICAgICAgc2F2ZWRCeXRlcyArPSB0aGlzLmNvdW50U2F2ZWRCeXRlc0J5RGVkdXBpbmcoaW1wb3J0UmVzdWx0LCBmaWxlUmVnaXN0cnkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzYXZlZEJ5dGVzO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhpdFdpdGhFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==