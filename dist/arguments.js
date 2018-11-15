"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const Contracts = require("./contracts");
const verbosityValues = [];
for (const key in Contracts.Verbosity) {
    if (Number(key) % 1 !== 0) {
        verbosityValues.push(key);
    }
}
const DEDUPE_KEY = "dedupe";
exports.argv = yargs
    .help("h", "Show help.")
    .alias("h", "help")
    .version()
    .alias("v", "version")
    .config("config")
    .alias("c", "config")
    .options("e", {
    alias: "entry",
    describe: "Entry file.",
    type: "string"
})
    .options("d", {
    alias: "dest",
    describe: "Bundled file destination.",
    type: "string"
})
    .options("p", {
    alias: "project",
    describe: "Project locatation, where `node_modules` are located.",
    type: "string",
    default: "."
})
    .options("w", {
    alias: "watch",
    describe: "Watch files for changes.",
    type: "string"
})
    .options("verbosity", {
    describe: "Verbosity of output.",
    choices: verbosityValues,
    default: Contracts.Verbosity[Contracts.Verbosity.Verbose]
})
    .options("includePaths", {
    describe: "Include paths for resolving imports.",
    type: "array"
})
    .options("ignoredImports", {
    describe: "Ignore resolving import content by matching a regular expression.",
    type: "array"
})
    .array(DEDUPE_KEY)
    .default(DEDUPE_KEY, [], "[]")
    .usage("Usage: scss-bundle [options]")
    .string(["c", "e", "d"]).argv;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndW1lbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2FyZ3VtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUErQjtBQUUvQix5Q0FBeUM7QUFFekMsTUFBTSxlQUFlLEdBQWEsRUFBRSxDQUFDO0FBQ3JDLEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsRUFBRTtJQUNuQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3ZCLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDN0I7Q0FDSjtBQUVELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQztBQUVmLFFBQUEsSUFBSSxHQUFHLEtBQUs7S0FDcEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUM7S0FDdkIsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUM7S0FDbEIsT0FBTyxFQUFFO0tBQ1QsS0FBSyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUM7S0FDckIsTUFBTSxDQUFDLFFBQVEsQ0FBQztLQUNoQixLQUFLLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztLQUNwQixPQUFPLENBQUMsR0FBRyxFQUFFO0lBQ1YsS0FBSyxFQUFFLE9BQU87SUFDZCxRQUFRLEVBQUUsYUFBYTtJQUN2QixJQUFJLEVBQUUsUUFBUTtDQUNqQixDQUFDO0tBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRTtJQUNWLEtBQUssRUFBRSxNQUFNO0lBQ2IsUUFBUSxFQUFFLDJCQUEyQjtJQUNyQyxJQUFJLEVBQUUsUUFBUTtDQUNqQixDQUFDO0tBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRTtJQUNWLEtBQUssRUFBRSxTQUFTO0lBQ2hCLFFBQVEsRUFBRSx1REFBdUQ7SUFDakUsSUFBSSxFQUFFLFFBQVE7SUFDZCxPQUFPLEVBQUUsR0FBRztDQUNmLENBQUM7S0FDRCxPQUFPLENBQUMsR0FBRyxFQUFFO0lBQ1YsS0FBSyxFQUFFLE9BQU87SUFDZCxRQUFRLEVBQUUsMEJBQTBCO0lBQ3BDLElBQUksRUFBRSxRQUFRO0NBQ2pCLENBQUM7S0FDRCxPQUFPLENBQUMsV0FBVyxFQUFFO0lBQ2xCLFFBQVEsRUFBRSxzQkFBc0I7SUFDaEMsT0FBTyxFQUFFLGVBQWU7SUFDeEIsT0FBTyxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7Q0FDNUQsQ0FBQztLQUNELE9BQU8sQ0FBQyxjQUFjLEVBQUU7SUFDckIsUUFBUSxFQUFFLHNDQUFzQztJQUNoRCxJQUFJLEVBQUUsT0FBTztDQUNoQixDQUFDO0tBQ0QsT0FBTyxDQUFDLGdCQUFnQixFQUFFO0lBQ3ZCLFFBQVEsRUFBRSxtRUFBbUU7SUFDN0UsSUFBSSxFQUFFLE9BQU87Q0FDaEIsQ0FBQztLQUNELEtBQUssQ0FBQyxVQUFVLENBQUM7S0FDakIsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDO0tBQzdCLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQztLQUNyQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBaUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHlhcmdzIGZyb20gXCJ5YXJnc1wiO1xyXG5cclxuaW1wb3J0ICogYXMgQ29udHJhY3RzIGZyb20gXCIuL2NvbnRyYWN0c1wiO1xyXG5cclxuY29uc3QgdmVyYm9zaXR5VmFsdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG5mb3IgKGNvbnN0IGtleSBpbiBDb250cmFjdHMuVmVyYm9zaXR5KSB7XHJcbiAgICBpZiAoTnVtYmVyKGtleSkgJSAxICE9PSAwKSB7XHJcbiAgICAgICAgdmVyYm9zaXR5VmFsdWVzLnB1c2goa2V5KTtcclxuICAgIH1cclxufVxyXG5cclxuY29uc3QgREVEVVBFX0tFWSA9IFwiZGVkdXBlXCI7XHJcblxyXG5leHBvcnQgY29uc3QgYXJndiA9IHlhcmdzXHJcbiAgICAuaGVscChcImhcIiwgXCJTaG93IGhlbHAuXCIpXHJcbiAgICAuYWxpYXMoXCJoXCIsIFwiaGVscFwiKVxyXG4gICAgLnZlcnNpb24oKVxyXG4gICAgLmFsaWFzKFwidlwiLCBcInZlcnNpb25cIilcclxuICAgIC5jb25maWcoXCJjb25maWdcIilcclxuICAgIC5hbGlhcyhcImNcIiwgXCJjb25maWdcIilcclxuICAgIC5vcHRpb25zKFwiZVwiLCB7XHJcbiAgICAgICAgYWxpYXM6IFwiZW50cnlcIixcclxuICAgICAgICBkZXNjcmliZTogXCJFbnRyeSBmaWxlLlwiLFxyXG4gICAgICAgIHR5cGU6IFwic3RyaW5nXCJcclxuICAgIH0pXHJcbiAgICAub3B0aW9ucyhcImRcIiwge1xyXG4gICAgICAgIGFsaWFzOiBcImRlc3RcIixcclxuICAgICAgICBkZXNjcmliZTogXCJCdW5kbGVkIGZpbGUgZGVzdGluYXRpb24uXCIsXHJcbiAgICAgICAgdHlwZTogXCJzdHJpbmdcIlxyXG4gICAgfSlcclxuICAgIC5vcHRpb25zKFwicFwiLCB7XHJcbiAgICAgICAgYWxpYXM6IFwicHJvamVjdFwiLFxyXG4gICAgICAgIGRlc2NyaWJlOiBcIlByb2plY3QgbG9jYXRhdGlvbiwgd2hlcmUgYG5vZGVfbW9kdWxlc2AgYXJlIGxvY2F0ZWQuXCIsXHJcbiAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcclxuICAgICAgICBkZWZhdWx0OiBcIi5cIlxyXG4gICAgfSlcclxuICAgIC5vcHRpb25zKFwid1wiLCB7XHJcbiAgICAgICAgYWxpYXM6IFwid2F0Y2hcIixcclxuICAgICAgICBkZXNjcmliZTogXCJXYXRjaCBmaWxlcyBmb3IgY2hhbmdlcy5cIixcclxuICAgICAgICB0eXBlOiBcInN0cmluZ1wiXHJcbiAgICB9KVxyXG4gICAgLm9wdGlvbnMoXCJ2ZXJib3NpdHlcIiwge1xyXG4gICAgICAgIGRlc2NyaWJlOiBcIlZlcmJvc2l0eSBvZiBvdXRwdXQuXCIsXHJcbiAgICAgICAgY2hvaWNlczogdmVyYm9zaXR5VmFsdWVzLFxyXG4gICAgICAgIGRlZmF1bHQ6IENvbnRyYWN0cy5WZXJib3NpdHlbQ29udHJhY3RzLlZlcmJvc2l0eS5WZXJib3NlXVxyXG4gICAgfSlcclxuICAgIC5vcHRpb25zKFwiaW5jbHVkZVBhdGhzXCIsIHtcclxuICAgICAgICBkZXNjcmliZTogXCJJbmNsdWRlIHBhdGhzIGZvciByZXNvbHZpbmcgaW1wb3J0cy5cIixcclxuICAgICAgICB0eXBlOiBcImFycmF5XCJcclxuICAgIH0pXHJcbiAgICAub3B0aW9ucyhcImlnbm9yZWRJbXBvcnRzXCIsIHtcclxuICAgICAgICBkZXNjcmliZTogXCJJZ25vcmUgcmVzb2x2aW5nIGltcG9ydCBjb250ZW50IGJ5IG1hdGNoaW5nIGEgcmVndWxhciBleHByZXNzaW9uLlwiLFxyXG4gICAgICAgIHR5cGU6IFwiYXJyYXlcIlxyXG4gICAgfSlcclxuICAgIC5hcnJheShERURVUEVfS0VZKVxyXG4gICAgLmRlZmF1bHQoREVEVVBFX0tFWSwgW10sIFwiW11cIilcclxuICAgIC51c2FnZShcIlVzYWdlOiBzY3NzLWJ1bmRsZSBbb3B0aW9uc11cIilcclxuICAgIC5zdHJpbmcoW1wiY1wiLCBcImVcIiwgXCJkXCJdKS5hcmd2IGFzIENvbnRyYWN0cy5Bcmd1bWVudHNWYWx1ZXM7XHJcbiJdfQ==