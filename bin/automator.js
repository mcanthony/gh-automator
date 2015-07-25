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
var exec = require(GH_PATH + 'lib/exec'),
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
        'printcommitmessages',
        'cherrypickfix'
    ],
    description: 'NodeGH plugin to automate git processes.',
    options: {
        'branch': String,
        'cherrypickfix': Boolean,
        'printcommitmessages': Boolean,
        'prbranch': String,
        'submit': Boolean,
        'ticket': String,
        'user': String
    },
    shorthands: {
        'b': [  '--branch' ],
        'cpf': [ '--cherrypickfix' ],
        'pcm': [ '--printcommitmessages' ],
        'prb': [  '--prbranch'],
        's': [  '--submit'],
        't': [  '--ticket'],
        'u': [  '--user']
    },
    payload: function(payload, options) {
        if (options.printcommitmessages) {
            options.printcommitmessages = true;

            options.ticket = payload[0];
        }

        if (options.cherrypickfix) {
            options.cherrypickfix = true;

            if (options.ticket) {
                options.ticket = payload[0];
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
    }
};

// -- Commands -----------------------------------------------------------------
Automator.prototype.run = function() {
    var instance = this,
        options = instance.options;

    if (options.printcommitmessages) {
        instance.printCommitMessages(options.ticket);
    }

    if (options.cherrypickfix) {
        instance.cherryPickFix(options.ticket, options.branch, options.user, options.prbranch);
    }
};

Automator.prototype.cherryPickFix = function(ticket, branch, user, prbranch) {
    var args = ['log'],
        cherryPickResult,
        git,
        gitHashes,
        gitHashesArray,
        instance = this;

    args.push('--pretty=%H', '--grep', ticket);

    if (branch) {
        args.push(branch);
    }

    git = exec.spawnSync(git_command, args);

    gitHashes = git.stdout;

    gitHashesArray = gitHashes.split('\n').reverse();

    git_util.createBranch(ticket);

    for (var i = 0; i < gitHashesArray.length; i++) {
        cherryPickResult = git_util.cherryPickCommit(gitHashesArray[i]);

        if (cherryPickResult.status !== 0) {
            break;
        }
    }

    if (git.status !== 0) {
        logger.error(git.stderr);
    }
    else if (cherryPickResult.status !== 0) {
        instance.handleFailedCherryPick(cherryPickResult);
    }
    else {
        logger.log('\nSuccessful cherry-pick!');

        if (user && prbranch) {
            git_util.sendPullRequest(user, prbranch);
        }
    }
};

Automator.prototype.handleFailedCherryPick = function(git) {
    var conflictingFiles,
        conflictingFilesArray,
        file,
        instance = this,
        logCurrentBranchResults,
        logMasterResults;

    conflictingFiles = git_util.gitStatus();

    conflictingFiles = conflictingFiles.stdout;

    conflictingFilesArray = conflictingFiles.split('\n');

    for (var i = 0; i < conflictingFilesArray.length; i++) {
        // Remove the status code preceding the file path
        file = conflictingFilesArray[i].substring(3, i.length);

        logger.log('\nConflicting file: ' + file);

        logMasterResults = git_util.gitLogFile(file, 'master');
        logCurrentBranchResults = git_util.gitLogFile(file);

        logger.log('\nLog on master branch for ' + file + ':\n' + logMasterResults.stdout);
        logger.log('\nLog on current branch for ' + file + ':\n' + logCurrentBranchResults.stdout);

        instance.parseCommitMessages(logMasterResults.stdout, logCurrentBranchResults.stdout);
    }
};

Automator.prototype.parseCommitMessages = function(commitMessagesMasterBranch, commitMessagesCurrentBranch) {
    var commitMessagesCurrentBranchArray,
        commitMessagesCurrentBranchTicketNumber,
        commitMessagesCurrentBranchTicketNumberArray = [],
        commitMessagesMasterBranchTicketNumber,
        commitMessagesMasterBranchTicketNumberArray = [],
        commitMessagesMasterBranchArray,
        parsedResults,
        newerCommitsArray = [];

    commitMessagesMasterBranchArray = commitMessagesMasterBranch.split('\n');
    commitMessagesCurrentBranchArray = commitMessagesCurrentBranch.split('\n');

    console.log();
    for (var i = 0; i < commitMessagesMasterBranchArray.length; i++) {
        commitMessagesMasterBranchTicketNumber = commitMessagesMasterBranchArray[i].substring(0, 9);

        commitMessagesMasterBranchTicketNumberArray.push(commitMessagesMasterBranchTicketNumber);

        logger.log('Master branch LPS list: ' + commitMessagesMasterBranchTicketNumber);
    }

    console.log();
    for (var j = 0; j < commitMessagesCurrentBranchArray.length; j++) {
        commitMessagesCurrentBranchTicketNumber = commitMessagesCurrentBranchArray[j].substring(0, 9);

        commitMessagesCurrentBranchTicketNumberArray.push(commitMessagesCurrentBranchTicketNumber);

        logger.log('Current branch LPS list: ' + commitMessagesCurrentBranchTicketNumber);
    }


    for (var k = 0; k < 10; k++) {
        if (commitMessagesMasterBranchTicketNumberArray[k] == commitMessagesCurrentBranchTicketNumberArray[0]) {
            console.log();

            for (var l = k - 1; l >= 0; l--) {
                if (commitMessagesMasterBranchTicketNumberArray[l] != commitMessagesMasterBranchTicketNumberArray[l + 1]) {
                    newerCommitsArray.push(commitMessagesMasterBranchTicketNumberArray[l]);
                    logger.log('Unique commit: ' + commitMessagesMasterBranchTicketNumberArray[l]);
                }
            }

            break;
        }
    }
};

Automator.prototype.printCommitMessages = function(ticket) {
    var args = ['log'],
        commitMessages,
        commitMessagesArray,
        git;

    if (!ticket || ticket == '') {
        logger.log('Cannot print commit messages.');
    }

    args.push('--pretty=%s', '--grep', ticket);

    git = exec.spawnSync(git_command, args);

    if (git.status !== 0) {
        logger.log('Cannot print commit message for ' + ticket + '.');
    }

    commitMessages = git.stdout;

    commitMessagesArray = commitMessages.split('\n').reverse();

    for (var i = 0; i < commitMessagesArray.length; i++) {
        logger.log(commitMessagesArray[i]);
    }
};

exports.Impl = Automator;