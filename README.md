# scss-bundle

Bundles all SCSS imports into a single file recursively.

[![NPM version](https://img.shields.io/npm/v/scss-bundle.svg?logo=npm)](https://www.npmjs.com/package/scss-bundle)
[![NPM version](https://img.shields.io/npm/v/scss-bundle/canary.svg?logo=npm)](https://www.npmjs.com/package/scss-bundle/v/canary)

[![Total downloads](https://img.shields.io/npm/dt/scss-bundle.svg)](https://www.npmjs.com/package/scss-bundle)
[![Build Status](https://img.shields.io/azure-devops/build/reactway/reactway/13/master.svg?logo=azuredevops)](https://dev.azure.com/reactway/ReactWay/_build/latest?definitionId=13&branchName=master)
[![Code coverage](https://img.shields.io/azure-devops/coverage/reactway/reactway/13/master.svg)](https://dev.azure.com/reactway/ReactWay/_build/latest?definitionId=13&branchName=master)

[![Dependencies](https://img.shields.io/david/reactway/tiny-emitter.svg)](https://david-dm.org/reactway/scss-bundle)
[![Dev dependencies](https://img.shields.io/david/dev/reactway/tiny-emitter.svg)](https://david-dm.org/reactway/scss-bundle?type=dev)

### Who uses `scss-bundle`

#### Projects

-   [Angular/material2](https://github.com/angular/material2)
-   [Grassy](https://github.com/lazarljubenovic/grassy)

#### Community plugins

-   [rollup-plugin-bundle-scss](https://github.com/weizhenye/rollup-plugin-bundle-scss)

## Get started

If you want to use `scss-bundle` globally

```sh
$ npm install scss-bundle -g
```

Latest dev build is published under `canary` tag.

```sh
$ npm install scss-bundle@canary
```

To start using the tool, create a [config](#example-config) file and run command:

```
$ scss-bundle
```

It will bundle all scss files in specified `outFile` location.

## CLI Usage

```sh
$ scss-bundle -h
```

## Configuration

Config file properties can be overridden with CLI flags.

| CLI Flag                                | Bundler options          | Type     | Description                                                       | Values                                     | Default |
| --------------------------------------- | ------------------------ | -------- | ----------------------------------------------------------------- | ------------------------------------------ | ------- |
| -c, --config \<path\>                   |                          | string   | Configuration file location.                                      |                                            |         |
| -p, --project \<path\>                  | project                  | string   | Project location where `node_modules` is located.                 |                                            |         |
| -e, --entryFile \<path\> <sup>`*`</sup> | entryFile <sup>`*`</sup> | string   | Bundle entry file location.                                       |                                            |         |
| -o, --outFile \<path\> <sup>`*`</sup>   | outFile <sup>`*`</sup>   | string   | Bundle output location.                                           |                                            |         |
| --rootDir \<path\>                      | rootDir                  | string   | Specifies the root directory of input files.                      |                                            |         |
| -w, --watch [boolean]                   | watch                    | boolean  | Watch files for changes. Works with `rootDir`.                    |                                            |         |
| --ignoreImports \<list\>                | ignoreImports            | string[] | Ignore resolving import content by matching a regular expression. |                                            |         |
| --includePaths \<list\>                 | includePaths             | string[] | Include paths for resolving imports.                              |                                            |         |
| --dedupeGlobs \<list\>                  | dedupeGlobs              | string[] | Files that will be emitted in a bundle once.                      |                                            |         |
| --logLevel \<level\>                    | logLevel                 | string   | Console log level.                                                | silent, error, warning, info, debug, trace | info    |

`*` - Required

### Example config

Default name for configuration is `scss-bundle.config.json`.

```json
{
    "bundlerOptions": {
        "entryFile": "./tests/cases/simple/main.scss",
        "rootDir": "./tests/cases/simple/",
        "outFile": "./bundled.scss",
        "ignoreImports": ["~@angular/.*"],
        "logLevel": "silent"
    }
}
```

## Non-CLI usage

### Simple example

```typescript
import path from "path";
import { Bundler } from "scss-bundle";

(async () => {
    // Absolute project directory path.
    const projectDirectory = path.resolve(__dirname, "./cases/tilde-import");
    const bundler = new Bundler(undefined, projectDirectory);
    // Relative file path to project directory path.
    const result = await bundler.bundle("./main.scss");
})();
```

# API

## Bundler

```typescript
import { Bundler } from "scss-bundle";
```

### Constructor

```ts
constructor(fileRegistry: FileRegistry = {}, projectDirectory?: string) {}
```

##### Arguments

-   `fileRegistry?:` [Registry](#registry) - Dictionary of files contents by full path
-   `projectDirectory?: string` - Absolute project location, where `node_modules` are located. Used for resolving tilde imports

### Methods

#### bundle

```typescript
public async bundle(file: string, fileRegistry: Registry = {}): Promise<BundleResult>
```

##### Arguments

-   `file: string` - Main file full path
-   `fileRegistry:` [Registry](#registry) - Dictionary of files contents by full path

##### Returns

`Promise<`[BundleResult](#bundleresult)`>`

### Contracts

#### BundleResult

```typescript
import { BundleResult } from "scss-bundle";
```

```typescript
interface BundleResult {
    imports?: BundleResult[];
    tilde?: boolean;
    filePath: string;
    content?: string;
    found: boolean;
}
```

##### Properties

-   `imports:` [BundleResult](#bundleresult)`[]` - File imports array
-   `tilde?: boolean` - Used tilde import
-   `filePath: string` - Full file path
-   `content: string` - File content
-   `found: boolean` - Is file found

#### Registry

```typescript
import { Registry } from "scss-bundle";
```

```typescript
interface Registry {
    [id: string]: string | undefined;
}
```

##### Key

`id: string` - File full path as dictionary id

##### Value

`string | undefined` - File content

## License

Released under the [MIT license](LICENSE).
