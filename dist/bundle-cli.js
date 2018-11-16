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
const debounce = require("lodash.debounce");
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
            process.exit(1);
        }
        if (isWatching) {
            const onFilesChange = debounce(() => __awaiter(this, void 0, void 0, function* () {
                if (config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info("[Watcher] File change detected.");
                }
                yield bundler.Bundle();
                if (config.Verbosity === Contracts.Verbosity.Verbose) {
                    console.info("[Watcher] Waiting for changes...");
                }
            }), 500);
            chokidar.watch(argumentValues.watch).on("change", onFilesChange);
        }
        yield bundler.Bundle();
        if (isWatching && config.Verbosity === Contracts.Verbosity.Verbose) {
            console.info("[Watcher] Waiting for changes...");
        }
    });
}
main(arguments_1.argv);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEsNkJBQTZCO0FBQzdCLHFDQUFxQztBQUNyQyw0Q0FBNkM7QUFFN0MseUNBQXlDO0FBQ3pDLDJDQUFtQztBQUNuQyx5Q0FBc0M7QUFFdEMsMEJBQTBCLFNBQWM7SUFDcEMsOERBQThEO0lBQzlELHVEQUF1RDtJQUN2RCxvRUFBb0U7SUFDcEUsT0FBUSxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBbUIsQ0FBQztBQUM3RCxDQUFDO0FBRUQsMkJBQTJCLGNBQXlDO0lBQ2hFLE9BQU87UUFDSCxXQUFXLEVBQUUsY0FBYyxDQUFDLElBQUk7UUFDaEMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO1FBQzNCLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTTtRQUNsQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQztRQUNyRCxZQUFZLEVBQUUsY0FBYyxDQUFDLFlBQVk7UUFDekMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxjQUFjO1FBQzdDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUM7S0FDeEUsQ0FBQztBQUNOLENBQUM7QUFFRCxjQUFvQixjQUF5Qzs7UUFDekQsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDakQsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUM7UUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXJDLElBQUksY0FBYyxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLGNBQWMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUU7WUFDeEgsT0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1lBQzFELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkI7UUFFRCxJQUFJLGNBQWMsQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksVUFBVSxJQUFJLGNBQWMsQ0FBQyxLQUFLLEtBQUssRUFBRSxFQUFFO1lBQ3BHLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25CO1FBRUQsSUFBSSxVQUFVLEVBQUU7WUFDWixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBUyxFQUFFO2dCQUN0QyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7b0JBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQztpQkFDbkQ7Z0JBQ0QsTUFBTSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksTUFBTSxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRTtvQkFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO2lCQUNwRDtZQUNMLENBQUMsQ0FBQSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRVIsUUFBUSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztTQUNwRTtRQUVELE1BQU0sT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLElBQUksVUFBVSxJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7WUFDaEUsT0FBTyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0wsQ0FBQztDQUFBO0FBRUQsSUFBSSxDQUFDLGdCQUFJLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuXHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgY2hva2lkYXIgZnJvbSBcImNob2tpZGFyXCI7XHJcbmltcG9ydCBkZWJvdW5jZSA9IHJlcXVpcmUoXCJsb2Rhc2guZGVib3VuY2VcIik7XHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IGFyZ3YgfSBmcm9tIFwiLi9hcmd1bWVudHNcIjtcclxuaW1wb3J0IHsgTGF1bmNoZXIgfSBmcm9tIFwiLi9sYXVuY2hlclwiO1xyXG5cclxuZnVuY3Rpb24gcmVzb2x2ZVZlcmJvc2l0eSh2ZXJib3NpdHk6IGFueSk6IG51bWJlciB7XHJcbiAgICAvLyBDb252ZXJ0IGdpdmVuIHZhbHVlIHRvIGFuIGFwcHJvcHJpYXRlIFZlcmJvc2l0eSBlbnVtIHZhbHVlLlxyXG4gICAgLy8gJ2FzIGFueSBhcyBudW1iZXInIGlzIHVzZWQgYmVjYXVzZSBUeXBlU2NyaXB0IHRoaW5rc1xyXG4gICAgLy8gIHRoYXQgd2UgY2FzdCBzdHJpbmcgdG8gbnVtYmVyLCBldmVuIHRob3VnaCB3ZSBnZXQgYSBudW1iZXIgdGhlcmVcclxuICAgIHJldHVybiAoQ29udHJhY3RzLlZlcmJvc2l0eVt2ZXJib3NpdHldIGFzIGFueSkgYXMgbnVtYmVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhcmd1bWVudHNUb0NvbmZpZyhhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcyk6IENvbnRyYWN0cy5Db25maWcge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBEZXN0aW5hdGlvbjogYXJndW1lbnRWYWx1ZXMuZGVzdCxcclxuICAgICAgICBFbnRyeTogYXJndW1lbnRWYWx1ZXMuZW50cnksXHJcbiAgICAgICAgRGVkdXBlR2xvYnM6IGFyZ3VtZW50VmFsdWVzLmRlZHVwZSxcclxuICAgICAgICBWZXJib3NpdHk6IHJlc29sdmVWZXJib3NpdHkoYXJndW1lbnRWYWx1ZXMudmVyYm9zaXR5KSxcclxuICAgICAgICBJbmNsdWRlUGF0aHM6IGFyZ3VtZW50VmFsdWVzLmluY2x1ZGVQYXRocyxcclxuICAgICAgICBJZ25vcmVkSW1wb3J0czogYXJndW1lbnRWYWx1ZXMuaWdub3JlZEltcG9ydHMsXHJcbiAgICAgICAgUHJvamVjdERpcmVjdG9yeTogcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGFyZ3VtZW50VmFsdWVzLnByb2plY3QpXHJcbiAgICB9O1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluKGFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBjb25maWcgPSBhcmd1bWVudHNUb0NvbmZpZyhhcmd1bWVudFZhbHVlcyk7XHJcbiAgICBjb25zdCBpc1dhdGNoaW5nID0gYXJndW1lbnRWYWx1ZXMud2F0Y2ggIT0gbnVsbDtcclxuICAgIGNvbnN0IGJ1bmRsZXIgPSBuZXcgTGF1bmNoZXIoY29uZmlnKTtcclxuXHJcbiAgICBpZiAoYXJndW1lbnRWYWx1ZXMudmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUgJiYgKGFyZ3VtZW50VmFsdWVzLmVudHJ5ID09IG51bGwgfHwgYXJndW1lbnRWYWx1ZXMuZGVzdCA9PSBudWxsKSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbRXJyb3JdICdlbnRyeScgYW5kICdkZXN0JyBhcmUgcmVxdWlyZWQuXCIpO1xyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoYXJndW1lbnRWYWx1ZXMudmVyYm9zaXR5ICE9PSBDb250cmFjdHMuVmVyYm9zaXR5Lk5vbmUgJiYgaXNXYXRjaGluZyAmJiBhcmd1bWVudFZhbHVlcy53YXRjaCA9PT0gXCJcIikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbRXJyb3JdICd3YXRjaCcgbXVzdCBiZSBkZWZpbmVkLlwiKTtcclxuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlzV2F0Y2hpbmcpIHtcclxuICAgICAgICBjb25zdCBvbkZpbGVzQ2hhbmdlID0gZGVib3VuY2UoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY29uZmlnLlZlcmJvc2l0eSA9PT0gQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJbV2F0Y2hlcl0gRmlsZSBjaGFuZ2UgZGV0ZWN0ZWQuXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF3YWl0IGJ1bmRsZXIuQnVuZGxlKCk7XHJcbiAgICAgICAgICAgIGlmIChjb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIltXYXRjaGVyXSBXYWl0aW5nIGZvciBjaGFuZ2VzLi4uXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgNTAwKTtcclxuXHJcbiAgICAgICAgY2hva2lkYXIud2F0Y2goYXJndW1lbnRWYWx1ZXMud2F0Y2gpLm9uKFwiY2hhbmdlXCIsIG9uRmlsZXNDaGFuZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IGJ1bmRsZXIuQnVuZGxlKCk7XHJcbiAgICBpZiAoaXNXYXRjaGluZyAmJiBjb25maWcuVmVyYm9zaXR5ID09PSBDb250cmFjdHMuVmVyYm9zaXR5LlZlcmJvc2UpIHtcclxuICAgICAgICBjb25zb2xlLmluZm8oXCJbV2F0Y2hlcl0gV2FpdGluZyBmb3IgY2hhbmdlcy4uLlwiKTtcclxuICAgIH1cclxufVxyXG5cclxubWFpbihhcmd2KTtcclxuIl19