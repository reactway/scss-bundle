#!/usr/bin/env node
Object.defineProperty(exports, "__esModule", { value: true });
const Contracts = require("./contracts");
const arguments_1 = require("./arguments");
const launcher_1 = require("./launcher");
class BundleCli {
    constructor(argv) {
        new launcher_1.Launcher(this.getConfig(argv)).Bundle();
    }
    getConfig(argv) {
        return {
            Destination: argv.dest,
            Entry: argv.entry,
            DedupePaths: argv.dedupePaths || [],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNsaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEseUNBQXlDO0FBQ3pDLDJDQUFtQztBQUNuQyx5Q0FBc0M7QUFFdEM7SUFDSSxZQUFZLElBQStCO1FBQ3ZDLElBQUksbUJBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDaEQsQ0FBQztJQUVPLFNBQVMsQ0FBQyxJQUErQjtRQUM3QyxNQUFNLENBQUM7WUFDSCxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDdEIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUU7WUFDbkMsU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQ25ELENBQUM7SUFDTixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsU0FBYztRQUNuQyw4REFBOEQ7UUFDOUQsdURBQXVEO1FBQ3ZELG9FQUFvRTtRQUNwRSxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQWtCLENBQUM7SUFDM0QsQ0FBQztDQUNKO0FBRUQsSUFBSSxTQUFTLENBQUMsZ0JBQUksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5cclxuaW1wb3J0ICogYXMgQ29udHJhY3RzIGZyb20gXCIuL2NvbnRyYWN0c1wiO1xyXG5pbXBvcnQgeyBhcmd2IH0gZnJvbSBcIi4vYXJndW1lbnRzXCI7XHJcbmltcG9ydCB7IExhdW5jaGVyIH0gZnJvbSBcIi4vbGF1bmNoZXJcIjtcclxuXHJcbmNsYXNzIEJ1bmRsZUNsaSB7XHJcbiAgICBjb25zdHJ1Y3Rvcihhcmd2OiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKSB7XHJcbiAgICAgICAgbmV3IExhdW5jaGVyKHRoaXMuZ2V0Q29uZmlnKGFyZ3YpKS5CdW5kbGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldENvbmZpZyhhcmd2OiBDb250cmFjdHMuQXJndW1lbnRzVmFsdWVzKTogQ29udHJhY3RzLkNvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgRGVzdGluYXRpb246IGFyZ3YuZGVzdCxcclxuICAgICAgICAgICAgRW50cnk6IGFyZ3YuZW50cnksXHJcbiAgICAgICAgICAgIERlZHVwZVBhdGhzOiBhcmd2LmRlZHVwZVBhdGhzIHx8IFtdLFxyXG4gICAgICAgICAgICBWZXJib3NpdHk6IHRoaXMucmVzb2x2ZVZlcmJvc2l0eShhcmd2LnZlcmJvc2l0eSlcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVzb2x2ZVZlcmJvc2l0eSh2ZXJib3NpdHk6IGFueSkge1xyXG4gICAgICAgIC8vIENvbnZlcnQgZ2l2ZW4gdmFsdWUgdG8gYW4gYXBwcm9wcmlhdGUgVmVyYm9zaXR5IGVudW0gdmFsdWUuXHJcbiAgICAgICAgLy8gJ2FzIGFueSBhcyBudW1iZXInIGlzIHVzZWQgYmVjYXVzZSBUeXBlU2NyaXB0IHRoaW5rc1xyXG4gICAgICAgIC8vICB0aGF0IHdlIGNhc3Qgc3RyaW5nIHRvIG51bWJlciwgZXZlbiB0aG91Z2ggd2UgZ2V0IGEgbnVtYmVyIHRoZXJlXHJcbiAgICAgICAgcmV0dXJuIENvbnRyYWN0cy5WZXJib3NpdHlbdmVyYm9zaXR5XSBhcyBhbnkgYXMgbnVtYmVyO1xyXG4gICAgfVxyXG59XHJcblxyXG5uZXcgQnVuZGxlQ2xpKGFyZ3YpO1xyXG4iXX0=