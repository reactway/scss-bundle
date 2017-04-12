#!/usr/bin/env node
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
const arguments_1 = require("./arguments");
const DEFAULT_CONFIG_NAME = "scss-bundle.config.json";
class Cli {
    constructor(ArgumentValues) {
        this.ArgumentValues = ArgumentValues;
        this.main(this.ArgumentValues);
    }
    main(argumentValues) {
        return __awaiter(this, void 0, void 0, function* () {
            let config;
            // Resolve config file path
            let fullConfigPath = path.resolve(argumentValues.config || DEFAULT_CONFIG_NAME);
            let verbosity = Contracts.Verbosity.Verbose;
            // Resolve config
            if (yield this.configExists(fullConfigPath)) {
                try {
                    let readConfig = yield this.readConfigFile(fullConfigPath);
                    verbosity = this.resolveVerbosity(argumentValues.verbosity || readConfig.verbosity);
                    config = {
                        Entry: argumentValues.entry || readConfig.entry,
                        Destination: argumentValues.dest || readConfig.dest,
                        Verbosity: verbosity
                    };
                    if (verbosity === Contracts.Verbosity.Verbose) {
                        console.info("Using config file:", fullConfigPath);
                    }
                }
                catch (err) {
                    this.exitWithError(`[Error] Config file ${fullConfigPath} is not valid.`);
                    return;
                }
            }
            else if (argumentValues.entry != null && argumentValues.dest != null) {
                verbosity = this.resolveVerbosity(argumentValues.verbosity);
                config = {
                    Entry: argumentValues.entry,
                    Destination: argumentValues.dest,
                    Verbosity: verbosity
                };
            }
            else {
                this.exitWithError("[Error] Entry and destination arguments are missing and no config was found.");
                return;
            }
            if (config.Verbosity === Contracts.Verbosity.Verbose) {
                console.info("Using config:");
                console.info(JSON.stringify(config, null, 4));
            }
            this.Config = config;
            // Bundle the styles
            this.bundle();
        });
    }
    bundle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let bundleResult = yield bundler_1.Bundler.Bundle(this.Config.Entry);
                if (!bundleResult.found) {
                    if (this.Config.Verbosity !== Contracts.Verbosity.None) {
                        let resolvedPath = path.resolve(bundleResult.filePath);
                        let errorMessage = `[Error] An error has occured${os.EOL}`;
                        errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
                        errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
                        this.exitWithError(errorMessage);
                    }
                }
                let archyData = this.getArchyData(bundleResult, path.dirname(this.Config.Entry));
                if (this.Config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info(archy(archyData));
                }
                if (bundleResult.content == null) {
                    if (this.Config.Verbosity !== Contracts.Verbosity.None) {
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
                mkdirp.sync(path.dirname(this.Config.Destination));
                yield fs.writeFile(this.Config.Destination, bundleResult.content);
                let fullPath = path.resolve(this.Config.Destination);
                if (this.Config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info(`[Done] Bundled into:${os.EOL}${fullPath}`);
                }
            }
            catch (error) {
                if (this.Config.Verbosity !== Contracts.Verbosity.None) {
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
    resolveVerbosity(verbosity) {
        // Convert given value to an appropriate Verbosity enum value.
        // 'as any as number' is used because TypeScript thinks
        //  that we cast string to number, even though we get a number there
        return Contracts.Verbosity[verbosity];
    }
    configExists(fullPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.access(fullPath, fs.constants.F_OK);
                return true;
            }
            catch (err) {
                return false;
            }
        });
    }
    readConfigFile(fullPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = yield fs.readFile(fullPath, "utf8");
            return JSON.parse(data);
        });
    }
    exitWithError(message) {
        if (this.Config.Verbosity !== Contracts.Verbosity.None) {
            console.error(message);
        }
        process.exit(1);
    }
}
new Cli(arguments_1.argv);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFDQSw0QkFBNEI7QUFDNUIsNkJBQTZCO0FBQzdCLHlCQUF5QjtBQUN6QiwrQkFBK0I7QUFFL0Isa0NBQWtDO0FBQ2xDLGlDQUFpQztBQUVqQyx5Q0FBeUM7QUFDekMsdUNBQWtEO0FBQ2xELDJDQUFtQztBQUVuQyxNQUFNLG1CQUFtQixHQUFHLHlCQUF5QixDQUFDO0FBRXREO0lBR0ksWUFBc0IsY0FBeUM7UUFBekMsbUJBQWMsR0FBZCxjQUFjLENBQTJCO1FBQzNELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFYSxJQUFJLENBQUMsY0FBeUM7O1lBQ3hELElBQUksTUFBd0IsQ0FBQztZQUU3QiwyQkFBMkI7WUFDM0IsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLG1CQUFtQixDQUFDLENBQUM7WUFFaEYsSUFBSSxTQUFTLEdBQXdCLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1lBRWpFLGlCQUFpQjtZQUNqQixFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLENBQUM7b0JBQ0QsSUFBSSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUMzRCxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxTQUFTLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUNwRixNQUFNLEdBQUc7d0JBQ0wsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLLElBQUksVUFBVSxDQUFDLEtBQUs7d0JBQy9DLFdBQVcsRUFB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QUM7WUFDakIsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVhLGNBQWMsQ0FBQyxRQUFnQjs7WUFDekMsSUFBSSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDO0tBQUE7SUFFTyxhQUFhLENBQUMsT0FBZTtRQUNqQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0o7QUFFRCxJQUFJLEdBQUcsQ0FBQyxnQkFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJtei9mc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBhcmNoeSBmcm9tIFwiYXJjaHlcIjtcclxuXHJcbmltcG9ydCAqIGFzIHNhc3MgZnJvbSBcIm5vZGUtc2Fzc1wiO1xyXG5pbXBvcnQgKiBhcyBta2RpcnAgZnJvbSBcIm1rZGlycFwiO1xyXG5cclxuaW1wb3J0ICogYXMgQ29udHJhY3RzIGZyb20gXCIuL2NvbnRyYWN0c1wiO1xyXG5pbXBvcnQgeyBCdW5kbGVyLCBCdW5kbGVSZXN1bHQgfSBmcm9tIFwiLi9idW5kbGVyXCI7XHJcbmltcG9ydCB7IGFyZ3YgfSBmcm9tIFwiLi9hcmd1bWVudHNcIjtcclxuXHJcbmNvbnN0IERFRkFVTFRfQ09ORklHX05BTUUgPSBcInNjc3MtYnVuZGxlLmNvbmZpZy5qc29uXCI7XHJcblxyXG5jbGFzcyBDbGkge1xyXG4gICAgQ29uZmlnOiBDb250cmFjdHMuQ29uZmlnO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBBcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcykge1xyXG4gICAgICAgIHRoaXMubWFpbih0aGlzLkFyZ3VtZW50VmFsdWVzKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG1haW4oYXJndW1lbnRWYWx1ZXM6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpIHtcclxuICAgICAgICBsZXQgY29uZmlnOiBDb250cmFjdHMuQ29uZmlnO1xyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIGNvbmZpZyBmaWxlIHBhdGhcclxuICAgICAgICBsZXQgZnVsbENvbmZpZ1BhdGggPSBwYXRoLnJlc29sdmUoYXJndW1lbnRWYWx1ZXMuY29uZmlnIHx8IERFRkFVTFRfQ09ORklHX05BTUUpO1xyXG5cclxuICAgICAgICBsZXQgdmVyYm9zaXR5OiBDb250cmFjdHMuVmVyYm9zaXR5ID0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlO1xyXG5cclxuICAgICAgICAvLyBSZXNvbHZlIGNvbmZpZ1xyXG4gICAgICAgIGlmIChhd2FpdCB0aGlzLmNvbmZpZ0V4aXN0cyhmdWxsQ29uZmlnUGF0aCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGxldCByZWFkQ29uZmlnID0gYXdhaXQgdGhpcy5yZWFkQ29uZmlnRmlsZShmdWxsQ29uZmlnUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB2ZXJib3NpdHkgPSB0aGlzLnJlc29sdmVWZXJib3NpdHkoYXJndW1lbnRWYWx1ZXMudmVyYm9zaXR5IHx8IHJlYWRDb25maWcudmVyYm9zaXR5KTtcclxuICAgICAgICAgICAgICAgIGNvbmZpZyA9IHtcclxuICAgICAgICAgICAgICAgICAgICBFbnRyeTogYXJndW1lbnRWYWx1ZXMuZW50cnkgfHwgcmVhZENvbmZpZy5lbnRyeSxcclxuICAgICAgICAgICAgICAgICAgICBEZXN0aW5hdGlvbjogYXJndW1lbnRWYWx1ZXMuZGVzdCB8fCByZWFkQ29uZmlnLmRlc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgVmVyYm9zaXR5OiB2ZXJib3NpdHlcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiVXNpbmcgY29uZmlnIGZpbGU6XCIsIGZ1bGxDb25maWdQYXRoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gQ29uZmlnIGZpbGUgJHtmdWxsQ29uZmlnUGF0aH0gaXMgbm90IHZhbGlkLmApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudFZhbHVlcy5lbnRyeSAhPSBudWxsICYmIGFyZ3VtZW50VmFsdWVzLmRlc3QgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB2ZXJib3NpdHkgPSB0aGlzLnJlc29sdmVWZXJib3NpdHkoYXJndW1lbnRWYWx1ZXMudmVyYm9zaXR5KTtcclxuICAgICAgICAgICAgY29uZmlnID0ge1xyXG4gICAgICAgICAgICAgICAgRW50cnk6IGFyZ3VtZW50VmFsdWVzLmVudHJ5LFxyXG4gICAgICAgICAgICAgICAgRGVzdGluYXRpb246IGFyZ3VtZW50VmFsdWVzLmRlc3QsXHJcbiAgICAgICAgICAgICAgICBWZXJib3NpdHk6IHZlcmJvc2l0eVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihcIltFcnJvcl0gRW50cnkgYW5kIGRlc3RpbmF0aW9uIGFyZ3VtZW50cyBhcmUgbWlzc2luZyBhbmQgbm8gY29uZmlnIHdhcyBmb3VuZC5cIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiVXNpbmcgY29uZmlnOlwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5pbmZvKEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgNCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5Db25maWcgPSBjb25maWc7XHJcblxyXG4gICAgICAgIC8vIEJ1bmRsZSB0aGUgc3R5bGVzXHJcbiAgICAgICAgdGhpcy5idW5kbGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1bmRsZSgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgYnVuZGxlUmVzdWx0ID0gYXdhaXQgQnVuZGxlci5CdW5kbGUodGhpcy5Db25maWcuRW50cnkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFidW5kbGVSZXN1bHQuZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLkNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByZXNvbHZlZFBhdGggPSBwYXRoLnJlc29sdmUoYnVuZGxlUmVzdWx0LmZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgRW50cnkgZmlsZSB3YXMgbm90IGZvdW5kOiR7b3MuRU9MfSR7YnVuZGxlUmVzdWx0LmZpbGVQYXRofSR7b3MuRU9MfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlICs9IGBMb29rZWQgYXQgKGZ1bGwgcGF0aCk6JHtvcy5FT0x9JHtyZXNvbHZlZFBhdGh9YDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoZXJyb3JNZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGFyY2h5RGF0YSA9IHRoaXMuZ2V0QXJjaHlEYXRhKGJ1bmRsZVJlc3VsdCwgcGF0aC5kaXJuYW1lKHRoaXMuQ29uZmlnLkVudHJ5KSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLkNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGFyY2h5KGFyY2h5RGF0YSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmNvbnRlbnQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuQ29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9Q29uY2F0ZW5hdGlvbiByZXN1bHQgaGFzIG5vIGNvbnRlbnQuYCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyU2NzcyhidW5kbGVSZXN1bHQuY29udGVudCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKHNjc3NFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIFRoZXJlIGlzIGFuIGVycm9yIGluIHlvdXIgc3R5bGVzOiR7b3MuRU9MfSR7c2Nzc0Vycm9yfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgICAgbWtkaXJwLnN5bmMocGF0aC5kaXJuYW1lKHRoaXMuQ29uZmlnLkRlc3RpbmF0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBmcy53cml0ZUZpbGUodGhpcy5Db25maWcuRGVzdGluYXRpb24sIGJ1bmRsZVJlc3VsdC5jb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZSh0aGlzLkNvbmZpZy5EZXN0aW5hdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLkNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBbRG9uZV0gQnVuZGxlZCBpbnRvOiR7b3MuRU9MfSR7ZnVsbFBhdGh9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5Db25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfSR7ZXJyb3J9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZW5kZXJTY3NzKGNvbnRlbnQ6IHN0cmluZykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHNhc3MucmVuZGVyKHtcclxuICAgICAgICAgICAgICAgIGRhdGE6IGNvbnRlbnRcclxuICAgICAgICAgICAgfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoYCR7ZXJyb3IubWVzc2FnZX0gb24gbGluZSAoJHtlcnJvci5saW5lfSwgJHtlcnJvci5jb2x1bW59KWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgc291cmNlRGlyZWN0b3J5Pzogc3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZURpcmVjdG9yeSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBhcmNoeURhdGE6IGFyY2h5LkRhdGEgPSB7XHJcbiAgICAgICAgICAgIGxhYmVsOiBwYXRoLnJlbGF0aXZlKHNvdXJjZURpcmVjdG9yeSwgYnVuZGxlUmVzdWx0LmZpbGVQYXRoKVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghYnVuZGxlUmVzdWx0LmZvdW5kKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5sYWJlbCArPSBgIFtOT1QgRk9VTkRdYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5ub2RlcyA9IGJ1bmRsZVJlc3VsdC5pbXBvcnRzLm1hcCh4ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh4ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBcmNoeURhdGEoeCwgc291cmNlRGlyZWN0b3J5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFyY2h5RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlc29sdmVWZXJib3NpdHkodmVyYm9zaXR5OiBhbnkpIHtcclxuICAgICAgICAvLyBDb252ZXJ0IGdpdmVuIHZhbHVlIHRvIGFuIGFwcHJvcHJpYXRlIFZlcmJvc2l0eSBlbnVtIHZhbHVlLlxyXG4gICAgICAgIC8vICdhcyBhbnkgYXMgbnVtYmVyJyBpcyB1c2VkIGJlY2F1c2UgVHlwZVNjcmlwdCB0aGlua3NcclxuICAgICAgICAvLyAgdGhhdCB3ZSBjYXN0IHN0cmluZyB0byBudW1iZXIsIGV2ZW4gdGhvdWdoIHdlIGdldCBhIG51bWJlciB0aGVyZVxyXG4gICAgICAgIHJldHVybiBDb250cmFjdHMuVmVyYm9zaXR5W3ZlcmJvc2l0eV0gYXMgYW55IGFzIG51bWJlcjtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNvbmZpZ0V4aXN0cyhmdWxsUGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZ1bGxQYXRoLCBmcy5jb25zdGFudHMuRl9PSyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVhZENvbmZpZ0ZpbGUoZnVsbFBhdGg6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgbGV0IGRhdGEgPSBhd2FpdCBmcy5yZWFkRmlsZShmdWxsUGF0aCwgXCJ1dGY4XCIpO1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhpdFdpdGhFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAodGhpcy5Db25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xyXG4gICAgfVxyXG59XHJcblxyXG5uZXcgQ2xpKGFyZ3YpO1xyXG4iXX0=