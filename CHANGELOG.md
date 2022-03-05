# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

...

## [4.3.1] - 2022-03-05

### Fixed

- Connect options were being mutated, clones them instead (#268)

### Changed

- Dropped dependency on colors for chalk (#265)
- Updated test for information page

## [4.3.0] - 2022-01-17

### Fixed

- ngrok now returns an information and login page when you try to request an HTML site with a guest account, which broke the tests. Fixed the broken test and added one to specifically test the behaviour.
- Switched from decompress-zip to extract-zip to support Node 17
- Updated version of uuid to avoid install warnings

## [4.2.2] - 2021-09-06

### Fixed

- Got download type definitions correct


## [4.2.1] - 2021-09-06

### Fixed

- Added download type definitions to package

## [4.2.0] - 2021-09-06

### Changed

- Added `onTerminated` callback to notify users when the underlying ngrok
  process terminates

### Fixed

- TypeScript definition for the download function

## [4.1.0] - 2021-07-26

### Changed

- Exposes the `NgrokClientError` class

### Fixed

- Previously, if the ngrok log_format was set to JSON, `getProcess` would never resolve. This is fixed now. (#221)
- If the home directory download location isn't usable, the backup directory was defined wrong and the download would fail. The directory is now fixed. (#237)
- Avoids memory leaks caused by adding listeners to the `process` "exit" event over and over. (#240)

## [4.0.1] - 2021-04-05

### Fixed

- Trying to connect a new tunnel using a name would drop options like `binPath` as they were overwritten from the loaded config. [#220](https://github.com/bubenshchykov/ngrok/pull/220) changes the behaviour to merge passed options with the named tunnel options
- Avoids showing a terminal window on Windows when spawning ([#211](https://github.com/bubenshchykov/ngrok/pull/211))

## [4.0.0] - 2021-03-27

### Breaking changes

- Replaced the deprecated [request](https://www.npmjs.com/package/request) and [request-promise-native](https://www.npmjs.com/package/request-promise-native) with [got](https://www.npmjs.com/package/got)
- `ngrok.getApi()` will now return an `NgrokClient` object which has methods to call on the available [ngrok API methods](https://ngrok.com/docs#client-api-base)
- Revamped the exported types, there is now an `Ngrok` namespace under which most types now sit
- Added types for the `NgrokClient` responses

### Changed

- Changed CI from Travis to GitHub Actions
- Brought development dependencies up to date

### Fixed

- Passing a `name` option to `connect` now causes the module to read the ngrok config and retrieve a [named tunnel](https://ngrok.com/docs#tunnel-definitions) (fixes #197)


## [4.0.0-beta.4] - 2021-03-18

### Fixed

- Really fixed the location of the downloaded binary

## [4.0.0-beta.3] - 2021-01-17

### Fixed

- Moved the download.js file back to the top level, since it can be required individually.

## [4.0.0-beta.2] - 2021-01-17

### Fixed

- Corrected the file listing in package.json

## [4.0.0-beta.1] - 2021-01-17

### Changed

- Replaced the deprecated [request](https://www.npmjs.com/package/request) and [request-promise-native](https://www.npmjs.com/package/request-promise-native) with [got](https://www.npmjs.com/package/got)
- `ngrok.getApi()` will now return an `NgrokClient` object which has methods to call on the available [ngrok API methods](https://ngrok.com/docs#client-api-base)
- Revamped the exported types, there is now an `Ngrok` namespace under which most types now sit
- Added types for the `NgrokClient` responses
- Changed CI from Travis to GitHub Actions

### Fixed

- Passing a `name` option to `connect` now causes the module to read the ngrok config and retrieve a [named tunnel](https://ngrok.com/docs#tunnel-definitions) (fixes #197)

## [3.4.0] - 2020-12-22

Please see [commit logs](https://github.com/bubenshchykov/ngrok/commits/master) for updates prior to version 4.