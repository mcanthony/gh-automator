# GH Automator

[![NPM version](http://img.shields.io/npm/v/gh-boilerplate.svg?style=flat)](http://npmjs.org/gh-automator)
[![NPM downloads](http://img.shields.io/npm/dm/gh-boilerplate.svg?style=flat)](http://npmjs.org/gh-automator)
[![Build Status](http://img.shields.io/travis/node-gh/gh-boilerplate/master.svg?style=flat)](https://travis-ci.org/dustinryerson/gh-automator)
[![Dependencies Status](http://img.shields.io/david/node-gh/gh-boilerplate.svg?style=flat)](https://david-dm.org/node-gh/gh-boilerplate)
[![DevDependencies Status](http://img.shields.io/david/dev/node-gh/gh-boilerplate.svg?style=flat)](https://david-dm.org/node-gh/gh-boilerplate#info=devDependencies)

![Electrocat](https://octodex.github.com/images/electrocat.png)

NodeGH plugin for automating git processes :)

> Maintained by [Dustin Ryerson](https://github.com/dustinryerson).

## Install

```
[sudo] npm install -g gh-automator
```

## Usage

```
gh automator
```

> **Alias:** `gh at`

### 1. Cherry-pick fix

Option             | Usage        | Type
---                | ---          | ---
`-c`, `--cherrypickfix`      | **Required** | `Boolean`
`-r`, `--regex` | **Required** | `String`
`-b`, `--sourcebranch` | **Required** | `String`
`-s`, `--startinghash` | *Optional* | `String`
`-i`, `--uniqueissues` | *Optional* | `Boolean`
`-S`, `--submit` | *Optional* | `Boolean`
`-u`, `--user` | *Optional* | `String`
`-p`, `--prbranch` | *Optional* | `String`

#### Examples

* Attempts to cherry-pick commits where the commit message contains a regular expression (ie "LPS-12345") specified by the --regex option, from the branch specified by the --sourcebranch option, to the current branch. In the event of a failed cherry-pick the --startinghash and --uniqueissues options can be used.

	```
gh automator --cherrypickfix --regex LPS-12345 --sourcebranch master
	```
	* Shorthand version:
	```
gh at -c -r LPS-12345 -b master
	```

* Attempts to cherry-pick commits for LPS-12345 from the specified branch to the current branch and sends a pull request to githubUsername's ee-6.2.x branch if successful.

	```
gh automator --cherrypickfix --regex LPS-12345 --sourcebranch master --submit --user githubUsername --prbranch ee-6.2.x
	```
	* Shorthand version:
	```
gh at -c -r LPS-12345 -b master -S -u githubUserName -p ee-6.2.x
	```

### 2. Print commit messages

Option             | Usage        | Type
---                | ---          | ---
`-m`, `--printcommitmessage` | **Required** | `Boolean`
`-r`, `--regex` | **Required** | `String`
`-b`, `--sourcebranch` | *Optional* | `String`

#### Examples

* Prints all commit messages on the current branch containing the regular expression specified. A different branch can be specified by the --sourcebranch option.

	```
gh automator --printcommitmessage --regex LPS-12345
	```
	* Shorthand version:
	```
gh at -m -r LPS-12345
	```

## Testing

Check [Travis](https://travis-ci.org/node-gh/gh-boilerplate) for continous integration results.

* Run [JSHint](http://www.jshint.com/), a tool to detect errors and potential problems.

    ```
npm run-script lint
    ```

* Run [Mocha](http://visionmedia.github.io/mocha/), a unit test framework.

    ```
npm run-script test
    ```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

* v0.0.1 July 24, 2015
	* Start plugin using [gh-automator](https://github.com/dustinryerson/gh-automator)

## License

[BSD License](https://github.com/node-gh/gh/blob/master/LICENSE.md)
