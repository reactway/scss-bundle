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
const Contracts = require("./contracts");
const arguments_1 = require("./arguments");
const launcher_1 = require("./launcher");
class BundleCli {
    constructor(argumentValues) {
        this.bundle(argumentValues);
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
            IncludePaths: argumentValues.includePaths
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEseUNBQXlDO0FBQ3pDLDJDQUFtQztBQUNuQyx5Q0FBc0M7QUFFdEM7SUFDSSxZQUFZLGNBQXlDO1FBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVhLE1BQU0sQ0FBQyxjQUF5Qzs7WUFDMUQsTUFBTSxJQUFJLG1CQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hFLENBQUM7S0FBQTtJQUVPLFNBQVMsQ0FBQyxjQUF5QztRQUN2RCxNQUFNLENBQUM7WUFDSCxXQUFXLEVBQUUsY0FBYyxDQUFDLElBQUk7WUFDaEMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO1lBQzNCLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTTtZQUNsQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDMUQsWUFBWSxFQUFFLGNBQWMsQ0FBQyxZQUFZO1NBQzVDLENBQUM7SUFDTixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsU0FBYztRQUNuQyw4REFBOEQ7UUFDOUQsdURBQXVEO1FBQ3ZELG9FQUFvRTtRQUNwRSxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQWtCLENBQUM7SUFDM0QsQ0FBQztDQUNKO0FBRUQsSUFBSSxTQUFTLENBQUMsZ0JBQUksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5cclxuaW1wb3J0ICogYXMgQ29udHJhY3RzIGZyb20gXCIuL2NvbnRyYWN0c1wiO1xyXG5pbXBvcnQgeyBhcmd2IH0gZnJvbSBcIi4vYXJndW1lbnRzXCI7XHJcbmltcG9ydCB7IExhdW5jaGVyIH0gZnJvbSBcIi4vbGF1bmNoZXJcIjtcclxuXHJcbmNsYXNzIEJ1bmRsZUNsaSB7XHJcbiAgICBjb25zdHJ1Y3Rvcihhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcykge1xyXG4gICAgICAgIHRoaXMuYnVuZGxlKGFyZ3VtZW50VmFsdWVzKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1bmRsZShhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcykge1xyXG4gICAgICAgIGF3YWl0IG5ldyBMYXVuY2hlcih0aGlzLmdldENvbmZpZyhhcmd1bWVudFZhbHVlcykpLkJ1bmRsZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0Q29uZmlnKGFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKTogQ29udHJhY3RzLkNvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgRGVzdGluYXRpb246IGFyZ3VtZW50VmFsdWVzLmRlc3QsXHJcbiAgICAgICAgICAgIEVudHJ5OiBhcmd1bWVudFZhbHVlcy5lbnRyeSxcclxuICAgICAgICAgICAgRGVkdXBlR2xvYnM6IGFyZ3VtZW50VmFsdWVzLmRlZHVwZSxcclxuICAgICAgICAgICAgVmVyYm9zaXR5OiB0aGlzLnJlc29sdmVWZXJib3NpdHkoYXJndW1lbnRWYWx1ZXMudmVyYm9zaXR5KSxcclxuICAgICAgICAgICAgSW5jbHVkZVBhdGhzOiBhcmd1bWVudFZhbHVlcy5pbmNsdWRlUGF0aHNcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVzb2x2ZVZlcmJvc2l0eSh2ZXJib3NpdHk6IGFueSk6IG51bWJlciB7XHJcbiAgICAgICAgLy8gQ29udmVydCBnaXZlbiB2YWx1ZSB0byBhbiBhcHByb3ByaWF0ZSBWZXJib3NpdHkgZW51bSB2YWx1ZS5cclxuICAgICAgICAvLyAnYXMgYW55IGFzIG51bWJlcicgaXMgdXNlZCBiZWNhdXNlIFR5cGVTY3JpcHQgdGhpbmtzXHJcbiAgICAgICAgLy8gIHRoYXQgd2UgY2FzdCBzdHJpbmcgdG8gbnVtYmVyLCBldmVuIHRob3VnaCB3ZSBnZXQgYSBudW1iZXIgdGhlcmVcclxuICAgICAgICByZXR1cm4gQ29udHJhY3RzLlZlcmJvc2l0eVt2ZXJib3NpdHldIGFzIGFueSBhcyBudW1iZXI7XHJcbiAgICB9XHJcbn1cclxuXHJcbm5ldyBCdW5kbGVDbGkoYXJndik7XHJcbiJdfQ==