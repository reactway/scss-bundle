var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("mz/fs");
const os = require("os");
const path = require("path");
const Helpers = require("./helpers");
const IMPORT_PATTERN = /@import ['"](.+)['"];/g;
const COMMENTED_IMPORT_PATTERN = /\/\/@import '(.+)';/g;
const FILE_EXTENSION = ".scss";
class Bundler {
    static Bundle(file, filesRegistry = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.access(file);
                let content = yield fs.readFile(file, "utf-8");
                return yield this.bundle(file, content);
            }
            catch (error) {
                return {
                    filePath: file,
                    found: false
                };
            }
        });
    }
    static BundleAll(files, filesRegistry = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let resultsPromises = files.map(file => this.Bundle(file, filesRegistry));
            return yield Promise.all(resultsPromises);
        });
    }
    static bundle(filePath, content, filesRegistry) {
        return __awaiter(this, void 0, void 0, function* () {
            if (filesRegistry == null) {
                filesRegistry = {};
            }
            // Remove commented imports
            content = content.replace(COMMENTED_IMPORT_PATTERN, "");
            // Resolve path to work only with full paths
            filePath = path.resolve(filePath);
            let dirname = path.dirname(filePath);
            if (filesRegistry[filePath] == null) {
                filesRegistry[filePath] = content;
            }
            let importsPromises = Helpers.getAllMatches(content, IMPORT_PATTERN).map((match) => __awaiter(this, void 0, void 0, function* () {
                let importName = match[1];
                // Append extension if it's absent
                if (importName.indexOf(FILE_EXTENSION) === -1) {
                    importName += FILE_EXTENSION;
                }
                let fullPath = path.resolve(dirname, importName);
                let importData = {
                    importString: match[0],
                    path: importName,
                    fullPath: fullPath,
                    found: false
                };
                try {
                    yield fs.access(fullPath);
                    importData.found = true;
                }
                catch (error) {
                    let underscoredDirname = path.dirname(fullPath);
                    let underscoredBasename = path.basename(fullPath);
                    let underscoredFilePath = path.join(underscoredDirname, `_${underscoredBasename}`);
                    try {
                        yield fs.access(underscoredFilePath);
                        importData.fullPath = underscoredFilePath;
                        importData.found = true;
                    }
                    catch (underscoreErr) {
                        // Neither file, nor partial was found
                    }
                }
                return importData;
            }));
            let imports = yield Promise.all(importsPromises);
            let allImports = [];
            for (let imp of imports) {
                let contentToReplace;
                if (!imp.found) {
                    allImports.push({
                        filePath: imp.fullPath,
                        found: false
                    });
                }
                else if (filesRegistry[imp.fullPath] == null) {
                    let impContent = yield fs.readFile(imp.fullPath, "utf-8");
                    let bundledImport = yield this.bundle(imp.fullPath, impContent);
                    filesRegistry[imp.fullPath] = bundledImport.content;
                    allImports.push(bundledImport);
                }
                contentToReplace = filesRegistry[imp.fullPath];
                if (contentToReplace == null) {
                    contentToReplace = `/*** IMPORTED FILE NOT FOUND ***/${os.EOL}${imp.importString}/*** --- ***/`;
                }
                content = content.replace(imp.importString, contentToReplace);
            }
            return {
                content: content,
                filePath: filePath,
                imports: allImports,
                found: true
            };
        });
    }
}
exports.Bundler = Bundler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix5QkFBeUI7QUFDekIsNkJBQTZCO0FBRTdCLHFDQUFxQztBQUVyQyxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQUNoRCxNQUFNLHdCQUF3QixHQUFHLHNCQUFzQixDQUFDO0FBQ3hELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQztBQW9CL0I7SUFDVyxNQUFNLENBQU8sTUFBTSxDQUFDLElBQVksRUFBRSxnQkFBMEIsRUFBRTs7WUFDakUsSUFBSSxDQUFDO2dCQUNELE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEIsSUFBSSxPQUFPLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDL0MsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDNUMsQ0FBQztZQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsTUFBTSxDQUFDO29CQUNILFFBQVEsRUFBRSxJQUFJO29CQUNkLEtBQUssRUFBRSxLQUFLO2lCQUNmLENBQUM7WUFDTixDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRU0sTUFBTSxDQUFPLFNBQVMsQ0FBQyxLQUFlLEVBQUUsZ0JBQTBCLEVBQUU7O1lBQ3ZFLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDMUUsTUFBTSxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM5QyxDQUFDO0tBQUE7SUFFTyxNQUFNLENBQU8s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ZnJvbSBcIm16L2ZzXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcblxyXG5pbXBvcnQgKiBhcyBIZWxwZXJzIGZyb20gXCIuL2hlbHBlcnNcIjtcclxuXHJcbmNvbnN0IElNUE9SVF9QQVRURVJOID0gL0BpbXBvcnQgWydcIl0oLispWydcIl07L2c7XHJcbmNvbnN0IENPTU1FTlRFRF9JTVBPUlRfUEFUVEVSTiA9IC9cXC9cXC9AaW1wb3J0ICcoLispJzsvZztcclxuY29uc3QgRklMRV9FWFRFTlNJT04gPSBcIi5zY3NzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlZ2lzdHJ5IHtcclxuICAgIFtpZDogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydERhdGEge1xyXG4gICAgaW1wb3J0U3RyaW5nOiBzdHJpbmc7XHJcbiAgICBwYXRoOiBzdHJpbmc7XHJcbiAgICBmdWxsUGF0aDogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlUmVzdWx0IHtcclxuICAgIGltcG9ydHM/OiBCdW5kbGVSZXN1bHRbXTtcclxuICAgIGZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgICBjb250ZW50Pzogc3RyaW5nO1xyXG4gICAgZm91bmQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCdW5kbGVyIHtcclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgQnVuZGxlKGZpbGU6IHN0cmluZywgZmlsZXNSZWdpc3RyeTogUmVnaXN0cnkgPSB7fSk6IFByb21pc2U8QnVuZGxlUmVzdWx0PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGZpbGUpO1xyXG4gICAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGZpbGUsIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJ1bmRsZShmaWxlLCBjb250ZW50KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6IGZpbGUsXHJcbiAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBCdW5kbGVBbGwoZmlsZXM6IHN0cmluZ1tdLCBmaWxlc1JlZ2lzdHJ5OiBSZWdpc3RyeSA9IHt9KTogUHJvbWlzZTxCdW5kbGVSZXN1bHRbXT4ge1xyXG4gICAgICAgIGxldCByZXN1bHRzUHJvbWlzZXMgPSBmaWxlcy5tYXAoZmlsZSA9PiB0aGlzLkJ1bmRsZShmaWxlLCBmaWxlc1JlZ2lzdHJ5KSk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IFByb21pc2UuYWxsKHJlc3VsdHNQcm9taXNlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgYnVuZGxlKGZpbGVQYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZywgZmlsZXNSZWdpc3RyeT86IFJlZ2lzdHJ5KTogUHJvbWlzZTxCdW5kbGVSZXN1bHQ+IHtcclxuICAgICAgICBpZiAoZmlsZXNSZWdpc3RyeSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGZpbGVzUmVnaXN0cnkgPSB7fTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSBjb21tZW50ZWQgaW1wb3J0c1xyXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoQ09NTUVOVEVEX0lNUE9SVF9QQVRURVJOLCBcIlwiKTtcclxuXHJcbiAgICAgICAgLy8gUmVzb2x2ZSBwYXRoIHRvIHdvcmsgb25seSB3aXRoIGZ1bGwgcGF0aHNcclxuICAgICAgICBmaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgIGxldCBkaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgaWYgKGZpbGVzUmVnaXN0cnlbZmlsZVBhdGhdID09IG51bGwpIHtcclxuICAgICAgICAgICAgZmlsZXNSZWdpc3RyeVtmaWxlUGF0aF0gPSBjb250ZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGltcG9ydHNQcm9taXNlcyA9IEhlbHBlcnMuZ2V0QWxsTWF0Y2hlcyhjb250ZW50LCBJTVBPUlRfUEFUVEVSTikubWFwKGFzeW5jIG1hdGNoID0+IHtcclxuICAgICAgICAgICAgbGV0IGltcG9ydE5hbWUgPSBtYXRjaFsxXTtcclxuICAgICAgICAgICAgLy8gQXBwZW5kIGV4dGVuc2lvbiBpZiBpdCdzIGFic2VudFxyXG4gICAgICAgICAgICBpZiAoaW1wb3J0TmFtZS5pbmRleE9mKEZJTEVfRVhURU5TSU9OKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGltcG9ydE5hbWUgKz0gRklMRV9FWFRFTlNJT047XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGRpcm5hbWUsIGltcG9ydE5hbWUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGltcG9ydERhdGE6IEltcG9ydERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnRTdHJpbmc6IG1hdGNoWzBdLFxyXG4gICAgICAgICAgICAgICAgcGF0aDogaW1wb3J0TmFtZSxcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoOiBmdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgIGZvdW5kOiBmYWxzZVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGZzLmFjY2VzcyhmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxldCB1bmRlcnNjb3JlZERpcm5hbWUgPSBwYXRoLmRpcm5hbWUoZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHVuZGVyc2NvcmVkQmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgICAgIGxldCB1bmRlcnNjb3JlZEZpbGVQYXRoID0gcGF0aC5qb2luKHVuZGVyc2NvcmVkRGlybmFtZSwgYF8ke3VuZGVyc2NvcmVkQmFzZW5hbWV9YCk7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLmFjY2Vzcyh1bmRlcnNjb3JlZEZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZ1bGxQYXRoID0gdW5kZXJzY29yZWRGaWxlUGF0aDtcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnREYXRhLmZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHVuZGVyc2NvcmVFcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBOZWl0aGVyIGZpbGUsIG5vciBwYXJ0aWFsIHdhcyBmb3VuZFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW1wb3J0RGF0YTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IGltcG9ydHMgPSBhd2FpdCBQcm9taXNlLmFsbChpbXBvcnRzUHJvbWlzZXMpO1xyXG4gICAgICAgIGxldCBhbGxJbXBvcnRzOiBCdW5kbGVSZXN1bHRbXSA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGltcCBvZiBpbXBvcnRzKSB7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50VG9SZXBsYWNlO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFpbXAuZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIGFsbEltcG9ydHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGltcC5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBmb3VuZDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpbGVzUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW1wQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGltcC5mdWxsUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgICAgIGxldCBidW5kbGVkSW1wb3J0ID0gYXdhaXQgdGhpcy5idW5kbGUoaW1wLmZ1bGxQYXRoLCBpbXBDb250ZW50KTtcclxuICAgICAgICAgICAgICAgIGZpbGVzUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXSA9IGJ1bmRsZWRJbXBvcnQuY29udGVudDtcclxuICAgICAgICAgICAgICAgIGFsbEltcG9ydHMucHVzaChidW5kbGVkSW1wb3J0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29udGVudFRvUmVwbGFjZSA9IGZpbGVzUmVnaXN0cnlbaW1wLmZ1bGxQYXRoXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb250ZW50VG9SZXBsYWNlID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRUb1JlcGxhY2UgPSBgLyoqKiBJTVBPUlRFRCBGSUxFIE5PVCBGT1VORCAqKiovJHtvcy5FT0x9JHtpbXAuaW1wb3J0U3RyaW5nfS8qKiogLS0tICoqKi9gO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKGltcC5pbXBvcnRTdHJpbmcsIGNvbnRlbnRUb1JlcGxhY2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY29udGVudDogY29udGVudCxcclxuICAgICAgICAgICAgZmlsZVBhdGg6IGZpbGVQYXRoLFxyXG4gICAgICAgICAgICBpbXBvcnRzOiBhbGxJbXBvcnRzLFxyXG4gICAgICAgICAgICBmb3VuZDogdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn1cclxuIl19