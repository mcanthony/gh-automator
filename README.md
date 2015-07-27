# GH Automator

[![NPM version](http://img.shields.io/npm/v/gh-boilerplate.svg?style=flat)](http://npmjs.org/gh-boilerplate)
[![NPM downloads](http://img.shields.io/npm/dm/gh-boilerplate.svg?style=flat)](http://npmjs.org/gh-boilerplate)
[![Build Status](http://img.shields.io/travis/node-gh/gh-boilerplate/master.svg?style=flat)](https://travis-ci.org/node-gh/gh-boilerplate)
[![Dependencies Status](http://img.shields.io/david/node-gh/gh-boilerplate.svg?style=flat)](https://david-dm.org/node-gh/gh-boilerplate)
[![DevDependencies Status](http://img.shields.io/david/dev/node-gh/gh-boilerplate.svg?style=flat)](https://david-dm.org/node-gh/gh-boilerplate#info=devDependencies)

![Electrocat](https://octodex.github.com/images/electrocat.png)

NodeGH plugin for automating git processes :)

> Maintained by [Dustin Ryerson](https://github.com/dustinryerson).

## Install

```
[sudo] npm install -g gh gh-boilerplate
```

## Usage

```
gh automator
```

> **Alias:** `gh at`

### 1. Cherry-pick fix

Option             | Usage        | Type
---                | ---          | ---
`-b`, `--branch` | **Required** | `String`
`-cpf`, `--cherrypickfix`      | **Required** | `Boolean`
`-pcm`, `--printcommitmessage` | **Required** | `Boolean`
`-prb`, `--prbranch`, | **Optional** | `String`
`-t`, `--ticket` | **Required** | `String`
`-s`, `--submit`, | **Optional** | `Boolean`
`-u`, `--user` | **Optional** | `String`

#### Examples

* Attempts to cherry-pick commits for LPS-12345 from the **master** branch to the current branch.

	```
gh at -cpf --ticket LPS-12345 --branch master
	```
	* Shorthand version:
	```
gh at -cpf -t LPS-12345 -b master
	```

* Attempts to cherry-pick commits for LPS-12345 from the **master** branch to the current branch and sends a pull request to githubUsername's ee-6.2.x branch if successful

	```
gh at -cpf --ticket LPS-12345 --branch master --submit --user githubUsername --prbranch ee-6.2.x
	```
	* Shorthand version:
	```
gh at -cpf -t LPS-12345 -b master -s -u githubUserName -prb ee-6.2.x
	```

### 2. Print commit message

Option             | Usage        | Type
---                | ---          | ---
`-pcm`, `--printcommitmessage` | **Required** | `Boolean`
`-t`, `--ticket` | **Required** | `String`

#### Examples

* Prints all commit messages containing the LPS number entered

	```
gh at -pcm --ticket LPS-12345
	```
	* Shorthand version:
	```
gh at -pcm -t LPS-12345
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
