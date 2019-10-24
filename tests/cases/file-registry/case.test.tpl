import path from "path";
import { Bundler } from "@src/bundler";

test("{{caseName}}", async done => {
    const projectDirectory = "{{projectDirectory}}";
    const testConfig = {{{json testConfig}}};
    const entryFile = path.join(projectDirectory, testConfig.entry);

    const fileRegistry = Object.assign(
      {},
      ...testConfig.registries.map((registry) => ({
        [path.join(projectDirectory, registry.path)]: registry.content
      }))
    );

    try {
        const bundleResult = await new Bundler(fileRegistry, projectDirectory)
            .bundle(entryFile);

        expect(bundleResult.bundledContent).toMatchSnapshot();
        done();
    } catch (error) {
        done.fail(error);
    }
});
