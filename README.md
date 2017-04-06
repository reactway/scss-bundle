# `scss-bundle`
Bundles all SCSS imports into a single file recursively.

[![Build Status](https://travis-ci.org/SimplrJS/scss-bundle.svg?branch=master)](https://travis-ci.org/SimplrJS/scss-bundle)
[![NPM version](http://img.shields.io/npm/v/scss-bundle.svg)](https://www.npmjs.com/package/scss-bundle) [![dependencies Status](https://david-dm.org/simplrjs/scss-bundle/status.svg)](https://david-dm.org/simplrjs/scss-bundle) [![devDependencies Status](https://david-dm.org/simplrjs/scss-bundle/dev-status.svg)](https://david-dm.org/simplrjs/scss-bundle?type=dev)

### Who uses `scss-bundle`
A few of the projects who use the package:
- [Angular/material2](https://github.com/angular/material2)
- [Grassy](https://github.com/lazarljubenovic/grassy)
- [Copictures](https://copictures.com)

## Get started
If you want to use `scss-bundle` globally
```sh
$ npm install scss-bundle -g
```

## Usage
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

| Argument             | Type   | Description                                         | Values                | Default |
|----------------------|--------|-----------------------------------------------------|-----------------------|---------|
| entry <sup>`*`</sup>  | string | Main entry file where to start bundling.            | ` `                   | ` `     |
| dest <sup>`*`</sup>   | string | Destination file when bundling is done.             | ` `                   | ` `     |
| verbosity            | string choices | Destination file when bundling is done.     | None, Errors, Verbose | Verbose |

`*` - Required

## Output verbosity
CLI option `verbosity` is used to control how much output you get. By default, you will get `Verbose` level of verbosity with the most output.

| Value   | Description                                                                |
|---------|----------------------------------------------------------------------------|
| None    | Produces no output, only process success/error return code.                |
| Errors  | Outputs all errors and skips any additional information.                   |
| Verbose | Outputs the most information. This is the `default` value for verbosity level. |

## License
Released under the [MIT license](LICENSE).
