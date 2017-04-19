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
            Verbosity: this.resolveVerbosity(argumentValues.verbosity)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEseUNBQXlDO0FBQ3pDLDJDQUFtQztBQUNuQyx5Q0FBc0M7QUFFdEM7SUFDSSxZQUFZLGNBQXlDO1FBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVhLE1BQU0sQ0FBQyxjQUF5Qzs7WUFDMUQsTUFBTSxJQUFJLG1CQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hFLENBQUM7S0FBQTtJQUVPLFNBQVMsQ0FBQyxjQUF5QztRQUN2RCxNQUFNLENBQUM7WUFDSCxXQUFXLEVBQUUsY0FBYyxDQUFDLElBQUk7WUFDaEMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO1lBQzNCLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTTtZQUNsQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7U0FDN0QsQ0FBQztJQUNOLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxTQUFjO1FBQ25DLDhEQUE4RDtRQUM5RCx1REFBdUQ7UUFDdkQsb0VBQW9FO1FBQ3BFLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBa0IsQ0FBQztJQUMzRCxDQUFDO0NBQ0o7QUFFRCxJQUFJLFNBQVMsQ0FBQyxnQkFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IGFyZ3YgfSBmcm9tIFwiLi9hcmd1bWVudHNcIjtcclxuaW1wb3J0IHsgTGF1bmNoZXIgfSBmcm9tIFwiLi9sYXVuY2hlclwiO1xyXG5cclxuY2xhc3MgQnVuZGxlQ2xpIHtcclxuICAgIGNvbnN0cnVjdG9yKGFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKSB7XHJcbiAgICAgICAgdGhpcy5idW5kbGUoYXJndW1lbnRWYWx1ZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYnVuZGxlKGFyZ3VtZW50VmFsdWVzOiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKSB7XHJcbiAgICAgICAgYXdhaXQgbmV3IExhdW5jaGVyKHRoaXMuZ2V0Q29uZmlnKGFyZ3VtZW50VmFsdWVzKSkuQnVuZGxlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRDb25maWcoYXJndW1lbnRWYWx1ZXM6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpOiBDb250cmFjdHMuQ29uZmlnIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBEZXN0aW5hdGlvbjogYXJndW1lbnRWYWx1ZXMuZGVzdCxcclxuICAgICAgICAgICAgRW50cnk6IGFyZ3VtZW50VmFsdWVzLmVudHJ5LFxyXG4gICAgICAgICAgICBEZWR1cGVHbG9iczogYXJndW1lbnRWYWx1ZXMuZGVkdXBlLFxyXG4gICAgICAgICAgICBWZXJib3NpdHk6IHRoaXMucmVzb2x2ZVZlcmJvc2l0eShhcmd1bWVudFZhbHVlcy52ZXJib3NpdHkpXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlc29sdmVWZXJib3NpdHkodmVyYm9zaXR5OiBhbnkpOiBudW1iZXIge1xyXG4gICAgICAgIC8vIENvbnZlcnQgZ2l2ZW4gdmFsdWUgdG8gYW4gYXBwcm9wcmlhdGUgVmVyYm9zaXR5IGVudW0gdmFsdWUuXHJcbiAgICAgICAgLy8gJ2FzIGFueSBhcyBudW1iZXInIGlzIHVzZWQgYmVjYXVzZSBUeXBlU2NyaXB0IHRoaW5rc1xyXG4gICAgICAgIC8vICB0aGF0IHdlIGNhc3Qgc3RyaW5nIHRvIG51bWJlciwgZXZlbiB0aG91Z2ggd2UgZ2V0IGEgbnVtYmVyIHRoZXJlXHJcbiAgICAgICAgcmV0dXJuIENvbnRyYWN0cy5WZXJib3NpdHlbdmVyYm9zaXR5XSBhcyBhbnkgYXMgbnVtYmVyO1xyXG4gICAgfVxyXG59XHJcblxyXG5uZXcgQnVuZGxlQ2xpKGFyZ3YpO1xyXG4iXX0=