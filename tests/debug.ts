import * as path from "path";
import { Bundler } from "../src/bundler";

(async () => {
    // Absolute project directory path.
    const projectDirectory = path.resolve(__dirname, "./cases/tilde-import");
    const bundler = new Bundler(undefined, projectDirectory);
    // Relative file path to project directory path.
    const result = await bundler.Bundle("./main.scss");
})();
