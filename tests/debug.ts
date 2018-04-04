import * as path from "path";
import { Bundler } from "../src/bundler";

(async () => {
    const bundler = new Bundler({}, path.resolve(__dirname, "./cases/tilde-import"));
    await bundler.Bundle("./cases/tilde-import/main.scss");
})();
