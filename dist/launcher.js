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
                const bundler = new bundler_1.Bundler(fileRegistry);
                const bundleResult = yield bundler.Bundle(this.config.Entry, this.config.DedupeGlobs, this.config.IncludePaths);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGF1bmNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQiw0Q0FBNEM7QUFFNUMsc0NBQXNDO0FBRXRDLHlDQUF5QztBQUN6Qyx1Q0FBZ0U7QUFFaEU7SUFDSSxZQUFvQixNQUF3QjtRQUF4QixXQUFNLEdBQU4sTUFBTSxDQUFrQjtJQUFJLENBQUM7SUFFcEMsTUFBTTs7WUFDZixJQUFJLENBQUM7Z0JBQ0QsTUFBTSxZQUFZLEdBQWlCLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFaEgsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDdEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUNyRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDekQsSUFBSSxZQUFZLEdBQUcsK0JBQStCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDM0QsWUFBWSxJQUFJLDRCQUE0QixFQUFFLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUN0RixZ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U0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0o7QUFsSEQsNEJBa0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzLWV4dHJhXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCAqIGFzIGFyY2h5IGZyb20gXCJhcmNoeVwiO1xyXG5pbXBvcnQgKiBhcyBwcmV0dHlCeXRlcyBmcm9tIFwicHJldHR5LWJ5dGVzXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBub2RlU2FzcyBmcm9tIFwibm9kZS1zYXNzXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IEJ1bmRsZXIsIEJ1bmRsZVJlc3VsdCwgRmlsZVJlZ2lzdHJ5IH0gZnJvbSBcIi4vYnVuZGxlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIExhdW5jaGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY29uZmlnOiBDb250cmFjdHMuQ29uZmlnKSB7IH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgQnVuZGxlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5ID0ge307XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1bmRsZXIgPSBuZXcgQnVuZGxlcihmaWxlUmVnaXN0cnkpO1xyXG4gICAgICAgICAgICBjb25zdCBidW5kbGVSZXN1bHQgPSBhd2FpdCBidW5kbGVyLkJ1bmRsZSh0aGlzLmNvbmZpZy5FbnRyeSwgdGhpcy5jb25maWcuRGVkdXBlR2xvYnMsIHRoaXMuY29uZmlnLkluY2x1ZGVQYXRocyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWJ1bmRsZVJlc3VsdC5mb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKGJ1bmRsZVJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYEVudHJ5IGZpbGUgd2FzIG5vdCBmb3VuZDoke29zLkVPTH0ke2J1bmRsZVJlc3VsdC5maWxlUGF0aH0ke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgTG9va2VkIGF0IChmdWxsIHBhdGgpOiR7b3MuRU9MfSR7cmVzb2x2ZWRQYXRofWA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGVycm9yTWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiSW1wb3J0cyB0cmVlOlwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFyY2h5RGF0YSA9IHRoaXMuZ2V0QXJjaHlEYXRhKGJ1bmRsZVJlc3VsdCwgcGF0aC5kaXJuYW1lKHRoaXMuY29uZmlnLkVudHJ5KSk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYXJjaHkoYXJjaHlEYXRhKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9Q29uY2F0ZW5hdGlvbiByZXN1bHQgaGFzIG5vIGNvbnRlbnQuYCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyU2NzcyhidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChzY3NzRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBUaGVyZSBpcyBhbiBlcnJvciBpbiB5b3VyIHN0eWxlczoke29zLkVPTH0ke3Njc3NFcnJvcn1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRW5zdXJlIHRoZSBkaXJlY3RvcnkgZXhpc3RzXHJcbiAgICAgICAgICAgIGZzLm1rZGlycFN5bmMocGF0aC5kaXJuYW1lKHRoaXMuY29uZmlnLkRlc3RpbmF0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBmcy53cml0ZUZpbGUodGhpcy5jb25maWcuRGVzdGluYXRpb24sIGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZSh0aGlzLmNvbmZpZy5EZXN0aW5hdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBbRG9uZV0gQnVuZGxlZCBpbnRvOiR7b3MuRU9MfSR7ZnVsbFBhdGh9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYFRvdGFsIHNpemUgICAgICAgOiAke3ByZXR0eUJ5dGVzKGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudC5sZW5ndGgpfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBTYXZlZCBieSBkZWR1cGluZzogJHtwcmV0dHlCeXRlcyh0aGlzLmNvdW50U2F2ZWRCeXRlc0J5RGVkdXBpbmcoYnVuZGxlUmVzdWx0LCBmaWxlUmVnaXN0cnkpKX1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9JHtlcnJvcn1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbmRlclNjc3MoY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx7fT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIG5vZGVTYXNzLnJlbmRlcih7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiBjb250ZW50XHJcbiAgICAgICAgICAgIH0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChgJHtlcnJvci5tZXNzYWdlfSBvbiBsaW5lICgke2Vycm9yLmxpbmV9LCAke2Vycm9yLmNvbHVtbn0pYCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0QXJjaHlEYXRhKGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0LCBzb3VyY2VEaXJlY3Rvcnk/OiBzdHJpbmcpOiBhcmNoeS5EYXRhIHtcclxuICAgICAgICBpZiAoc291cmNlRGlyZWN0b3J5ID09IG51bGwpIHtcclxuICAgICAgICAgICAgc291cmNlRGlyZWN0b3J5ID0gcHJvY2Vzcy5jd2QoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgYXJjaHlEYXRhOiBhcmNoeS5EYXRhID0ge1xyXG4gICAgICAgICAgICBsYWJlbDogcGF0aC5yZWxhdGl2ZShzb3VyY2VEaXJlY3RvcnksIGJ1bmRsZVJlc3VsdC5maWxlUGF0aClcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAoIWJ1bmRsZVJlc3VsdC5mb3VuZCkge1xyXG4gICAgICAgICAgICBhcmNoeURhdGEubGFiZWwgKz0gYCBbTk9UIEZPVU5EXWA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuZGVkdXBlZCkge1xyXG4gICAgICAgICAgICBhcmNoeURhdGEubGFiZWwgKz0gYCBbREVEVVBFRF1gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5pbXBvcnRzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLm5vZGVzID0gYnVuZGxlUmVzdWx0LmltcG9ydHMubWFwKHggPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHggIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEFyY2h5RGF0YSh4LCBzb3VyY2VEaXJlY3RvcnkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXJjaHlEYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY291bnRTYXZlZEJ5dGVzQnlEZWR1cGluZyhidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBzYXZlZEJ5dGVzID0gMDtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gZmlsZVJlZ2lzdHJ5W2J1bmRsZVJlc3VsdC5maWxlUGF0aF07XHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5kZWR1cGVkID09PSB0cnVlICYmIGNvbnRlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzYXZlZEJ5dGVzID0gY29udGVudC5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsICYmIGJ1bmRsZVJlc3VsdC5pbXBvcnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpbXBvcnRSZXN1bHQgb2YgYnVuZGxlUmVzdWx0LmltcG9ydHMpIHtcclxuICAgICAgICAgICAgICAgIHNhdmVkQnl0ZXMgKz0gdGhpcy5jb3VudFNhdmVkQnl0ZXNCeURlZHVwaW5nKGltcG9ydFJlc3VsdCwgZmlsZVJlZ2lzdHJ5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc2F2ZWRCeXRlcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICAgIH1cclxufVxyXG4iXX0=