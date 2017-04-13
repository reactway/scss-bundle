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
                    if (error == null) {
                        resolve();
                    }
                    else {
                        reject(`${error.message} on line (${error.line}, ${error.column})`);
                    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGF1bmNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsK0JBQStCO0FBQy9CLDRDQUE0QztBQUU1QyxzQ0FBc0M7QUFDdEMsaUNBQWlDO0FBRWpDLHlDQUF5QztBQUN6Qyx1Q0FBZ0U7QUFFaEU7SUFDSSxZQUFvQixNQUF3QjtRQUF4QixXQUFNLEdBQU4sTUFBTSxDQUFrQjtJQUFJLENBQUM7SUFFcEMsTUFBTTs7WUFDZixJQUFJLENBQUM7Z0JBQ0QsTUFBTSxZQUFZLEdBQWlCLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFFdEYsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDdEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUNyRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDekQsSUFBSSxZQUFZLEdBQUcsK0JBQStCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDM0QsWUFBWSxJQUFJLDRCQUE0QixFQUFFLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUN0RixZQUFZLElBQUkseUJBQXlCLEVB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QztZQUNyRCxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLENBQUM7Q0FDSjtBQW5IRCw0QkFtSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tIFwibXovZnNcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuaW1wb3J0ICogYXMgYXJjaHkgZnJvbSBcImFyY2h5XCI7XHJcbmltcG9ydCAqIGFzIHByZXR0eUJ5dGVzIGZyb20gXCJwcmV0dHktYnl0ZXNcIjtcclxuXHJcbmltcG9ydCAqIGFzIG5vZGVTYXNzIGZyb20gXCJub2RlLXNhc3NcIjtcclxuaW1wb3J0ICogYXMgbWtkaXJwIGZyb20gXCJta2RpcnBcIjtcclxuXHJcbmltcG9ydCAqIGFzIENvbnRyYWN0cyBmcm9tIFwiLi9jb250cmFjdHNcIjtcclxuaW1wb3J0IHsgQnVuZGxlciwgQnVuZGxlUmVzdWx0LCBGaWxlUmVnaXN0cnkgfSBmcm9tIFwiLi9idW5kbGVyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTGF1bmNoZXIge1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBjb25maWc6IENvbnRyYWN0cy5Db25maWcpIHsgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyBCdW5kbGUoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkgPSB7fTtcclxuICAgICAgICAgICAgY29uc3QgYnVuZGxlciA9IG5ldyBCdW5kbGVyKGZpbGVSZWdpc3RyeSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1bmRsZVJlc3VsdCA9IGF3YWl0IGJ1bmRsZXIuQnVuZGxlKHRoaXMuY29uZmlnLkVudHJ5LCB0aGlzLmNvbmZpZy5EZWR1cGVHbG9icyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWJ1bmRsZVJlc3VsdC5mb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKGJ1bmRsZVJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYEVudHJ5IGZpbGUgd2FzIG5vdCBmb3VuZDoke29zLkVPTH0ke2J1bmRsZVJlc3VsdC5maWxlUGF0aH0ke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgTG9va2VkIGF0IChmdWxsIHBhdGgpOiR7b3MuRU9MfSR7cmVzb2x2ZWRQYXRofWA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGVycm9yTWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiSW1wb3J0cyB0cmVlOlwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFyY2h5RGF0YSA9IHRoaXMuZ2V0QXJjaHlEYXRhKGJ1bmRsZVJlc3VsdCwgcGF0aC5kaXJuYW1lKHRoaXMuY29uZmlnLkVudHJ5KSk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYXJjaHkoYXJjaHlEYXRhKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9Q29uY2F0ZW5hdGlvbiByZXN1bHQgaGFzIG5vIGNvbnRlbnQuYCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyU2NzcyhidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChzY3NzRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBUaGVyZSBpcyBhbiBlcnJvciBpbiB5b3VyIHN0eWxlczoke29zLkVPTH0ke3Njc3NFcnJvcn1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRW5zdXJlIHRoZSBkaXJlY3RvcnkgZXhpc3RzXHJcbiAgICAgICAgICAgIG1rZGlycC5zeW5jKHBhdGguZGlybmFtZSh0aGlzLmNvbmZpZy5EZXN0aW5hdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKHRoaXMuY29uZmlnLkRlc3RpbmF0aW9uLCBidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUodGhpcy5jb25maWcuRGVzdGluYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgW0RvbmVdIEJ1bmRsZWQgaW50bzoke29zLkVPTH0ke2Z1bGxQYXRofWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBUb3RhbCBzaXplICAgICAgIDogJHtwcmV0dHlCeXRlcyhidW5kbGVSZXN1bHQuYnVuZGxlZENvbnRlbnQubGVuZ3RoKX1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgU2F2ZWQgYnkgZGVkdXBpbmc6ICR7cHJldHR5Qnl0ZXModGhpcy5jb3VudFNhdmVkQnl0ZXNCeURlZHVwaW5nKGJ1bmRsZVJlc3VsdCwgZmlsZVJlZ2lzdHJ5KSl9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfSR7ZXJyb3J9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZW5kZXJTY3NzKGNvbnRlbnQ6IHN0cmluZykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIG5vZGVTYXNzLnJlbmRlcih7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiBjb250ZW50XHJcbiAgICAgICAgICAgIH0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGAke2Vycm9yLm1lc3NhZ2V9IG9uIGxpbmUgKCR7ZXJyb3IubGluZX0sICR7ZXJyb3IuY29sdW1ufSlgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRBcmNoeURhdGEoYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQsIHNvdXJjZURpcmVjdG9yeT86IHN0cmluZykge1xyXG4gICAgICAgIGlmIChzb3VyY2VEaXJlY3RvcnkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzb3VyY2VEaXJlY3RvcnkgPSBwcm9jZXNzLmN3ZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBhcmNoeURhdGE6IGFyY2h5LkRhdGEgPSB7XHJcbiAgICAgICAgICAgIGxhYmVsOiBwYXRoLnJlbGF0aXZlKHNvdXJjZURpcmVjdG9yeSwgYnVuZGxlUmVzdWx0LmZpbGVQYXRoKVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghYnVuZGxlUmVzdWx0LmZvdW5kKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5sYWJlbCArPSBgIFtOT1QgRk9VTkRdYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5kZWR1cGVkKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5sYWJlbCArPSBgIFtERURVUEVEXWA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmltcG9ydHMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBhcmNoeURhdGEubm9kZXMgPSBidW5kbGVSZXN1bHQuaW1wb3J0cy5tYXAoeCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoeCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QXJjaHlEYXRhKHgsIHNvdXJjZURpcmVjdG9yeSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhcmNoeURhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjb3VudFNhdmVkQnl0ZXNCeURlZHVwaW5nKGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0LCBmaWxlUmVnaXN0cnk6IEZpbGVSZWdpc3RyeSkge1xyXG4gICAgICAgIGxldCBzYXZlZEJ5dGVzID0gMDtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gZmlsZVJlZ2lzdHJ5W2J1bmRsZVJlc3VsdC5maWxlUGF0aF07XHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5kZWR1cGVkID09PSB0cnVlICYmIGNvbnRlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzYXZlZEJ5dGVzID0gY29udGVudC5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsICYmIGJ1bmRsZVJlc3VsdC5pbXBvcnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpbXBvcnRSZXN1bHQgb2YgYnVuZGxlUmVzdWx0LmltcG9ydHMpIHtcclxuICAgICAgICAgICAgICAgIHNhdmVkQnl0ZXMgKz0gdGhpcy5jb3VudFNhdmVkQnl0ZXNCeURlZHVwaW5nKGltcG9ydFJlc3VsdCwgZmlsZVJlZ2lzdHJ5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc2F2ZWRCeXRlcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICAgIH1cclxufVxyXG4iXX0=