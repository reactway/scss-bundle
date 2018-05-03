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
const Contracts = require("./contracts");
const arguments_1 = require("./arguments");
const launcher_1 = require("./launcher");
class BundleCli {
    constructor(argumentValues) {
        if (argumentValues.entry != null && argumentValues.dest != null) {
            this.bundle(argumentValues);
        }
        else if (argumentValues.verbosity !== Contracts.Verbosity.None) {
            console.error("[Error] 'entry' and 'dest' are required.");
            process.exit(1);
        }
    }
    bundle(argumentValues) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new launcher_1.Launcher(this.getConfig(argumentValues)).Bundle();
        });
    }
    getConfig(argumentValues) {
        return {
            Destination: argumentValues.dest,
            Entry: argumentValues.entry,
            DedupeGlobs: argumentValues.dedupe,
            Verbosity: this.resolveVerbosity(argumentValues.verbosity),
            IncludePaths: argumentValues.includePaths,
            IgnoredImports: argumentValues.ignoredImports,
            ProjectDirectory: path.resolve(process.cwd(), argumentValues.project)
        };
    }
    resolveVerbosity(verbosity) {
        // Convert given value to an appropriate Verbosity enum value.
        // 'as any as number' is used because TypeScript thinks
        //  that we cast string to number, even though we get a number there
        return Contracts.Verbosity[verbosity];
    }
}
new BundleCli(arguments_1.argv);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEsNkJBQTZCO0FBQzdCLHlDQUF5QztBQUN6QywyQ0FBbUM7QUFDbkMseUNBQXNDO0FBRXRDO0lBQ0ksWUFBWSxjQUF5QztRQUNqRCxJQUFJLGNBQWMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLGNBQWMsQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQzdELElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDL0I7YUFBTSxJQUFJLGNBQWMsQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDOUQsT0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1lBQzFELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkI7SUFDTCxDQUFDO0lBRWEsTUFBTSxDQUFDLGNBQXlDOztZQUMxRCxNQUFNLElBQUksbUJBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEUsQ0FBQztLQUFBO0lBRU8sU0FBUyxDQUFDLGNBQXlDO1FBQ3ZELE9BQU87WUFDSCxXQUFXLEVBQUUsY0FBYyxDQUFDLElBQUk7WUFDaEMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO1lBQzNCLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTTtZQUNsQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDMUQsWUFBWSxFQUFFLGNBQWMsQ0FBQyxZQUFZO1lBQ3pDLGNBQWMsRUFBRSxjQUFjLENBQUMsY0FBYztZQUM3QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDO1NBQ3hFLENBQUM7SUFDTixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsU0FBYztRQUNuQyw4REFBOEQ7UUFDOUQsdURBQXVEO1FBQ3ZELG9FQUFvRTtRQUNwRSxPQUFPLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFrQixDQUFDO0lBQzNELENBQUM7Q0FDSjtBQUVELElBQUksU0FBUyxDQUFDLGdCQUFJLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuXHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgQ29udHJhY3RzIGZyb20gXCIuL2NvbnRyYWN0c1wiO1xyXG5pbXBvcnQgeyBhcmd2IH0gZnJvbSBcIi4vYXJndW1lbnRzXCI7XHJcbmltcG9ydCB7IExhdW5jaGVyIH0gZnJvbSBcIi4vbGF1bmNoZXJcIjtcclxuXHJcbmNsYXNzIEJ1bmRsZUNsaSB7XHJcbiAgICBjb25zdHJ1Y3Rvcihhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcykge1xyXG4gICAgICAgIGlmIChhcmd1bWVudFZhbHVlcy5lbnRyeSAhPSBudWxsICYmIGFyZ3VtZW50VmFsdWVzLmRlc3QgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJ1bmRsZShhcmd1bWVudFZhbHVlcyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudFZhbHVlcy52ZXJib3NpdHkgIT09IENvbnRyYWN0cy5WZXJib3NpdHkuTm9uZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0Vycm9yXSAnZW50cnknIGFuZCAnZGVzdCcgYXJlIHJlcXVpcmVkLlwiKTtcclxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1bmRsZShhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGF3YWl0IG5ldyBMYXVuY2hlcih0aGlzLmdldENvbmZpZyhhcmd1bWVudFZhbHVlcykpLkJ1bmRsZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0Q29uZmlnKGFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKTogQ29udHJhY3RzLkNvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgRGVzdGluYXRpb246IGFyZ3VtZW50VmFsdWVzLmRlc3QsXHJcbiAgICAgICAgICAgIEVudHJ5OiBhcmd1bWVudFZhbHVlcy5lbnRyeSxcclxuICAgICAgICAgICAgRGVkdXBlR2xvYnM6IGFyZ3VtZW50VmFsdWVzLmRlZHVwZSxcclxuICAgICAgICAgICAgVmVyYm9zaXR5OiB0aGlzLnJlc29sdmVWZXJib3NpdHkoYXJndW1lbnRWYWx1ZXMudmVyYm9zaXR5KSxcclxuICAgICAgICAgICAgSW5jbHVkZVBhdGhzOiBhcmd1bWVudFZhbHVlcy5pbmNsdWRlUGF0aHMsXHJcbiAgICAgICAgICAgIElnbm9yZWRJbXBvcnRzOiBhcmd1bWVudFZhbHVlcy5pZ25vcmVkSW1wb3J0cyxcclxuICAgICAgICAgICAgUHJvamVjdERpcmVjdG9yeTogcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGFyZ3VtZW50VmFsdWVzLnByb2plY3QpXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlc29sdmVWZXJib3NpdHkodmVyYm9zaXR5OiBhbnkpOiBudW1iZXIge1xyXG4gICAgICAgIC8vIENvbnZlcnQgZ2l2ZW4gdmFsdWUgdG8gYW4gYXBwcm9wcmlhdGUgVmVyYm9zaXR5IGVudW0gdmFsdWUuXHJcbiAgICAgICAgLy8gJ2FzIGFueSBhcyBudW1iZXInIGlzIHVzZWQgYmVjYXVzZSBUeXBlU2NyaXB0IHRoaW5rc1xyXG4gICAgICAgIC8vICB0aGF0IHdlIGNhc3Qgc3RyaW5nIHRvIG51bWJlciwgZXZlbiB0aG91Z2ggd2UgZ2V0IGEgbnVtYmVyIHRoZXJlXHJcbiAgICAgICAgcmV0dXJuIENvbnRyYWN0cy5WZXJib3NpdHlbdmVyYm9zaXR5XSBhcyBhbnkgYXMgbnVtYmVyO1xyXG4gICAgfVxyXG59XHJcblxyXG5uZXcgQnVuZGxlQ2xpKGFyZ3YpO1xyXG4iXX0=