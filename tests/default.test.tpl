import path from "path";
import { Bundler } from "@src/bundler";

test("{{caseName}}", async done => {
    const projectDirectory = "{{projectDirectory}}";
    const testConfig = {{{json testConfig}}};
    const entryFile = path.join(projectDirectory, testConfig.entry);

    try {
        const bundleResult = await new Bundler(undefined, projectDirectory)
            .bundle(entryFile);

        expect(bundleResult.bundledContent).toMatchSnapshot();
        done();
    } catch (error) {
        done.fail(error);
    }
});
