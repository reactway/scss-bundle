import * as path from "path";
import { Launcher } from "../src/launcher";

(async () => {
    const launcher = new Launcher({
        Destination: "",
        Entry: "./cases/tilde-import/main.scss",
        Verbosity: 256
    });
    await launcher.Bundle();
})();
