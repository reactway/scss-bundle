import * as path from "path";
import { Bundler } from "@src/bundler";

test("{{caseName}}", async done => {
    const projectDirectory = "{{projectDirectory}}";
    const testConfig = {{{json testConfig}}};

    try {
        const bundleResult = await new Bundler()
            .Bundle(path.join(projectDirectory, testConfig.Entry));

        expect(bundleResult).toMatchSnapshot();
        done();
    } catch (error) {
        done.fail(error);
    }
});
