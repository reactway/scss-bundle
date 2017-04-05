scss-bundle
===========
[![NPM version](http://img.shields.io/npm/v/scss-bundle.svg)](https://www.npmjs.com/package/scss-bundle) [![dependencies Status](https://david-dm.org/simplrjs/scss-bundle/status.svg)](https://david-dm.org/simplrjs/scss-bundle) [![devDependencies Status](https://david-dm.org/simplrjs/scss-bundle/dev-status.svg)](https://david-dm.org/simplrjs/scss-bundle?type=dev)

## Get started
If you want to use `scss-bundle` globally
```sh
$ npm install scss-bundle -g
```

## Features
- Bundles all SCSS imports into a single file.

## Usage
```sh
$ scss-bundle -h
```

### Examples
_Using config:_
```sh
$ scss-bundle -c scss-bundle.config.json
```
_Without config:_

If you want to use `scss-bundle` without configuration file, `entry` and `dest` arguments are required.
```sh
$ scss-bundle -e ./src/main.scss -d bundled.scss
```

## Config example
```json
{
    "entry": "./src/main.scss",
    "dest": "bundled.scss"
}
```

| Argument  | Type   | Description                                      | Values                | Default |
|-----------|--------|--------------------------------------------------|                       |         |
| entry<sup>`*`</sup>  | string | Main entry file where to start bundling.         |                       |         |
| dest<sup>`*`</sup>   | string | Destination file when bundling is done.          |                       |         |
| verbosity | string choices | Destination file when bundling is done.  | None, Errors, Verbose | Verbose |

`*` - Required

## License
Released under the [MIT license](LICENSE).
