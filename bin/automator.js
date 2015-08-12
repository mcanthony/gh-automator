#!/usr/bin/env node

/*
 * Copyright 2015, All Rights Reserved.
 *
 * Code licensed under the BSD License:
 * https://github.com/node-gh/gh/blob/master/LICENSE.md
 *
 * @author Dustin Ryerson <dustin.ryerson@liferay.com>
 */

// -- Environment --------------------------------------------------------------
var GH_PATH = process.env.GH_PATH;

// -- Requires -----------------------------------------------------------------
var automatorConfig = require('../gh-plugin.json'),
    exec = require(GH_PATH + 'lib/exec'),
    git_util = require('../lib/git'),
    git_command = process.env.GH_GIT_COMMAND || 'git',
    logger = require(GH_PATH + 'lib/logger');

// -- Constructor --------------------------------------------------------------
function Automator(options) {
    this.options = options;
}

// -- Constants ----------------------------------------------------------------
Automator.DETAILS = {
    alias: 'at',
    commands: [
        'cherrypickfix',
        'printcommitmessages'
    ],
    description: 'NodeGH plugin to automate git processes.',
    options: {
        'branch': String,
        'cherrypickfix': Boolean,
        'prbranch': String,
        'printcommitmessages': Boolean,
        'submit': Boolean,
        'regex': String,
        'user': String
    },
    shorthands: {
        'b': ['--branch'],
        'cpf': ['--cherrypickfix'],
        'pcm': ['--printcommitmessages'],
        'prb': ['--prbranch'],
        's': ['--submit'],
        'r': ['--regex'],
        'u': ['--user']
    },
    payload: function(payload, options) {
        if (options.cherrypickfix) {
            options.cherrypickfix = true;

            if (options.regex) {
                options.regex = payload[0];
            }

            if (options.branch) {
                options.branch = payload[1];
            }

            if (options.submit) {
                options.submit = true;

                if (options.user) {
                    options.user = payload[2];
                }

                if (options.prbranch) {
                    options.prbranch = payload[3];
                }
            }
        }

        if (options.printcommitmessages) {
            options.printcommitmessages = true;

            options.regex = payload[0];
        }
    }
};

// -- Commands -----------------------------------------------------------------
Automator.prototype.run = function() {
    var instance = this,
        options = instance.options;

    if (options.cherrypickfix) {
        instance.cherryPickFix(options.regex, options.branch, options.user, options.prbranch);
    }

    if (options.printcommitmessages) {
        instance.printCommitMessages(options.regex);
    }
};

Automator.prototype.cherryPickFix = function(regex, fromBranch, user, prbranch) {
    var args = ['log'],
        cherryPickResult,
        git,
        gitHashes,
        gitHashesArray,
        instance = this;

    args.push('--pretty=%h', '--grep', regex);

    if (fromBranch) {
        args.push(fromBranch);
    }

    git = exec.spawnSync(git_command, args);

    gitHashes = git.stdout;

    gitHashesArray = gitHashes.split('\n').reverse();

    //let the user create and checkout their own branch in case they want to use a custom branch name. then just cherry-pick to the current branch

    //git_util.createBranch(regex);

    //git_util.checkoutBranch(regex);

    for (var i = 0; i < gitHashesArray.length; i++) {
        logger.log('Cherry-picking commit ' + gitHashesArray[i]);

        cherryPickResult = git_util.cherryPickCommit(gitHashesArray[i]);

        if (cherryPickResult.status !== 0) {
            break;
        }
    }

    if (git.status !== 0) {
        logger.error(git.stderr);
    }
    else if (cherryPickResult.status !== 0) {
        instance.handleFailedCherryPick(fromBranch);
    }
    else {
        logger.log('\nSuccessful cherry-pick!');

        if (user && prbranch) {
            git_util.sendPullRequest(user, prbranch);
        }
    }
};

Automator.prototype.handleFailedCherryPick = function(fromBranch) {
    var commitsUniqueToFromBranch = [],
        conflictingFiles,
        conflictingFilesArray,
        file,
        instance = this,
        logCurrentBranchResults,
        logFromBranchResults;

    conflictingFiles = git_util.gitStatus();

    conflictingFiles = conflictingFiles.stdout;

    conflictingFilesArray = conflictingFiles.split('\n');

    for (var i = 0; i < conflictingFilesArray.length; i++) {
        // Remove the status code preceding the file path when running 'git status -s'
        file = conflictingFilesArray[i].substring(3, i.length);

        logger.log('\nConflicting file: ' + file);

        logCurrentBranchResults = git_util.gitLogFile(file);
        logFromBranchResults = git_util.gitLogFile(file, fromBranch);

        //logger.log('\nLog on current branch for ' + file + ':\n' + logCurrentBranchResults.stdout);
        //logger.log('\nLog on from branch for ' + file + ':\n' + logFromBranchResults.stdout);

        commitsUniqueToFromBranch = instance.parseCommitMessages(logCurrentBranchResults.stdout, logFromBranchResults.stdout);

        logger.log('The following issues have been committed to ' + file + ' on the ' + fromBranch + ' branch, but are not on your current branch:');

        for (var j = 0; j < commitsUniqueToFromBranch.length; j++) {
            logger.log(commitsUniqueToFromBranch[j]);
        }
    }
};

Automator.prototype.parseCommitMessages = function(commitMessagesCurrentBranch, commitMessagesFromBranch) {
    var commitMessagesCurrentBranchArray,
        commitMessagesCurrentBranchTicketNumber,
        commitMessagesCurrentBranchTicketNumberArray = [],
        commitMessagesFromBranchArray,
        commitMessagesFromBranchTicketNumber,
        commitMessagesFromBranchTicketNumberArray = [],
        commitsUniqueToFromBranch = [],
        parsedResults;

    commitMessagesCurrentBranchArray = commitMessagesCurrentBranch.split('\n');
    commitMessagesFromBranchArray = commitMessagesFromBranch.split('\n');

    //console.log();
    for (var j = 0; j < commitMessagesCurrentBranchArray.length; j++) {
        commitMessagesCurrentBranchTicketNumber = commitMessagesCurrentBranchArray[j].substring(0, 9);

        commitMessagesCurrentBranchTicketNumberArray.push(commitMessagesCurrentBranchTicketNumber);

        //logger.log('Current branch LPS list: ' + commitMessagesCurrentBranchTicketNumber);
    }

    //console.log();
    for (var i = 0; i < commitMessagesFromBranchArray.length; i++) {
        commitMessagesFromBranchTicketNumber = commitMessagesFromBranchArray[i].substring(0, 9);

        commitMessagesFromBranchTicketNumberArray.push(commitMessagesFromBranchTicketNumber);

        //logger.log('From branch LPS list: ' + commitMessagesFromBranchTicketNumber);
    }

    for (var k = 0; k < 10; k++) {
        if (commitMessagesFromBranchTicketNumberArray[k] == commitMessagesCurrentBranchTicketNumberArray[0]) {
            console.log();

            for (var l = k - 1; l >= 0; l--) {
                if (commitMessagesFromBranchTicketNumberArray[l] != commitMessagesFromBranchTicketNumberArray[l + 1]) {
                    commitsUniqueToFromBranch.push(commitMessagesFromBranchTicketNumberArray[l]);
                }
            }

            break;
        }
    }

    return commitsUniqueToFromBranch;
};

Automator.prototype.printCommitMessages = function(regex) {
    var args = ['log'],
        commitMessages,
        commitMessagesArray,
        git;

    if (!regex || regex == '') {
        logger.log('Cannot print commit messages.');
    }

    args.push('--pretty=%s', '--grep', regex);

    git = exec.spawnSync(git_command, args);

    if (git.status !== 0) {
        logger.log('Cannot print commit message for ' + regex + '.');
    }

    commitMessages = git.stdout;

    commitMessagesArray = commitMessages.split('\n').reverse();

    for (var i = 0; i < commitMessagesArray.length; i++) {
        logger.log(commitMessagesArray[i]);
    }
};

exports.Impl = Automator;