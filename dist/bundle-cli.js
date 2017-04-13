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
const Contracts = require("./contracts");
const arguments_1 = require("./arguments");
const launcher_1 = require("./launcher");
class BundleCli {
    constructor(argv) {
        this.bundle();
    }
    bundle() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new launcher_1.Launcher(this.getConfig(arguments_1.argv)).Bundle();
        });
    }
    getConfig(argv) {
        return {
            Destination: argv.dest,
            Entry: argv.entry,
            DedupeGlobs: argv.dedupe,
            Verbosity: this.resolveVerbosity(argv.verbosity)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFFQSx5Q0FBeUM7QUFDekMsMkNBQW1DO0FBQ25DLHlDQUFzQztBQUV0QztJQUNJLFlBQVksSUFBK0I7UUFDdkMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFYSxNQUFNOztZQUNoQixNQUFNLElBQUksbUJBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3RELENBQUM7S0FBQTtJQUVPLFNBQVMsQ0FBQyxJQUErQjtRQUM3QyxNQUFNLENBQUM7WUFDSCxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDdEIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTTtZQUN4QixTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDbkQsQ0FBQztJQUNOLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxTQUFjO1FBQ25DLDhEQUE4RDtRQUM5RCx1REFBdUQ7UUFDdkQsb0VBQW9FO1FBQ3BFLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBa0IsQ0FBQztJQUMzRCxDQUFDO0NBQ0o7QUFFRCxJQUFJLFNBQVMsQ0FBQyxnQkFBSSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG5pbXBvcnQgKiBhcyBDb250cmFjdHMgZnJvbSBcIi4vY29udHJhY3RzXCI7XHJcbmltcG9ydCB7IGFyZ3YgfSBmcm9tIFwiLi9hcmd1bWVudHNcIjtcclxuaW1wb3J0IHsgTGF1bmNoZXIgfSBmcm9tIFwiLi9sYXVuY2hlclwiO1xyXG5cclxuY2xhc3MgQnVuZGxlQ2xpIHtcclxuICAgIGNvbnN0cnVjdG9yKGFyZ3Y6IENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXMpIHtcclxuICAgICAgICB0aGlzLmJ1bmRsZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYnVuZGxlKCkge1xyXG4gICAgICAgIGF3YWl0IG5ldyBMYXVuY2hlcih0aGlzLmdldENvbmZpZyhhcmd2KSkuQnVuZGxlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRDb25maWcoYXJndjogQ29udHJhY3RzLkFyZ3VtZW50c1ZhbHVlcyk6IENvbnRyYWN0cy5Db25maWcge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIERlc3RpbmF0aW9uOiBhcmd2LmRlc3QsXHJcbiAgICAgICAgICAgIEVudHJ5OiBhcmd2LmVudHJ5LFxyXG4gICAgICAgICAgICBEZWR1cGVHbG9iczogYXJndi5kZWR1cGUsXHJcbiAgICAgICAgICAgIFZlcmJvc2l0eTogdGhpcy5yZXNvbHZlVmVyYm9zaXR5KGFyZ3YudmVyYm9zaXR5KVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZXNvbHZlVmVyYm9zaXR5KHZlcmJvc2l0eTogYW55KTogbnVtYmVyIHtcclxuICAgICAgICAvLyBDb252ZXJ0IGdpdmVuIHZhbHVlIHRvIGFuIGFwcHJvcHJpYXRlIFZlcmJvc2l0eSBlbnVtIHZhbHVlLlxyXG4gICAgICAgIC8vICdhcyBhbnkgYXMgbnVtYmVyJyBpcyB1c2VkIGJlY2F1c2UgVHlwZVNjcmlwdCB0aGlua3NcclxuICAgICAgICAvLyAgdGhhdCB3ZSBjYXN0IHN0cmluZyB0byBudW1iZXIsIGV2ZW4gdGhvdWdoIHdlIGdldCBhIG51bWJlciB0aGVyZVxyXG4gICAgICAgIHJldHVybiBDb250cmFjdHMuVmVyYm9zaXR5W3ZlcmJvc2l0eV0gYXMgYW55IGFzIG51bWJlcjtcclxuICAgIH1cclxufVxyXG5cclxubmV3IEJ1bmRsZUNsaShhcmd2KTtcclxuIl19