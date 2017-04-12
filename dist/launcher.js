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
const sass = require("node-sass");
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
                let bundleResult = yield bundler_1.Bundler.Bundle(this.config.Entry);
                if (!bundleResult.found) {
                    if (this.config.Verbosity !== Contracts.Verbosity.None) {
                        let resolvedPath = path.resolve(bundleResult.filePath);
                        let errorMessage = `[Error] An error has occured${os.EOL}`;
                        errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
                        errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
                        this.exitWithError(errorMessage);
                    }
                }
                let archyData = this.getArchyData(bundleResult, path.dirname(this.config.Entry));
                if (this.config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info(archy(archyData));
                }
                if (bundleResult.content == null) {
                    if (this.config.Verbosity !== Contracts.Verbosity.None) {
                        this.exitWithError(`[Error] An error has occured${os.EOL}Concatenation result has no content.`);
                    }
                    return;
                }
                try {
                    yield this.renderScss(bundleResult.content);
                }
                catch (scssError) {
                    this.exitWithError(`[Error] There is an error in your styles:${os.EOL}${scssError}`);
                }
                // Ensure the directory exists
                mkdirp.sync(path.dirname(this.config.Destination));
                yield fs.writeFile(this.config.Destination, bundleResult.content);
                let fullPath = path.resolve(this.config.Destination);
                if (this.config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info(`[Done] Bundled into:${os.EOL}${fullPath}`);
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
                sass.render({
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
        let archyData = {
            label: path.relative(sourceDirectory, bundleResult.filePath)
        };
        if (!bundleResult.found) {
            archyData.label += ` [NOT FOUND]`;
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
    exitWithError(message) {
        if (this.config.Verbosity !== Contracts.Verbosity.None) {
            console.error(message);
        }
        process.exit(1);
    }
}
exports.Launcher = Launcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGF1bmNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsK0JBQStCO0FBRS9CLGtDQUFrQztBQUNsQyxpQ0FBaUM7QUFFakMseUNBQXlDO0FBQ3pDLHVDQUFrRDtBQUVsRDtJQUNJLFlBQW9CLE1BQXdCO1FBQXhCLFdBQU0sR0FBTixNQUFNLENBQWtCO0lBQUksQ0FBQztJQUVwQyxNQUFNOztZQUNmLElBQUksQ0FBQztnQkFDRCxJQUFJLFlBQVksR0FBRyxNQUFNLGlCQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRTNELEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDckQsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3ZELElBQUksWUFBWSxHQUFHLCtCQUErQixFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQzNELFlBQVksSUFBSSw0QkFBNEIsRUFBRSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDdEYsWUFBWSxJQUFJLHlCQUF5QixFQUFFLENBQUMsR0FBRyxHQUFHLFlBQVksRUFBRSxDQUFDO3dCQUNqRSxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUNyQyxDQUFDO2dCQUNMLENBQUM7Z0JBRUQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFD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QixDQUFDO0NBQ0o7QUE3RkQsNEJBNkZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcIm16L2ZzXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCAqIGFzIGFyY2h5IGZyb20gXCJhcmNoeVwiO1xyXG5cclxuaW1wb3J0ICogYXMgc2FzcyBmcm9tIFwibm9kZS1zYXNzXCI7XHJcbmltcG9ydCAqIGFzIG1rZGlycCBmcm9tIFwibWtkaXJwXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IEJ1bmRsZXIsIEJ1bmRsZVJlc3VsdCB9IGZyb20gXCIuL2J1bmRsZXJcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBMYXVuY2hlciB7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbmZpZzogQ29udHJhY3RzLkNvbmZpZykgeyB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIEJ1bmRsZSgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgYnVuZGxlUmVzdWx0ID0gYXdhaXQgQnVuZGxlci5CdW5kbGUodGhpcy5jb25maWcuRW50cnkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFidW5kbGVSZXN1bHQuZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByZXNvbHZlZFBhdGggPSBwYXRoLnJlc29sdmUoYnVuZGxlUmVzdWx0LmZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgRW50cnkgZmlsZSB3YXMgbm90IGZvdW5kOiR7b3MuRU9MfSR7YnVuZGxlUmVzdWx0LmZpbGVQYXRofSR7b3MuRU9MfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlICs9IGBMb29rZWQgYXQgKGZ1bGwgcGF0aCk6JHtvcy5FT0x9JHtyZXNvbHZlZFBhdGh9YDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoZXJyb3JNZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGFyY2h5RGF0YSA9IHRoaXMuZ2V0QXJjaHlEYXRhKGJ1bmRsZVJlc3VsdCwgcGF0aC5kaXJuYW1lKHRoaXMuY29uZmlnLkVudHJ5KSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGFyY2h5KGFyY2h5RGF0YSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmNvbnRlbnQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9Q29uY2F0ZW5hdGlvbiByZXN1bHQgaGFzIG5vIGNvbnRlbnQuYCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyU2NzcyhidW5kbGVSZXN1bHQuY29udGVudCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKHNjc3NFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIFRoZXJlIGlzIGFuIGVycm9yIGluIHlvdXIgc3R5bGVzOiR7b3MuRU9MfSR7c2Nzc0Vycm9yfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgICAgbWtkaXJwLnN5bmMocGF0aC5kaXJuYW1lKHRoaXMuY29uZmlnLkRlc3RpbmF0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBmcy53cml0ZUZpbGUodGhpcy5jb25maWcuRGVzdGluYXRpb24sIGJ1bmRsZVJlc3VsdC5jb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZSh0aGlzLmNvbmZpZy5EZXN0aW5hdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBbRG9uZV0gQnVuZGxlZCBpbnRvOiR7b3MuRU9MfSR7ZnVsbFBhdGh9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfSR7ZXJyb3J9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZW5kZXJTY3NzKGNvbnRlbnQ6IHN0cmluZykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHNhc3MucmVuZGVyKHtcclxuICAgICAgICAgICAgICAgIGRhdGE6IGNvbnRlbnRcclxuICAgICAgICAgICAgfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoYCR7ZXJyb3IubWVzc2FnZX0gb24gbGluZSAoJHtlcnJvci5saW5lfSwgJHtlcnJvci5jb2x1bW59KWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgc291cmNlRGlyZWN0b3J5Pzogc3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZURpcmVjdG9yeSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBhcmNoeURhdGE6IGFyY2h5LkRhdGEgPSB7XHJcbiAgICAgICAgICAgIGxhYmVsOiBwYXRoLnJlbGF0aXZlKHNvdXJjZURpcmVjdG9yeSwgYnVuZGxlUmVzdWx0LmZpbGVQYXRoKVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghYnVuZGxlUmVzdWx0LmZvdW5kKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5sYWJlbCArPSBgIFtOT1QgRk9VTkRdYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5ub2RlcyA9IGJ1bmRsZVJlc3VsdC5pbXBvcnRzLm1hcCh4ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh4ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBcmNoeURhdGEoeCwgc291cmNlRGlyZWN0b3J5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFyY2h5RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICAgIH1cclxufVxyXG4iXX0=