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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEsNkJBQTZCO0FBQzdCLHlDQUF5QztBQUN6QywyQ0FBbUM7QUFDbkMseUNBQXNDO0FBRXRDO0lBQ0ksWUFBWSxjQUF5QztRQUNqRCxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFYSxNQUFNLENBQUMsY0FBeUM7O1lBQzFELE1BQU0sSUFBSSxtQkFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNoRSxDQUFDO0tBQUE7SUFFTyxTQUFTLENBQUMsY0FBeUM7UUFDdkQsT0FBTztZQUNILFdBQVcsRUFBRSxjQUFjLENBQUMsSUFBSTtZQUNoQyxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7WUFDM0IsV0FBVyxFQUFFLGNBQWMsQ0FBQyxNQUFNO1lBQ2xDLFNBQVMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQztZQUMxRCxZQUFZLEVBQUUsY0FBYyxDQUFDLFlBQVk7WUFDekMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQztTQUN4RSxDQUFDO0lBQ04sQ0FBQztJQUVPLGdCQUFnQixDQUFDLFNBQWM7UUFDbkMsOERBQThEO1FBQzlELHVEQUF1RDtRQUN2RCxvRUFBb0U7UUFDcEUsT0FBTyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBa0IsQ0FBQztJQUMzRCxDQUFDO0NBQ0o7QUFFRCxJQUFJLFNBQVMsQ0FBQyxnQkFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIENvbnRyYWN0cyBmcm9tIFwiLi9jb250cmFjdHNcIjtcclxuaW1wb3J0IHsgYXJndiB9IGZyb20gXCIuL2FyZ3VtZW50c1wiO1xyXG5pbXBvcnQgeyBMYXVuY2hlciB9IGZyb20gXCIuL2xhdW5jaGVyXCI7XHJcblxyXG5jbGFzcyBCdW5kbGVDbGkge1xyXG4gICAgY29uc3RydWN0b3IoYXJndW1lbnRWYWx1ZXM6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpIHtcclxuICAgICAgICB0aGlzLmJ1bmRsZShhcmd1bWVudFZhbHVlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBidW5kbGUoYXJndW1lbnRWYWx1ZXM6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBhd2FpdCBuZXcgTGF1bmNoZXIodGhpcy5nZXRDb25maWcoYXJndW1lbnRWYWx1ZXMpKS5CdW5kbGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldENvbmZpZyhhcmd1bWVudFZhbHVlczogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcyk6IENvbnRyYWN0cy5Db25maWcge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIERlc3RpbmF0aW9uOiBhcmd1bWVudFZhbHVlcy5kZXN0LFxyXG4gICAgICAgICAgICBFbnRyeTogYXJndW1lbnRWYWx1ZXMuZW50cnksXHJcbiAgICAgICAgICAgIERlZHVwZUdsb2JzOiBhcmd1bWVudFZhbHVlcy5kZWR1cGUsXHJcbiAgICAgICAgICAgIFZlcmJvc2l0eTogdGhpcy5yZXNvbHZlVmVyYm9zaXR5KGFyZ3VtZW50VmFsdWVzLnZlcmJvc2l0eSksXHJcbiAgICAgICAgICAgIEluY2x1ZGVQYXRoczogYXJndW1lbnRWYWx1ZXMuaW5jbHVkZVBhdGhzLFxyXG4gICAgICAgICAgICBQcm9qZWN0RGlyZWN0b3J5OiBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgYXJndW1lbnRWYWx1ZXMucHJvamVjdClcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVzb2x2ZVZlcmJvc2l0eSh2ZXJib3NpdHk6IGFueSk6IG51bWJlciB7XHJcbiAgICAgICAgLy8gQ29udmVydCBnaXZlbiB2YWx1ZSB0byBhbiBhcHByb3ByaWF0ZSBWZXJib3NpdHkgZW51bSB2YWx1ZS5cclxuICAgICAgICAvLyAnYXMgYW55IGFzIG51bWJlcicgaXMgdXNlZCBiZWNhdXNlIFR5cGVTY3JpcHQgdGhpbmtzXHJcbiAgICAgICAgLy8gIHRoYXQgd2UgY2FzdCBzdHJpbmcgdG8gbnVtYmVyLCBldmVuIHRob3VnaCB3ZSBnZXQgYSBudW1iZXIgdGhlcmVcclxuICAgICAgICByZXR1cm4gQ29udHJhY3RzLlZlcmJvc2l0eVt2ZXJib3NpdHldIGFzIGFueSBhcyBudW1iZXI7XHJcbiAgICB9XHJcbn1cclxuXHJcbm5ldyBCdW5kbGVDbGkoYXJndik7XHJcbiJdfQ==