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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEsNkJBQTZCO0FBQzdCLHlDQUF5QztBQUN6QywyQ0FBbUM7QUFDbkMseUNBQXNDO0FBRXRDO0lBQ0ksWUFBWSxjQUF5QztRQUNqRCxJQUFJLGNBQWMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLGNBQWMsQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQzdELElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDL0I7YUFBTSxJQUFJLGNBQWMsQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDOUQsT0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1lBQzFELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkI7SUFDTCxDQUFDO0lBRWEsTUFBTSxDQUFDLGNBQXlDOztZQUMxRCxNQUFNLElBQUksbUJBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEUsQ0FBQztLQUFBO0lBRU8sU0FBUyxDQUFDLGNBQXlDO1FBQ3ZELE9BQU87WUFDSCxXQUFXLEVBQUUsY0FBYyxDQUFDLElBQUk7WUFDaEMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO1lBQzNCLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTTtZQUNsQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDMUQsWUFBWSxFQUFFLGNBQWMsQ0FBQyxZQUFZO1lBQ3pDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUM7U0FDeEUsQ0FBQztJQUNOLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxTQUFjO1FBQ25DLDhEQUE4RDtRQUM5RCx1REFBdUQ7UUFDdkQsb0VBQW9FO1FBQ3BFLE9BQU8sU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQWtCLENBQUM7SUFDM0QsQ0FBQztDQUNKO0FBRUQsSUFBSSxTQUFTLENBQUMsZ0JBQUksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5cclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IGFyZ3YgfSBmcm9tIFwiLi9hcmd1bWVudHNcIjtcclxuaW1wb3J0IHsgTGF1bmNoZXIgfSBmcm9tIFwiLi9sYXVuY2hlclwiO1xyXG5cclxuY2xhc3MgQnVuZGxlQ2xpIHtcclxuICAgIGNvbnN0cnVjdG9yKGFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKSB7XHJcbiAgICAgICAgaWYgKGFyZ3VtZW50VmFsdWVzLmVudHJ5ICE9IG51bGwgJiYgYXJndW1lbnRWYWx1ZXMuZGVzdCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVuZGxlKGFyZ3VtZW50VmFsdWVzKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFyZ3VtZW50VmFsdWVzLnZlcmJvc2l0eSAhPT0gQ29udHJhY3RzLlZlcmJvc2l0eS5Ob25lKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbRXJyb3JdICdlbnRyeScgYW5kICdkZXN0JyBhcmUgcmVxdWlyZWQuXCIpO1xyXG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYnVuZGxlKGFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgYXdhaXQgbmV3IExhdW5jaGVyKHRoaXMuZ2V0Q29uZmlnKGFyZ3VtZW50VmFsdWVzKSkuQnVuZGxlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRDb25maWcoYXJndW1lbnRWYWx1ZXM6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpOiBDb250cmFjdHMuQ29uZmlnIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBEZXN0aW5hdGlvbjogYXJndW1lbnRWYWx1ZXMuZGVzdCxcclxuICAgICAgICAgICAgRW50cnk6IGFyZ3VtZW50VmFsdWVzLmVudHJ5LFxyXG4gICAgICAgICAgICBEZWR1cGVHbG9iczogYXJndW1lbnRWYWx1ZXMuZGVkdXBlLFxyXG4gICAgICAgICAgICBWZXJib3NpdHk6IHRoaXMucmVzb2x2ZVZlcmJvc2l0eShhcmd1bWVudFZhbHVlcy52ZXJib3NpdHkpLFxyXG4gICAgICAgICAgICBJbmNsdWRlUGF0aHM6IGFyZ3VtZW50VmFsdWVzLmluY2x1ZGVQYXRocyxcclxuICAgICAgICAgICAgUHJvamVjdERpcmVjdG9yeTogcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGFyZ3VtZW50VmFsdWVzLnByb2plY3QpXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlc29sdmVWZXJib3NpdHkodmVyYm9zaXR5OiBhbnkpOiBudW1iZXIge1xyXG4gICAgICAgIC8vIENvbnZlcnQgZ2l2ZW4gdmFsdWUgdG8gYW4gYXBwcm9wcmlhdGUgVmVyYm9zaXR5IGVudW0gdmFsdWUuXHJcbiAgICAgICAgLy8gJ2FzIGFueSBhcyBudW1iZXInIGlzIHVzZWQgYmVjYXVzZSBUeXBlU2NyaXB0IHRoaW5rc1xyXG4gICAgICAgIC8vICB0aGF0IHdlIGNhc3Qgc3RyaW5nIHRvIG51bWJlciwgZXZlbiB0aG91Z2ggd2UgZ2V0IGEgbnVtYmVyIHRoZXJlXHJcbiAgICAgICAgcmV0dXJuIENvbnRyYWN0cy5WZXJib3NpdHlbdmVyYm9zaXR5XSBhcyBhbnkgYXMgbnVtYmVyO1xyXG4gICAgfVxyXG59XHJcblxyXG5uZXcgQnVuZGxlQ2xpKGFyZ3YpO1xyXG4iXX0=