# scss-bundle

Bundles all SCSS imports into a single file recursively.

[![Build Status](https://travis-ci.org/SimplrJS/scss-bundle.svg?branch=master)](https://travis-ci.org/SimplrJS/scss-bundle)
[![NPM version](http://img.shields.io/npm/v/scss-bundle.svg)](https://www.npmjs.com/package/scss-bundle) 
[![npm (tag)](https://img.shields.io/npm/v/scss-bundle/next.svg)](https://www.npmjs.com/package/scss-bundle)
[![dependencies Status](https://david-dm.org/simplrjs/scss-bundle/status.svg)](https://david-dm.org/simplrjs/scss-bundle) 
[![devDependencies Status](https://david-dm.org/simplrjs/scss-bundle/dev-status.svg)](https://david-dm.org/simplrjs/scss-bundle?type=dev)

### Who uses `scss-bundle`

A few of the projects who use the package:

*   [Angular/material2](https://github.com/angular/material2)
*   [Grassy](https://github.com/lazarljubenovic/grassy)
*   [Copictures](https://copictures.com)

## Get started

If you want to use `scss-bundle` globally

```sh
$ npm install scss-bundle -g
```

Latest pre-release is published under `next` tag.

```sh
$ npm install scss-bundle@next
```

## CLI Usage

```sh
$ scss-bundle -h
```

### Examples

_Without config file:_

If you want to use `scss-bundle` without configuration file, `entry` and `dest` arguments are required.

```sh
$ scss-bundle -e ./src/main.scss -d bundled.scss
```

Or specifying output `verbosity` level.

```sh
$ scss-bundle -e ./src/main.scss -d bundled.scss --verbosity Errors
```

_With config file:_

```sh
$ scss-bundle -c scss-bundle.config.json
```

## Config example

```json
{
    "entry": "./src/main.scss",
    "dest": "bundled.scss"
}
```

| CLI Flag                   | Argument             | Type           | Description                                                       | Values                | Default |
| -------------------------- | -------------------- | -------------- | ----------------------------------------------------------------- | --------------------- | ------- |
| --entry, -e <sup>`*`</sup> | entry <sup>`*`</sup> | string         | Main entry file where to start bundling.                          |                       |         |
| --dest, -d <sup>`*`</sup>  | dest <sup>`*`</sup>  | string         | Destination file when bundling is done.                           |                       |         |
| --watch, -w                | watch                | string         | Path that will be watched.                                        |                       |         |
| --verbosity                | verbosity            | string choices | Destination file when bundling is done.                           | None, Errors, Verbose | Verbose |
| --includePaths             | includePaths         | array          | Include paths for resolving imports                               |                       |         |
| --project, -p              | project              | string         | Project location, where `node_modules` are located.               |                       |         |
| --ignoredImports           | ignoredImports       | array          | Ignore resolving import content by matching a regular expression. |                       |         |
| --watch, -w                | watch                | boolean        | Watch files for changes.                                          |                       |         |

`*` - Required

## Output verbosity

CLI option `verbosity` is used to control how much output you get. By default, you will get `Verbose` level of verbosity with the most output.

| Value   | Description                                                                    |
| ------- | ------------------------------------------------------------------------------ |
| None    | Produces no output, only process success/error return code.                    |
| Errors  | Outputs all errors and skips any additional information.                       |
| Verbose | Outputs the most information. This is the `default` value for verbosity level. |

## Non-CLI usage

### Simple example

```typescript
import * as path from "path";
import { Bundler } from "scss-bundle";

(async () => {
    // Absolute project directory path.
    const projectDirectory = path.resolve(__dirname, "./cases/tilde-import");
    const bundler = new Bundler(undefined, projectDirectory);
    // Relative file path to project directory path.
    const result = await bundler.Bundle("./main.scss");
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

*   `fileRegistry?:` [Registry](#registry) - Dictionary of files contents by full path
*   `projectDirectory?: string` - Absolute project location, where `node_modules` are located. Used for resolving tilde imports

### Methods

#### Bundle

```typescript
public static async Bundle(file: string, fileRegistry: Registry = {}): Promise<BundleResult>
```

##### Arguments

*   `file: string` - Main file full path
*   `fileRegistry:` [Registry](#registry) - Dictionary of files contents by full path

##### Returns

`Promise<`[BundleResult](#bundleresult)`>`

#### BundleAll

```typescript
public static async BundleAll(files: string[], fileRegistry: Registry = {}): Promise<BundleResult[]>
```

##### Arguments

*   `files: string[]` - Array of full path files
*   `fileRegistry:`[Registry](#registry) - Dictionary of files contents by full path

##### Returns

`Promise<`[BundleResult](#bundleresult)`[]>`

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

*   `imports:` [BundleResult](#bundleresult)`[]` - File imports array
*   `tidle?: boolean` - Used tilde import
*   `filePath: string` - Full file path
*   `content: string` - File content
*   `found: boolean` - Is file found

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
