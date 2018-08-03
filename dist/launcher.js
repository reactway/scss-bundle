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
                const projectDirectory = this.config.ProjectDirectory ? this.config.ProjectDirectory : ".";
                const filePath = path.resolve(projectDirectory + "/node_modules", url.substr(1));
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
                    importer: this.tildeImporter,
                    includePaths: this.config.IncludePaths,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbGF1bmNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQiw0Q0FBNEM7QUFFNUMsc0NBQXNDO0FBRXRDLHlDQUF5QztBQUN6Qyx1Q0FBZ0U7QUFFaEU7SUFDSSxZQUFvQixNQUF3QjtRQUF4QixXQUFNLEdBQU4sTUFBTSxDQUFrQjtRQWdHcEMsa0JBQWEsR0FBc0IsQ0FBQyxHQUFXLEVBQUUsRUFBRTtZQUN2RCxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ2hCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUMzRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLGVBQWUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7YUFDN0I7WUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLENBQUMsQ0FBQTtJQXZHOEMsQ0FBQztJQUVuQyxNQUFNOztZQUNmLElBQUk7Z0JBQ0EsTUFBTSxZQUFZLEdBQWlCLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBRXhFLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQzdCLENBQUM7Z0JBRUYsd0JBQXdCO2dCQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRTtvQkFDckIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRTt3QkFDcEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3pELElBQUksWUFBWSxHQUFHLCtCQUErQixFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQzNELFlBQVksSUFBSSw0QkFBNEIsRUFBRSxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDdEYsWUFBWSxJQUFJLHlCQUF5QixFQUFFLENBQUMsR0FBRyxHQUFHLFlBQVksRUFBRSxDQUFDO3dCQUNqRSxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO3FCQUNwQztpQkFDSjtnQkFFRCx5REFBeUQ7Z0JBQ3pELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEVBQUU7b0JBQzVDLElBQ0ksQ0FBQyxNQUFNLENBQUMsS0FBSzt3QkFDYixNQUFNLENBQUMsS0FBSzt3QkFDWixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixJQUFJLElBQUk7d0JBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUNwRDt3QkFDRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDekQsSUFBSSxZQUFZLEdBQUcsK0JBQStCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDM0QsWUFBWSxJQUFJLDZCQUE2QixFQUFFLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNqRixZQUFZLElBQUkseUJBQXlCLEVBQUUsQ0FBQyxHQUFHLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDMUUsWUFBWSxJQUFJLHNFQUFzRSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQy9GLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ3BDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUVILElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7b0JBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNuRixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2lCQUNsQztnQkFFRCxJQUFJLFlBQVksQ0FBQyxjQUFjLElBQUksSUFBSSxFQUFFO29CQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFO3dCQUNwRCxJQUFJLENBQUMsYUFBYSxDQUFDLCtCQUErQixFQUFFLENBQUMsR0FBRyxzQ0FBc0MsQ0FBQyxDQUFDO3FCQUNuRztvQkFDRCxPQUFPO2lCQUNWO2dCQUNELElBQUk7b0JBQ0EsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQztpQkFDdEQ7Z0JBQUMsT0FBTyxTQUFTLEVBQUU7b0JBQ2hCLElBQUksQ0FBQyxhQUFhLENBQUMsNENBQTRDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsU0FBUyxFQUFFLENBQUMsQ0FBQztpQkFDeEY7Z0JBRUQsOEJBQThCO2dCQUM5QixFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUVyRCxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUV6RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3ZELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7b0JBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxHQUFHLEdBQUcsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDekQsT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsV0FBVyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN0RixPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixXQUFXLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDakg7YUFDSjtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNaLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7b0JBQ3BELElBQUksQ0FBQyxhQUFhLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxHQUFHLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQztpQkFDdkU7YUFDSjtRQUNMLENBQUM7S0FBQTtJQUVhLFVBQVUsQ0FBQyxPQUFlOztZQUNwQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUNuQyxRQUFRLENBQUMsTUFBTSxDQUNYO29CQUNJLElBQUksRUFBRSxPQUFPO29CQUNiLFFBQVEsRUFBRSxJQUFJLENBQUMsYUFBYTtvQkFDNUIsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWTtpQkFDekMsRUFDRCxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtvQkFDZCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7d0JBQ2YsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sYUFBYSxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3FCQUN2RTtvQkFDRCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BCLENBQUMsQ0FDSixDQUFDO1lBQ04sQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO0tBQUE7SUFXTyxZQUFZLENBQUMsWUFBMEIsRUFBRSxlQUF3QjtRQUNyRSxJQUFJLGVBQWUsSUFBSSxJQUFJLEVBQUU7WUFDekIsZUFBZSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNuQztRQUNELE1BQU0sU0FBUyxHQUFlO1lBQzFCLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDO1NBQy9ELENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRTtZQUNyQixTQUFTLENBQUMsS0FBSyxJQUFJLGNBQWMsQ0FBQztTQUNyQztRQUNELElBQUksWUFBWSxDQUFDLE9BQU8sRUFBRTtZQUN0QixTQUFTLENBQUMsS0FBSyxJQUFJLFlBQVksQ0FBQztTQUNuQztRQUNELElBQUksWUFBWSxDQUFDLE9BQU8sRUFBRTtZQUN0QixTQUFTLENBQUMsS0FBSyxJQUFJLFlBQVksQ0FBQztTQUNuQztRQUVELElBQUksWUFBWSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDOUIsU0FBUyxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFO29CQUNYLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7aUJBQ2hEO2dCQUNELE9BQU8sRUFBRSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUM7U0FDTjtRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNLLG1CQUFtQixDQUFDLFlBQTBCLEVBQUUsRUFBd0M7UUFDNUYsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pCLElBQUksWUFBWSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDOUIsS0FBSyxNQUFNLGlCQUFpQixJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUU7Z0JBQ2xELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNuRDtTQUNKO0lBQ0wsQ0FBQztJQUVPLHlCQUF5QixDQUFDLFlBQTBCLEVBQUUsWUFBMEI7UUFDcEYsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsSUFBSSxZQUFZLENBQUMsT0FBTyxLQUFLLElBQUksSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ2xELFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQy9CO1FBQ0QsSUFBSSxZQUFZLENBQUMsT0FBTyxJQUFJLElBQUksSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDakUsS0FBSyxNQUFNLFlBQVksSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFO2dCQUM3QyxVQUFVLElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQzthQUM1RTtTQUNKO1FBQ0QsT0FBTyxVQUFVLENBQUM7SUFDdEIsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUFlO1FBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDcEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUMxQjtRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsQ0FBQztDQUNKO0FBdktELDRCQXVLQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy1leHRyYVwiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBhcmNoeSBmcm9tIFwiYXJjaHlcIjtcclxuaW1wb3J0ICogYXMgcHJldHR5Qnl0ZXMgZnJvbSBcInByZXR0eS1ieXRlc1wiO1xyXG5cclxuaW1wb3J0ICogYXMgbm9kZVNhc3MgZnJvbSBcIm5vZGUtc2Fzc1wiO1xyXG5cclxuaW1wb3J0ICogYXMgQ29udHJhY3RzIGZyb20gXCIuL2NvbnRyYWN0c1wiO1xyXG5pbXBvcnQgeyBCdW5kbGVyLCBCdW5kbGVSZXN1bHQsIEZpbGVSZWdpc3RyeSB9IGZyb20gXCIuL2J1bmRsZXJcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBMYXVuY2hlciB7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbmZpZzogQ29udHJhY3RzLkNvbmZpZykge31cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgQnVuZGxlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5ID0ge307XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1bmRsZXIgPSBuZXcgQnVuZGxlcihmaWxlUmVnaXN0cnksIHRoaXMuY29uZmlnLlByb2plY3REaXJlY3RvcnkpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYnVuZGxlUmVzdWx0ID0gYXdhaXQgYnVuZGxlci5CdW5kbGUoXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5FbnRyeSxcclxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLkRlZHVwZUdsb2JzLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWcuSW5jbHVkZVBhdGhzLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWcuSWdub3JlZEltcG9ydHNcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEVudHJ5IGZpbGUgc2VhcmNoaW5nLlxyXG4gICAgICAgICAgICBpZiAoIWJ1bmRsZVJlc3VsdC5mb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKGJ1bmRsZVJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYEVudHJ5IGZpbGUgd2FzIG5vdCBmb3VuZDoke29zLkVPTH0ke2J1bmRsZVJlc3VsdC5maWxlUGF0aH0ke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgTG9va2VkIGF0IChmdWxsIHBhdGgpOiR7b3MuRU9MfSR7cmVzb2x2ZWRQYXRofWA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGVycm9yTWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEltcG9ydHMgc2VhcmNoaW5nLiBUT0RPOiBSZW1ha2UgdGhpcyBpbiBtYWpvciB2ZXJzaW9uLlxyXG4gICAgICAgICAgICB0aGlzLmJ1bmRsZVJlc3VsdEZvckVhY2goYnVuZGxlUmVzdWx0LCByZXN1bHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgICFyZXN1bHQuZm91bmQgJiZcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQudGlsZGUgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5Qcm9qZWN0RGlyZWN0b3J5ID09IG51bGwgJiZcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKGJ1bmRsZVJlc3VsdC5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYEltcG9ydCBmaWxlIHdhcyBub3QgZm91bmQ6JHtvcy5FT0x9JHtyZXN1bHQuZmlsZVBhdGh9JHtvcy5FT0x9YDtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYExvb2tlZCBhdCAoZnVsbCBwYXRoKToke29zLkVPTH0ke3Jlc29sdmVkUGF0aH0ke29zLkVPTH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgTk9USUNFOiBGb3VuZCB0aWxkZSBpbXBvcnQsIGJ1dCBwcm9qZWN0IGxvY2F0aW9uIHdhcyBub3Qgc3BlY2lmaWVkLiR7b3MuRU9MfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGVycm9yTWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJJbXBvcnRzIHRyZWU6XCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXJjaHlEYXRhID0gdGhpcy5nZXRBcmNoeURhdGEoYnVuZGxlUmVzdWx0LCBwYXRoLmRpcm5hbWUodGhpcy5jb25maWcuRW50cnkpKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhhcmNoeShhcmNoeURhdGEpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH1Db25jYXRlbmF0aW9uIHJlc3VsdCBoYXMgbm8gY29udGVudC5gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJTY3NzKGJ1bmRsZVJlc3VsdC5idW5kbGVkQ29udGVudCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKHNjc3NFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIFRoZXJlIGlzIGFuIGVycm9yIGluIHlvdXIgc3R5bGVzOiR7b3MuRU9MfSR7c2Nzc0Vycm9yfWApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgICAgZnMubWtkaXJwU3luYyhwYXRoLmRpcm5hbWUodGhpcy5jb25maWcuRGVzdGluYXRpb24pKTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IGZzLndyaXRlRmlsZSh0aGlzLmNvbmZpZy5EZXN0aW5hdGlvbiwgYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHRoaXMuY29uZmlnLkRlc3RpbmF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYFtEb25lXSBCdW5kbGVkIGludG86JHtvcy5FT0x9JHtmdWxsUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgVG90YWwgc2l6ZSAgICAgICA6ICR7cHJldHR5Qnl0ZXMoYnVuZGxlUmVzdWx0LmJ1bmRsZWRDb250ZW50Lmxlbmd0aCl9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oYFNhdmVkIGJ5IGRlZHVwaW5nOiAke3ByZXR0eUJ5dGVzKHRoaXMuY291bnRTYXZlZEJ5dGVzQnlEZWR1cGluZyhidW5kbGVSZXN1bHQsIGZpbGVSZWdpc3RyeSkpfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH0ke2Vycm9yfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVuZGVyU2Nzcyhjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHt9PiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgbm9kZVNhc3MucmVuZGVyKFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGNvbnRlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0ZXI6IHRoaXMudGlsZGVJbXBvcnRlcixcclxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlUGF0aHM6IHRoaXMuY29uZmlnLkluY2x1ZGVQYXRocyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChgJHtlcnJvci5tZXNzYWdlfSBvbiBsaW5lICgke2Vycm9yLmxpbmV9LCAke2Vycm9yLmNvbHVtbn0pYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpbGRlSW1wb3J0ZXI6IG5vZGVTYXNzLkltcG9ydGVyID0gKHVybDogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgaWYgKHVybFswXSA9PT0gXCJ+XCIpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvamVjdERpcmVjdG9yeSA9IHRoaXMuY29uZmlnLlByb2plY3REaXJlY3RvcnkgPyB0aGlzLmNvbmZpZy5Qcm9qZWN0RGlyZWN0b3J5IDogXCIuXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKHByb2plY3REaXJlY3RvcnkgKyBcIi9ub2RlX21vZHVsZXNcIiwgdXJsLnN1YnN0cigxKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IGZpbGU6IGZpbGVQYXRoIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IGZpbGU6IHVybCB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0QXJjaHlEYXRhKGJ1bmRsZVJlc3VsdDogQnVuZGxlUmVzdWx0LCBzb3VyY2VEaXJlY3Rvcnk/OiBzdHJpbmcpOiBhcmNoeS5EYXRhIHtcclxuICAgICAgICBpZiAoc291cmNlRGlyZWN0b3J5ID09IG51bGwpIHtcclxuICAgICAgICAgICAgc291cmNlRGlyZWN0b3J5ID0gcHJvY2Vzcy5jd2QoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgYXJjaHlEYXRhOiBhcmNoeS5EYXRhID0ge1xyXG4gICAgICAgICAgICBsYWJlbDogcGF0aC5yZWxhdGl2ZShzb3VyY2VEaXJlY3RvcnksIGJ1bmRsZVJlc3VsdC5maWxlUGF0aClcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAoIWJ1bmRsZVJlc3VsdC5mb3VuZCkge1xyXG4gICAgICAgICAgICBhcmNoeURhdGEubGFiZWwgKz0gYCBbTk9UIEZPVU5EXWA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuZGVkdXBlZCkge1xyXG4gICAgICAgICAgICBhcmNoeURhdGEubGFiZWwgKz0gYCBbREVEVVBFRF1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYnVuZGxlUmVzdWx0Lmlnbm9yZWQpIHtcclxuICAgICAgICAgICAgYXJjaHlEYXRhLmxhYmVsICs9IGAgW0lHTk9SRURdYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGFyY2h5RGF0YS5ub2RlcyA9IGJ1bmRsZVJlc3VsdC5pbXBvcnRzLm1hcCh4ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh4ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBcmNoeURhdGEoeCwgc291cmNlRGlyZWN0b3J5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFyY2h5RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE86IFJld3JpdGUgdGhpcyBpbiBtYWpvciB2ZXJzaW9uLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGJ1bmRsZVJlc3VsdEZvckVhY2goYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQsIGNiOiAoYnVuZGxlUmVzdWx0OiBCdW5kbGVSZXN1bHQpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgICAgICBjYihidW5kbGVSZXN1bHQpO1xyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgYnVuZGxlUmVzdWx0Q2hpbGQgb2YgYnVuZGxlUmVzdWx0LmltcG9ydHMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVuZGxlUmVzdWx0Rm9yRWFjaChidW5kbGVSZXN1bHRDaGlsZCwgY2IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY291bnRTYXZlZEJ5dGVzQnlEZWR1cGluZyhidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnkpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBzYXZlZEJ5dGVzID0gMDtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gZmlsZVJlZ2lzdHJ5W2J1bmRsZVJlc3VsdC5maWxlUGF0aF07XHJcbiAgICAgICAgaWYgKGJ1bmRsZVJlc3VsdC5kZWR1cGVkID09PSB0cnVlICYmIGNvbnRlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzYXZlZEJ5dGVzID0gY29udGVudC5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsICYmIGJ1bmRsZVJlc3VsdC5pbXBvcnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpbXBvcnRSZXN1bHQgb2YgYnVuZGxlUmVzdWx0LmltcG9ydHMpIHtcclxuICAgICAgICAgICAgICAgIHNhdmVkQnl0ZXMgKz0gdGhpcy5jb3VudFNhdmVkQnl0ZXNCeURlZHVwaW5nKGltcG9ydFJlc3VsdCwgZmlsZVJlZ2lzdHJ5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc2F2ZWRCeXRlcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICAgIH1cclxufVxyXG4iXX0=