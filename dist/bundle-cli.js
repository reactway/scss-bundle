#!/usr/bin/env node
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
const path = require("path");
const chokidar = require("chokidar");
const Contracts = require("./contracts");
const arguments_1 = require("./arguments");
const launcher_1 = require("./launcher");
function resolveVerbosity(verbosity) {
    // Convert given value to an appropriate Verbosity enum value.
    // 'as any as number' is used because TypeScript thinks
    //  that we cast string to number, even though we get a number there
    return Contracts.Verbosity[verbosity];
}
function argumentsToConfig(argumentValues) {
    return {
        Destination: argumentValues.dest,
        Entry: argumentValues.entry,
        DedupeGlobs: argumentValues.dedupe,
        Verbosity: resolveVerbosity(argumentValues.verbosity),
        IncludePaths: argumentValues.includePaths,
        IgnoredImports: argumentValues.ignoredImports,
        ProjectDirectory: path.resolve(process.cwd(), argumentValues.project)
    };
}
function main(argumentValues) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = argumentsToConfig(argumentValues);
        const isWatching = argumentValues.watch != null;
        const bundler = new launcher_1.Launcher(config);
        if (argumentValues.verbosity !== Contracts.Verbosity.None && (argumentValues.entry == null || argumentValues.dest == null)) {
            console.error("[Error] 'entry' and 'dest' are required.");
            process.exit(1);
        }
        if (argumentValues.verbosity !== Contracts.Verbosity.None && isWatching && argumentValues.watch === "") {
            console.error("[Error] 'watch' must be defined.");
        }
        if (isWatching) {
            chokidar.watch(argumentValues.watch).on("change", () => __awaiter(this, void 0, void 0, function* () {
                if (config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.log("[Watcher] File change detected.");
                }
                yield bundler.Bundle();
                if (config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.log("[Watcher] Waiting for changes...");
                }
            }));
        }
        yield bundler.Bundle();
        if (isWatching && config.Verbosity === Contracts.Verbosity.Verbose) {
            console.log("[Watcher] Waiting for changes...");
        }
    });
}
main(arguments_1.argv);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEsNkJBQTZCO0FBQzdCLHFDQUFxQztBQUVyQyx5Q0FBeUM7QUFDekMsMkNBQW1DO0FBQ25DLHlDQUFzQztBQUV0QywwQkFBMEIsU0FBYztJQUNwQyw4REFBOEQ7SUFDOUQsdURBQXVEO0lBQ3ZELG9FQUFvRTtJQUNwRSxPQUFRLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFtQixDQUFDO0FBQzdELENBQUM7QUFFRCwyQkFBMkIsY0FBeUM7SUFDaEUsT0FBTztRQUNILFdBQVcsRUFBRSxjQUFjLENBQUMsSUFBSTtRQUNoQyxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7UUFDM0IsV0FBVyxFQUFFLGNBQWMsQ0FBQyxNQUFNO1FBQ2xDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBQ3JELFlBQVksRUFBRSxjQUFjLENBQUMsWUFBWTtRQUN6QyxjQUFjLEVBQUUsY0FBYyxDQUFDLGNBQWM7UUFDN0MsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQztLQUN4RSxDQUFDO0FBQ04sQ0FBQztBQUVELGNBQW9CLGNBQXlDOztRQUN6RCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNqRCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFckMsSUFBSSxjQUFjLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksY0FBYyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtZQUN4SCxPQUFPLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7WUFDMUQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQjtRQUVELElBQUksY0FBYyxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxVQUFVLElBQUksY0FBYyxDQUFDLEtBQUssS0FBSyxFQUFFLEVBQUU7WUFDcEcsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1NBQ3JEO1FBRUQsSUFBSSxVQUFVLEVBQUU7WUFDWixRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQVMsRUFBRTtnQkFDekQsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFO29CQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7aUJBQ2xEO2dCQUNELE1BQU0sT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN2QixJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7b0JBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQztpQkFDbkQ7WUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO1NBQ047UUFFRCxNQUFNLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN2QixJQUFJLFVBQVUsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFO1lBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQztTQUNuRDtJQUNMLENBQUM7Q0FBQTtBQUVELElBQUksQ0FBQyxnQkFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGNob2tpZGFyIGZyb20gXCJjaG9raWRhclwiO1xyXG5cclxuaW1wb3J0ICogYXMgQ29udHJhY3RzIGZyb20gXCIuL2NvbnRyYWN0c1wiO1xyXG5pbXBvcnQgeyBhcmd2IH0gZnJvbSBcIi4vYXJndW1lbnRzXCI7XHJcbmltcG9ydCB7IExhdW5jaGVyIH0gZnJvbSBcIi4vbGF1bmNoZXJcIjtcclxuXHJcbmZ1bmN0aW9uIHJlc29sdmVWZXJib3NpdHkodmVyYm9zaXR5OiBhbnkpOiBudW1iZXIge1xyXG4gICAgLy8gQ29udmVydCBnaXZlbiB2YWx1ZSB0byBhbiBhcHByb3ByaWF0ZSBWZXJib3NpdHkgZW51bSB2YWx1ZS5cclxuICAgIC8vICdhcyBhbnkgYXMgbnVtYmVyJyBpcyB1c2VkIGJlY2F1c2UgVHlwZVNjcmlwdCB0aGlua3NcclxuICAgIC8vICB0aGF0IHdlIGNhc3Qgc3RyaW5nIHRvIG51bWJlciwgZXZlbiB0aG91Z2ggd2UgZ2V0IGEgbnVtYmVyIHRoZXJlXHJcbiAgICByZXR1cm4gKENvbnRyYWN0cy5WZXJib3NpdHlbdmVyYm9zaXR5XSBhcyBhbnkpIGFzIG51bWJlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gYXJndW1lbnRzVG9Db25maWcoYXJndW1lbnRWYWx1ZXM6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpOiBDb250cmFjdHMuQ29uZmlnIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgRGVzdGluYXRpb246IGFyZ3VtZW50VmFsdWVzLmRlc3QsXHJcbiAgICAgICAgRW50cnk6IGFyZ3VtZW50VmFsdWVzLmVudHJ5LFxyXG4gICAgICAgIERlZHVwZUdsb2JzOiBhcmd1bWVudFZhbHVlcy5kZWR1cGUsXHJcbiAgICAgICAgVmVyYm9zaXR5OiByZXNvbHZlVmVyYm9zaXR5KGFyZ3VtZW50VmFsdWVzLnZlcmJvc2l0eSksXHJcbiAgICAgICAgSW5jbHVkZVBhdGhzOiBhcmd1bWVudFZhbHVlcy5pbmNsdWRlUGF0aHMsXHJcbiAgICAgICAgSWdub3JlZEltcG9ydHM6IGFyZ3VtZW50VmFsdWVzLmlnbm9yZWRJbXBvcnRzLFxyXG4gICAgICAgIFByb2plY3REaXJlY3Rvcnk6IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBhcmd1bWVudFZhbHVlcy5wcm9qZWN0KVxyXG4gICAgfTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbWFpbihhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgY29uZmlnID0gYXJndW1lbnRzVG9Db25maWcoYXJndW1lbnRWYWx1ZXMpO1xyXG4gICAgY29uc3QgaXNXYXRjaGluZyA9IGFyZ3VtZW50VmFsdWVzLndhdGNoICE9IG51bGw7XHJcbiAgICBjb25zdCBidW5kbGVyID0gbmV3IExhdW5jaGVyKGNvbmZpZyk7XHJcblxyXG4gICAgaWYgKGFyZ3VtZW50VmFsdWVzLnZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lICYmIChhcmd1bWVudFZhbHVlcy5lbnRyeSA9PSBudWxsIHx8IGFyZ3VtZW50VmFsdWVzLmRlc3QgPT0gbnVsbCkpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFwiW0Vycm9yXSAnZW50cnknIGFuZCAnZGVzdCcgYXJlIHJlcXVpcmVkLlwiKTtcclxuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGFyZ3VtZW50VmFsdWVzLnZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lICYmIGlzV2F0Y2hpbmcgJiYgYXJndW1lbnRWYWx1ZXMud2F0Y2ggPT09IFwiXCIpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFwiW0Vycm9yXSAnd2F0Y2gnIG11c3QgYmUgZGVmaW5lZC5cIik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlzV2F0Y2hpbmcpIHtcclxuICAgICAgICBjaG9raWRhci53YXRjaChhcmd1bWVudFZhbHVlcy53YXRjaCkub24oXCJjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY29uZmlnLlZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltXYXRjaGVyXSBGaWxlIGNoYW5nZSBkZXRlY3RlZC5cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgYnVuZGxlci5CdW5kbGUoKTtcclxuICAgICAgICAgICAgaWYgKGNvbmZpZy5WZXJib3NpdHkgPT09IENvbnRyYWN0cy5WZXJib3NpdHkuVmVyYm9zZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbV2F0Y2hlcl0gV2FpdGluZyBmb3IgY2hhbmdlcy4uLlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IGJ1bmRsZXIuQnVuZGxlKCk7XHJcbiAgICBpZiAoaXNXYXRjaGluZyAmJiBjb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIltXYXRjaGVyXSBXYWl0aW5nIGZvciBjaGFuZ2VzLi4uXCIpO1xyXG4gICAgfVxyXG59XHJcblxyXG5tYWluKGFyZ3YpO1xyXG4iXX0=