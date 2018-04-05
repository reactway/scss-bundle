import * as path from "path";
import { Launcher } from "../src/launcher";

(async () => {
    const launcher = new Launcher({
        Destination: "./good.scss",
        Entry: "./cases/tilde-import/main.scss",
        ProjectDirectory: "./cases/tilde-import",
        Verbosity: 256
    });
    await launcher.Bundle();
})();
