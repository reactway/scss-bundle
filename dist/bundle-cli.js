#!/usr/bin/env node
Object.defineProperty(exports, "__esModule", { value: true });
const arguments_1 = require("./arguments");
const launcher_1 = require("./launcher");
class BundleCli {
    constructor(argv) {
        new launcher_1.Launcher(this.getConfig(argv));
    }
    getConfig(argv) {
        return {
            Destination: argv.dest,
            Entry: argv.entry,
            DedupePaths: argv.dedupePaths || [],
            Verbosity: argv.verbosity
        };
    }
}
new BundleCli(arguments_1.argv);
// import * as fs from "mz/fs";
// import * as path from "path";
// import * as os from "os";
// import * as archy from "archy";
// import * as sass from "node-sass";
// import * as mkdirp from "mkdirp";
// import * as Contracts from "./contracts";
// import { Bundler, BundleResult } from "./bundler";
// import { argv } from "./arguments";
// const DEFAULT_CONFIG_NAME = "scss-bundle.config.json";
// class Cli {
//     Config: Contracts.Config;
//     constructor(protected ArgumentValues: Contracts.ArgumentsValues) {
//         this.main(this.ArgumentValues);
//     }
//     private async main(argumentValues: Contracts.ArgumentsValues) {
//         let config: Contracts.Config;
//         // Resolve config file path
//         let fullConfigPath = path.resolve(argumentValues.config || DEFAULT_CONFIG_NAME);
//         let verbosity: Contracts.Verbosity = Contracts.Verbosity.Verbose;
//         // Resolve config
//         if (await this.configExists(fullConfigPath)) {
//             try {
//                 let readConfig = await this.readConfigFile(fullConfigPath);
//                 verbosity = this.resolveVerbosity(argumentValues.verbosity || readConfig.verbosity);
//                 config = {
//                     Entry: argumentValues.entry || readConfig.entry,
//                     Destination: argumentValues.dest || readConfig.dest,
//                     Verbosity: verbosity,
//                     ImportOnce: readConfig || []
//                 };
//                 if (verbosity === Contracts.Verbosity.Verbose) {
//                     console.info("Using config file:", fullConfigPath);
//                 }
//             } catch (err) {
//                 this.exitWithError(`[Error] Config file ${fullConfigPath} is not valid.`);
//                 return;
//             }
//         } else if (argumentValues.entry != null && argumentValues.dest != null) {
//             verbosity = this.resolveVerbosity(argumentValues.verbosity);
//             config = {
//                 Entry: argumentValues.entry,
//                 Destination: argumentValues.dest,
//                 Verbosity: verbosity,
//                 ImportOnce: []
//             };
//         } else {
//             this.exitWithError("[Error] Entry and destination arguments are missing and no config was found.");
//             return;
//         }
//         if (config.Verbosity === Contracts.Verbosity.Verbose) {
//             console.info("Using config:");
//             console.info(JSON.stringify(config, null, 4));
//         }
//         this.Config = config;
//         // Bundle the styles
//         this.bundle();
//     }
//     private async bundle() {
//         try {
//             let bundleResult = await Bundler.Bundle(this.Config.Entry);
//             if (!bundleResult.found) {
//                 if (this.Config.Verbosity !== Contracts.Verbosity.None) {
//                     let resolvedPath = path.resolve(bundleResult.filePath);
//                     let errorMessage = `[Error] An error has occured${os.EOL}`;
//                     errorMessage += `Entry file was not found:${os.EOL}${bundleResult.filePath}${os.EOL}`;
//                     errorMessage += `Looked at (full path):${os.EOL}${resolvedPath}`;
//                     this.exitWithError(errorMessage);
//                 }
//             }
//             let archyData = this.getArchyData(bundleResult, path.dirname(this.Config.Entry));
//             if (this.Config.Verbosity === Contracts.Verbosity.Verbose) {
//                 console.info(archy(archyData));
//             }
//             if (bundleResult.content == null) {
//                 if (this.Config.Verbosity !== Contracts.Verbosity.None) {
//                     this.exitWithError(`[Error] An error has occured${os.EOL}Concatenation result has no content.`);
//                 }
//                 return;
//             }
//             try {
//                 await this.renderScss(bundleResult.content);
//             } catch (scssError) {
//                 this.exitWithError(`[Error] There is an error in your styles:${os.EOL}${scssError}`);
//             }
//             // Ensure the directory exists
//             mkdirp.sync(path.dirname(this.Config.Destination));
//             await fs.writeFile(this.Config.Destination, bundleResult.content);
//             let fullPath = path.resolve(this.Config.Destination);
//             if (this.Config.Verbosity === Contracts.Verbosity.Verbose) {
//                 console.info(`[Done] Bundled into:${os.EOL}${fullPath}`);
//             }
//         } catch (error) {
//             if (this.Config.Verbosity !== Contracts.Verbosity.None) {
//                 this.exitWithError(`[Error] An error has occured${os.EOL}${error}`);
//             }
//         }
//     }
//     private async renderScss(content: string) {
//         return new Promise((resolve, reject) => {
//             sass.render({
//                 data: content
//             }, (error, result) => {
//                 if (error == null) {
//                     resolve();
//                 } else {
//                     reject(`${error.message} on line (${error.line}, ${error.column})`);
//                 }
//             });
//         });
//     }
//     private getArchyData(bundleResult: BundleResult, sourceDirectory?: string) {
//         if (sourceDirectory == null) {
//             sourceDirectory = process.cwd();
//         }
//         let archyData: archy.Data = {
//             label: path.relative(sourceDirectory, bundleResult.filePath)
//         };
//         if (!bundleResult.found) {
//             archyData.label += ` [NOT FOUND]`;
//         }
//         if (bundleResult.imports != null) {
//             archyData.nodes = bundleResult.imports.map(x => {
//                 if (x != null) {
//                     return this.getArchyData(x, sourceDirectory);
//                 }
//                 return "";
//             });
//         }
//         return archyData;
//     }
//     private resolveVerbosity(verbosity: any) {
//         // Convert given value to an appropriate Verbosity enum value.
//         // 'as any as number' is used because TypeScript thinks
//         //  that we cast string to number, even though we get a number there
//         return Contracts.Verbosity[verbosity] as any as number;
//     }
//     private async configExists(fullPath: string) {
//         try {
//             await fs.access(fullPath, fs.constants.F_OK);
//             return true;
//         } catch (err) {
//             return false;
//         }
//     }
//     private async readConfigFile(fullPath: string): Promise<any> {
//         let data = await fs.readFile(fullPath, "utf8");
//         return JSON.parse(data);
//     }
//     private exitWithError(message: string) {
//         if (this.Config.Verbosity !== Contracts.Verbosity.None) {
//             console.error(message);
//         }
//         process.exit(1);
//     }
// }
// new Cli(argv);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBR0EsMkNBQW1DO0FBQ25DLHlDQUFzQztBQUV0QztJQUNJLFlBQVksSUFBK0I7UUFDdkMsSUFBSSxtQkFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRU8sU0FBUyxDQUFDLElBQStCO1FBQzdDLE1BQU0sQ0FBQztZQUNILFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSTtZQUN0QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLElBQUksRUFBRTtZQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDNUIsQ0FBQztJQUNOLENBQUM7Q0FDSjtBQUVELElBQUksU0FBUyxDQUFDLGdCQUFJLENBQUMsQ0FBQztBQUVwQiwrQkFBK0I7QUFDL0IsZ0NBQWdDO0FBQ2hDLDRCQUE0QjtBQUM1QixrQ0FBa0M7QUFFbEMscUNBQXFDO0FBQ3JDLG9DQUFvQztBQUVwQyw0Q0FBNEM7QUFDNUMscURBQXFEO0FBQ3JELHNDQUFzQztBQUV0Qyx5REFBeUQ7QUFFekQsY0FBYztBQUNkLGdDQUFnQztBQUVoQyx5RUFBeUU7QUFDekUsMENBQTBDO0FBQzFDLFFBQVE7QUFFUixzRUFBc0U7QUFDdEUsd0NBQXdDO0FBRXhDLHNDQUFzQztBQUN0QywyRkFBMkY7QUFFM0YsNEVBQTRFO0FBRTVFLDRCQUE0QjtBQUM1Qix5REFBeUQ7QUFDekQsb0JBQW9CO0FBQ3BCLDhFQUE4RTtBQUM5RSx1R0FBdUc7QUFDdkcsNkJBQTZCO0FBQzdCLHVFQUF1RTtBQUN2RSwyRUFBMkU7QUFDM0UsNENBQTRDO0FBQzVDLG1EQUFtRDtBQUNuRCxxQkFBcUI7QUFFckIsbUVBQW1FO0FBQ25FLDBFQUEwRTtBQUMxRSxvQkFBb0I7QUFDcEIsOEJBQThCO0FBQzlCLDZGQUE2RjtBQUM3RiwwQkFBMEI7QUFDMUIsZ0JBQWdCO0FBQ2hCLG9GQUFvRjtBQUNwRiwyRUFBMkU7QUFDM0UseUJBQXlCO0FBQ3pCLCtDQUErQztBQUMvQyxvREFBb0Q7QUFDcEQsd0NBQXdDO0FBQ3hDLGlDQUFpQztBQUNqQyxpQkFBaUI7QUFDakIsbUJBQW1CO0FBQ25CLGtIQUFrSDtBQUNsSCxzQkFBc0I7QUFDdEIsWUFBWTtBQUVaLGtFQUFrRTtBQUNsRSw2Q0FBNkM7QUFDN0MsNkRBQTZEO0FBQzdELFlBQVk7QUFFWixnQ0FBZ0M7QUFFaEMsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixRQUFRO0FBRVIsK0JBQStCO0FBQy9CLGdCQUFnQjtBQUNoQiwwRUFBMEU7QUFFMUUseUNBQXlDO0FBQ3pDLDRFQUE0RTtBQUM1RSw4RUFBOEU7QUFDOUUsa0ZBQWtGO0FBQ2xGLDZHQUE2RztBQUM3Ryx3RkFBd0Y7QUFDeEYsd0RBQXdEO0FBQ3hELG9CQUFvQjtBQUNwQixnQkFBZ0I7QUFFaEIsZ0dBQWdHO0FBQ2hHLDJFQUEyRTtBQUMzRSxrREFBa0Q7QUFDbEQsZ0JBQWdCO0FBRWhCLGtEQUFrRDtBQUNsRCw0RUFBNEU7QUFDNUUsdUhBQXVIO0FBQ3ZILG9CQUFvQjtBQUNwQiwwQkFBMEI7QUFDMUIsZ0JBQWdCO0FBQ2hCLG9CQUFvQjtBQUNwQiwrREFBK0Q7QUFDL0Qsb0NBQW9DO0FBQ3BDLHdHQUF3RztBQUN4RyxnQkFBZ0I7QUFFaEIsNkNBQTZDO0FBQzdDLGtFQUFrRTtBQUVsRSxpRkFBaUY7QUFFakYsb0VBQW9FO0FBQ3BFLDJFQUEyRTtBQUMzRSw0RUFBNEU7QUFDNUUsZ0JBQWdCO0FBQ2hCLDRCQUE0QjtBQUM1Qix3RUFBd0U7QUFDeEUsdUZBQXVGO0FBQ3ZGLGdCQUFnQjtBQUNoQixZQUFZO0FBQ1osUUFBUTtBQUVSLGtEQUFrRDtBQUNsRCxvREFBb0Q7QUFDcEQsNEJBQTRCO0FBQzVCLGdDQUFnQztBQUNoQyxzQ0FBc0M7QUFDdEMsdUNBQXVDO0FBQ3ZDLGlDQUFpQztBQUNqQywyQkFBMkI7QUFDM0IsMkZBQTJGO0FBQzNGLG9CQUFvQjtBQUNwQixrQkFBa0I7QUFDbEIsY0FBYztBQUNkLFFBQVE7QUFFUixtRkFBbUY7QUFDbkYseUNBQXlDO0FBQ3pDLCtDQUErQztBQUMvQyxZQUFZO0FBQ1osd0NBQXdDO0FBQ3hDLDJFQUEyRTtBQUMzRSxhQUFhO0FBRWIscUNBQXFDO0FBQ3JDLGlEQUFpRDtBQUNqRCxZQUFZO0FBRVosOENBQThDO0FBQzlDLGdFQUFnRTtBQUNoRSxtQ0FBbUM7QUFDbkMsb0VBQW9FO0FBQ3BFLG9CQUFvQjtBQUNwQiw2QkFBNkI7QUFDN0Isa0JBQWtCO0FBQ2xCLFlBQVk7QUFDWiw0QkFBNEI7QUFDNUIsUUFBUTtBQUVSLGlEQUFpRDtBQUNqRCx5RUFBeUU7QUFDekUsa0VBQWtFO0FBQ2xFLCtFQUErRTtBQUMvRSxrRUFBa0U7QUFDbEUsUUFBUTtBQUVSLHFEQUFxRDtBQUNyRCxnQkFBZ0I7QUFDaEIsNERBQTREO0FBQzVELDJCQUEyQjtBQUMzQiwwQkFBMEI7QUFDMUIsNEJBQTRCO0FBQzVCLFlBQVk7QUFDWixRQUFRO0FBRVIscUVBQXFFO0FBQ3JFLDBEQUEwRDtBQUMxRCxtQ0FBbUM7QUFDbkMsUUFBUTtBQUVSLCtDQUErQztBQUMvQyxvRUFBb0U7QUFDcEUsc0NBQXNDO0FBQ3RDLFlBQVk7QUFDWiwyQkFBMkI7QUFDM0IsUUFBUTtBQUNSLElBQUk7QUFFSixpQkFBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IGFyZ3YgfSBmcm9tIFwiLi9hcmd1bWVudHNcIjtcclxuaW1wb3J0IHsgTGF1bmNoZXIgfSBmcm9tIFwiLi9sYXVuY2hlclwiO1xyXG5cclxuY2xhc3MgQnVuZGxlQ2xpIHtcclxuICAgIGNvbnN0cnVjdG9yKGFyZ3Y6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpIHtcclxuICAgICAgICBuZXcgTGF1bmNoZXIodGhpcy5nZXRDb25maWcoYXJndikpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0Q29uZmlnKGFyZ3Y6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpOiBDb250cmFjdHMuQ29uZmlnIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBEZXN0aW5hdGlvbjogYXJndi5kZXN0LFxyXG4gICAgICAgICAgICBFbnRyeTogYXJndi5lbnRyeSxcclxuICAgICAgICAgICAgRGVkdXBlUGF0aHM6IGFyZ3YuZGVkdXBlUGF0aHMgfHwgW10sXHJcbiAgICAgICAgICAgIFZlcmJvc2l0eTogYXJndi52ZXJib3NpdHlcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5uZXcgQnVuZGxlQ2xpKGFyZ3YpO1xyXG5cclxuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSBcIm16L2ZzXCI7XHJcbi8vIGltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuLy8gaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbi8vIGltcG9ydCAqIGFzIGFyY2h5IGZyb20gXCJhcmNoeVwiO1xyXG5cclxuLy8gaW1wb3J0ICogYXMgc2FzcyBmcm9tIFwibm9kZS1zYXNzXCI7XHJcbi8vIGltcG9ydCAqIGFzIG1rZGlycCBmcm9tIFwibWtkaXJwXCI7XHJcblxyXG4vLyBpbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbi8vIGltcG9ydCB7IEJ1bmRsZXIsIEJ1bmRsZVJlc3VsdCB9IGZyb20gXCIuL2J1bmRsZXJcIjtcclxuLy8gaW1wb3J0IHsgYXJndiB9IGZyb20gXCIuL2FyZ3VtZW50c1wiO1xyXG5cclxuLy8gY29uc3QgREVGQVVMVF9DT05GSUdfTkFNRSA9IFwic2Nzcy1idW5kbGUuY29uZmlnLmpzb25cIjtcclxuXHJcbi8vIGNsYXNzIENsaSB7XHJcbi8vICAgICBDb25maWc6IENvbnRyYWN0cy5Db25maWc7XHJcblxyXG4vLyAgICAgY29uc3RydWN0b3IocHJvdGVjdGVkIEFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKSB7XHJcbi8vICAgICAgICAgdGhpcy5tYWluKHRoaXMuQXJndW1lbnRWYWx1ZXMpO1xyXG4vLyAgICAgfVxyXG5cclxuLy8gICAgIHByaXZhdGUgYXN5bmMgbWFpbihhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcykge1xyXG4vLyAgICAgICAgIGxldCBjb25maWc6IENvbnRyYWN0cy5Db25maWc7XHJcblxyXG4vLyAgICAgICAgIC8vIFJlc29sdmUgY29uZmlnIGZpbGUgcGF0aFxyXG4vLyAgICAgICAgIGxldCBmdWxsQ29uZmlnUGF0aCA9IHBhdGgucmVzb2x2ZShhcmd1bWVudFZhbHVlcy5jb25maWcgfHwgREVGQVVMVF9DT05GSUdfTkFNRSk7XHJcblxyXG4vLyAgICAgICAgIGxldCB2ZXJib3NpdHk6IENvbnRyYWN0cy5WZXJib3NpdHkgPSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2U7XHJcblxyXG4vLyAgICAgICAgIC8vIFJlc29sdmUgY29uZmlnXHJcbi8vICAgICAgICAgaWYgKGF3YWl0IHRoaXMuY29uZmlnRXhpc3RzKGZ1bGxDb25maWdQYXRoKSkge1xyXG4vLyAgICAgICAgICAgICB0cnkge1xyXG4vLyAgICAgICAgICAgICAgICAgbGV0IHJlYWRDb25maWcgPSBhd2FpdCB0aGlzLnJlYWRDb25maWdGaWxlKGZ1bGxDb25maWdQYXRoKTtcclxuLy8gICAgICAgICAgICAgICAgIHZlcmJvc2l0eSA9IHRoaXMucmVzb2x2ZVZlcmJvc2l0eShhcmd1bWVudFZhbHVlcy52ZXJib3NpdHkgfHwgcmVhZENvbmZpZy52ZXJib3NpdHkpO1xyXG4vLyAgICAgICAgICAgICAgICAgY29uZmlnID0ge1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIEVudHJ5OiBhcmd1bWVudFZhbHVlcy5lbnRyeSB8fCByZWFkQ29uZmlnLmVudHJ5LFxyXG4vLyAgICAgICAgICAgICAgICAgICAgIERlc3RpbmF0aW9uOiBhcmd1bWVudFZhbHVlcy5kZXN0IHx8IHJlYWRDb25maWcuZGVzdCxcclxuLy8gICAgICAgICAgICAgICAgICAgICBWZXJib3NpdHk6IHZlcmJvc2l0eSxcclxuLy8gICAgICAgICAgICAgICAgICAgICBJbXBvcnRPbmNlOiByZWFkQ29uZmlnIHx8IFtdXHJcbi8vICAgICAgICAgICAgICAgICB9O1xyXG5cclxuLy8gICAgICAgICAgICAgICAgIGlmICh2ZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIlVzaW5nIGNvbmZpZyBmaWxlOlwiLCBmdWxsQ29uZmlnUGF0aCk7XHJcbi8vICAgICAgICAgICAgICAgICB9XHJcbi8vICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4vLyAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIENvbmZpZyBmaWxlICR7ZnVsbENvbmZpZ1BhdGh9IGlzIG5vdCB2YWxpZC5gKTtcclxuLy8gICAgICAgICAgICAgICAgIHJldHVybjtcclxuLy8gICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnRWYWx1ZXMuZW50cnkgIT0gbnVsbCAmJiBhcmd1bWVudFZhbHVlcy5kZXN0ICE9IG51bGwpIHtcclxuLy8gICAgICAgICAgICAgdmVyYm9zaXR5ID0gdGhpcy5yZXNvbHZlVmVyYm9zaXR5KGFyZ3VtZW50VmFsdWVzLnZlcmJvc2l0eSk7XHJcbi8vICAgICAgICAgICAgIGNvbmZpZyA9IHtcclxuLy8gICAgICAgICAgICAgICAgIEVudHJ5OiBhcmd1bWVudFZhbHVlcy5lbnRyeSxcclxuLy8gICAgICAgICAgICAgICAgIERlc3RpbmF0aW9uOiBhcmd1bWVudFZhbHVlcy5kZXN0LFxyXG4vLyAgICAgICAgICAgICAgICAgVmVyYm9zaXR5OiB2ZXJib3NpdHksXHJcbi8vICAgICAgICAgICAgICAgICBJbXBvcnRPbmNlOiBbXVxyXG4vLyAgICAgICAgICAgICB9O1xyXG4vLyAgICAgICAgIH0gZWxzZSB7XHJcbi8vICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihcIltFcnJvcl0gRW50cnkgYW5kIGRlc3RpbmF0aW9uIGFyZ3VtZW50cyBhcmUgbWlzc2luZyBhbmQgbm8gY29uZmlnIHdhcyBmb3VuZC5cIik7XHJcbi8vICAgICAgICAgICAgIHJldHVybjtcclxuLy8gICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgIGlmIChjb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiVXNpbmcgY29uZmlnOlwiKTtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5pbmZvKEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgNCkpO1xyXG4vLyAgICAgICAgIH1cclxuXHJcbi8vICAgICAgICAgdGhpcy5Db25maWcgPSBjb25maWc7XHJcblxyXG4vLyAgICAgICAgIC8vIEJ1bmRsZSB0aGUgc3R5bGVzXHJcbi8vICAgICAgICAgdGhpcy5idW5kbGUoKTtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBwcml2YXRlIGFzeW5jIGJ1bmRsZSgpIHtcclxuLy8gICAgICAgICB0cnkge1xyXG4vLyAgICAgICAgICAgICBsZXQgYnVuZGxlUmVzdWx0ID0gYXdhaXQgQnVuZGxlci5CdW5kbGUodGhpcy5Db25maWcuRW50cnkpO1xyXG5cclxuLy8gICAgICAgICAgICAgaWYgKCFidW5kbGVSZXN1bHQuZm91bmQpIHtcclxuLy8gICAgICAgICAgICAgICAgIGlmICh0aGlzLkNvbmZpZy5WZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGxldCByZXNvbHZlZFBhdGggPSBwYXRoLnJlc29sdmUoYnVuZGxlUmVzdWx0LmZpbGVQYXRoKTtcclxuLy8gICAgICAgICAgICAgICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gYFtFcnJvcl0gQW4gZXJyb3IgaGFzIG9jY3VyZWQke29zLkVPTH1gO1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgRW50cnkgZmlsZSB3YXMgbm90IGZvdW5kOiR7b3MuRU9MfSR7YnVuZGxlUmVzdWx0LmZpbGVQYXRofSR7b3MuRU9MfWA7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlICs9IGBMb29rZWQgYXQgKGZ1bGwgcGF0aCk6JHtvcy5FT0x9JHtyZXNvbHZlZFBhdGh9YDtcclxuLy8gICAgICAgICAgICAgICAgICAgICB0aGlzLmV4aXRXaXRoRXJyb3IoZXJyb3JNZXNzYWdlKTtcclxuLy8gICAgICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgbGV0IGFyY2h5RGF0YSA9IHRoaXMuZ2V0QXJjaHlEYXRhKGJ1bmRsZVJlc3VsdCwgcGF0aC5kaXJuYW1lKHRoaXMuQ29uZmlnLkVudHJ5KSk7XHJcbi8vICAgICAgICAgICAgIGlmICh0aGlzLkNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4vLyAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGFyY2h5KGFyY2h5RGF0YSkpO1xyXG4vLyAgICAgICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgICAgICBpZiAoYnVuZGxlUmVzdWx0LmNvbnRlbnQgPT0gbnVsbCkge1xyXG4vLyAgICAgICAgICAgICAgICAgaWYgKHRoaXMuQ29uZmlnLlZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIEFuIGVycm9yIGhhcyBvY2N1cmVkJHtvcy5FT0x9Q29uY2F0ZW5hdGlvbiByZXN1bHQgaGFzIG5vIGNvbnRlbnQuYCk7XHJcbi8vICAgICAgICAgICAgICAgICB9XHJcbi8vICAgICAgICAgICAgICAgICByZXR1cm47XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICAgICAgdHJ5IHtcclxuLy8gICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyU2NzcyhidW5kbGVSZXN1bHQuY29udGVudCk7XHJcbi8vICAgICAgICAgICAgIH0gY2F0Y2ggKHNjc3NFcnJvcikge1xyXG4vLyAgICAgICAgICAgICAgICAgdGhpcy5leGl0V2l0aEVycm9yKGBbRXJyb3JdIFRoZXJlIGlzIGFuIGVycm9yIGluIHlvdXIgc3R5bGVzOiR7b3MuRU9MfSR7c2Nzc0Vycm9yfWApO1xyXG4vLyAgICAgICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGRpcmVjdG9yeSBleGlzdHNcclxuLy8gICAgICAgICAgICAgbWtkaXJwLnN5bmMocGF0aC5kaXJuYW1lKHRoaXMuQ29uZmlnLkRlc3RpbmF0aW9uKSk7XHJcblxyXG4vLyAgICAgICAgICAgICBhd2FpdCBmcy53cml0ZUZpbGUodGhpcy5Db25maWcuRGVzdGluYXRpb24sIGJ1bmRsZVJlc3VsdC5jb250ZW50KTtcclxuXHJcbi8vICAgICAgICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZSh0aGlzLkNvbmZpZy5EZXN0aW5hdGlvbik7XHJcbi8vICAgICAgICAgICAgIGlmICh0aGlzLkNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4vLyAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKGBbRG9uZV0gQnVuZGxlZCBpbnRvOiR7b3MuRU9MfSR7ZnVsbFBhdGh9YCk7XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4vLyAgICAgICAgICAgICBpZiAodGhpcy5Db25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuLy8gICAgICAgICAgICAgICAgIHRoaXMuZXhpdFdpdGhFcnJvcihgW0Vycm9yXSBBbiBlcnJvciBoYXMgb2NjdXJlZCR7b3MuRU9MfSR7ZXJyb3J9YCk7XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICB9XHJcbi8vICAgICB9XHJcblxyXG4vLyAgICAgcHJpdmF0ZSBhc3luYyByZW5kZXJTY3NzKGNvbnRlbnQ6IHN0cmluZykge1xyXG4vLyAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbi8vICAgICAgICAgICAgIHNhc3MucmVuZGVyKHtcclxuLy8gICAgICAgICAgICAgICAgIGRhdGE6IGNvbnRlbnRcclxuLy8gICAgICAgICAgICAgfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuLy8gICAgICAgICAgICAgICAgIGlmIChlcnJvciA9PSBudWxsKSB7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4vLyAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgICAgICAgICAgICAgICByZWplY3QoYCR7ZXJyb3IubWVzc2FnZX0gb24gbGluZSAoJHtlcnJvci5saW5lfSwgJHtlcnJvci5jb2x1bW59KWApO1xyXG4vLyAgICAgICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgICAgICB9KTtcclxuLy8gICAgICAgICB9KTtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBwcml2YXRlIGdldEFyY2h5RGF0YShidW5kbGVSZXN1bHQ6IEJ1bmRsZVJlc3VsdCwgc291cmNlRGlyZWN0b3J5Pzogc3RyaW5nKSB7XHJcbi8vICAgICAgICAgaWYgKHNvdXJjZURpcmVjdG9yeSA9PSBudWxsKSB7XHJcbi8vICAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeSA9IHByb2Nlc3MuY3dkKCk7XHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgICAgIGxldCBhcmNoeURhdGE6IGFyY2h5LkRhdGEgPSB7XHJcbi8vICAgICAgICAgICAgIGxhYmVsOiBwYXRoLnJlbGF0aXZlKHNvdXJjZURpcmVjdG9yeSwgYnVuZGxlUmVzdWx0LmZpbGVQYXRoKVxyXG4vLyAgICAgICAgIH07XHJcblxyXG4vLyAgICAgICAgIGlmICghYnVuZGxlUmVzdWx0LmZvdW5kKSB7XHJcbi8vICAgICAgICAgICAgIGFyY2h5RGF0YS5sYWJlbCArPSBgIFtOT1QgRk9VTkRdYDtcclxuLy8gICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgIGlmIChidW5kbGVSZXN1bHQuaW1wb3J0cyAhPSBudWxsKSB7XHJcbi8vICAgICAgICAgICAgIGFyY2h5RGF0YS5ub2RlcyA9IGJ1bmRsZVJlc3VsdC5pbXBvcnRzLm1hcCh4ID0+IHtcclxuLy8gICAgICAgICAgICAgICAgIGlmICh4ICE9IG51bGwpIHtcclxuLy8gICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBcmNoeURhdGEoeCwgc291cmNlRGlyZWN0b3J5KTtcclxuLy8gICAgICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4vLyAgICAgICAgICAgICB9KTtcclxuLy8gICAgICAgICB9XHJcbi8vICAgICAgICAgcmV0dXJuIGFyY2h5RGF0YTtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBwcml2YXRlIHJlc29sdmVWZXJib3NpdHkodmVyYm9zaXR5OiBhbnkpIHtcclxuLy8gICAgICAgICAvLyBDb252ZXJ0IGdpdmVuIHZhbHVlIHRvIGFuIGFwcHJvcHJpYXRlIFZlcmJvc2l0eSBlbnVtIHZhbHVlLlxyXG4vLyAgICAgICAgIC8vICdhcyBhbnkgYXMgbnVtYmVyJyBpcyB1c2VkIGJlY2F1c2UgVHlwZVNjcmlwdCB0aGlua3NcclxuLy8gICAgICAgICAvLyAgdGhhdCB3ZSBjYXN0IHN0cmluZyB0byBudW1iZXIsIGV2ZW4gdGhvdWdoIHdlIGdldCBhIG51bWJlciB0aGVyZVxyXG4vLyAgICAgICAgIHJldHVybiBDb250cmFjdHMuVmVyYm9zaXR5W3ZlcmJvc2l0eV0gYXMgYW55IGFzIG51bWJlcjtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBwcml2YXRlIGFzeW5jIGNvbmZpZ0V4aXN0cyhmdWxsUGF0aDogc3RyaW5nKSB7XHJcbi8vICAgICAgICAgdHJ5IHtcclxuLy8gICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZ1bGxQYXRoLCBmcy5jb25zdGFudHMuRl9PSyk7XHJcbi8vICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4vLyAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4vLyAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgfVxyXG5cclxuLy8gICAgIHByaXZhdGUgYXN5bmMgcmVhZENvbmZpZ0ZpbGUoZnVsbFBhdGg6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XHJcbi8vICAgICAgICAgbGV0IGRhdGEgPSBhd2FpdCBmcy5yZWFkRmlsZShmdWxsUGF0aCwgXCJ1dGY4XCIpO1xyXG4vLyAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xyXG4vLyAgICAgfVxyXG5cclxuLy8gICAgIHByaXZhdGUgZXhpdFdpdGhFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuLy8gICAgICAgICBpZiAodGhpcy5Db25maWcuVmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUpIHtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlKTtcclxuLy8gICAgICAgICB9XHJcbi8vICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vLyBuZXcgQ2xpKGFyZ3YpO1xyXG4iXX0=