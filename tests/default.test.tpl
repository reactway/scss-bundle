import * as path from "path";
import { Bundler } from "@src/bundler";

test("{{caseName}}", async done => {
    const projectDirectory = "{{projectDirectory}}";
    const testConfig = {{{json testConfig}}};
    const entryFile = path.join(projectDirectory, testConfig.Entry);

    try {
        const bundleResult = await new Bundler()
            .BundleAll([entryFile]);

        expect(bundleResult[0].bundledContent).toMatchSnapshot();
        done();
    } catch (error) {
        done.fail(error);
    }
});
