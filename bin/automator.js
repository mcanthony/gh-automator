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
        'sourcebranch': String,
        'cherrypickfix': Boolean,
        'startinghash': String,
        'prbranch': String,
        'printcommitmessages': Boolean,
        'submit': Boolean,
        'regex': String,
        'user': String
    },
    shorthands: {
        'b': ['--sourcebranch'],
        'cpf': ['--cherrypickfix'],
        'sha': ['--startinghash'],
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

            if (options.sourcebranch) {
                options.sourcebranch = payload[1];
            }

            if (options.startinghash) {
                options.startinghash = payload[2];
            }

            if (options.submit) {
                options.submit = true;

                if (options.user) {
                    options.user = payload[3];
                }

                if (options.prbranch) {
                    options.prbranch = payload[4];
                }
            }
        }

        if (options.printcommitmessages) {
            options.printcommitmessages = true;

            options.regex = payload[0];

            if (options.sourcebranch) {
                options.sourcebranch = payload[1];
            }
        }
    }
};

// -- Commands -----------------------------------------------------------------
Automator.prototype.run = function() {
    var instance = this,
        options = instance.options;

    if (options.cherrypickfix) {
        instance.cherryPickFix(options.regex, options.sourcebranch, options.startinghash, options.user, options.prbranch);
    }

    if (options.printcommitmessages) {
        instance.printCommitMessages(options.regex, options.sourcebranch);
    }
};

Automator.prototype.cherryPickFix = function(regex, sourceBranch, startingHash, user, prBranch) {
    var cherryPickResult,
        instance = this;

    if (!sourceBranch) {
        logger.warn('A branch to cherry-pick from must be set with the -b option\n');
        return;
    }

     if (!regex) {
        logger.warn('A regular expression must be set with the -r option\n');
        return;
    }

    var args = ['log', '--reverse', '--pretty=%h', '--grep', regex, sourceBranch];

    var gitHashArray = exec.spawnSync(git_command, args).stdout.split('\n');

    var startCherryPicking = false;

    for (var i = 0; i < gitHashArray.length; i++) {
        if (startingHash == null) {
            startCherryPicking = true;
        }
        else if (startingHash == gitHashArray[i]) {
            startCherryPicking = true;
        }

        if (!startCherryPicking) {
            continue;
        }

        logger.log('Cherry-picking commit ' + gitHashArray[i]);

        cherryPickResult = git_util.cherryPickCommit(gitHashArray[i]);

        if (cherryPickResult.status !== 0) {
            instance.handleFailedCherryPick(sourceBranch);
            
            if ((i + 1) < gitHashArray.length) {
                logger.log('\nIf you are able to manually resolve the conflict you can continue the ' +
                    'cherry-picking process by re-running the previous command with the option -sha ' + gitHashArray[i + 1] + '\n');
            }

            break;
        }
    }

    if (cherryPickResult.status === 0) {
        logger.log('\nSuccessful cherry-pick!');

        if (user && prBranch) {
            git_util.sendPullRequest(user, prBranch);
        }
    }
};

Automator.prototype.handleFailedCherryPick = function(sourceBranch) {
    var instance = this;

    var fileStatusArray = git_util.gitStatus().stdout.split('\n');

    for (var i = 0; i < fileStatusArray.length; i++) {
        //see ftp://www.kernel.org/pub/software/scm/git/docs/git-status.html for git status Short Format
        var codeX = fileStatusArray[i].substring(0, 1);
        var codeY = fileStatusArray[i].substring(0, 2);
        
        if (codeX != "U" && codeY != "U") {
            continue;
        };
        
        var unmergedFilePath = fileStatusArray[i].substring(3);

        logger.log('\nUnmerged file: ' + unmergedFilePath);

        var currentBranchLog = git_util.gitLogFile(unmergedFilePath);
        var sourceBranchLog = git_util.gitLogFile(unmergedFilePath, sourceBranch);

        var issuesFixedInSourceBranch = instance.parseCommitMessages(currentBranchLog.stdout, sourceBranchLog.stdout);

        logger.log('The following issues have been committed to ' + unmergedFilePath + ' on the ' + sourceBranch + ' branch, ' + 
            'but are not on your current branch:');

        for (var j = 0; j < issuesFixedInSourceBranch.length; j++) {
            logger.log(issuesFixedInSourceBranch[j]);
        }
    }
};

Automator.prototype.parseCommitMessages = function(commitMessagesCurrentBranch, commitMessagesSourceBranch) {
    var commitMessagesCurrentBranchTicketNumberArray = [],
        commitMessagesSourceBranchTicketNumberArray = [],
        commitsUniqueToSourceBranch = [];

    var commitMessagesCurrentBranchArray = commitMessagesCurrentBranch.split('\n');
    
    for (var j = 0; j < commitMessagesCurrentBranchArray.length; j++) {
        var commitMessagesCurrentBranchTicketNumber = /[a-z]+-[0-9]+/i.exec(commitMessagesCurrentBranchArray[j]);
        
        if (commitMessagesCurrentBranchTicketNumber != null) {
            //logger.log('issues on Current branch: ' + commitMessagesCurrentBranchTicketNumber);
            commitMessagesCurrentBranchTicketNumberArray.push(commitMessagesCurrentBranchTicketNumber.toString());
        }
    }

    var commitMessagesSourceBranchArray = commitMessagesSourceBranch.split('\n');

    for (var i = 0; i < commitMessagesSourceBranchArray.length; i++) {
        var commitMessagesSourceBranchTicketNumber = /[a-z]+-[0-9]+/i.exec(commitMessagesSourceBranchArray[i]);
        
        if (commitMessagesSourceBranchTicketNumber != null) {
            //logger.log('issues on From branch: ' + commitMessagesSourceBranchTicketNumber);
            commitMessagesSourceBranchTicketNumberArray.push(commitMessagesSourceBranchTicketNumber.toString());
        }
    }

    for (var k = 0; k < 10; k++) {
        if (commitMessagesSourceBranchTicketNumberArray[k] == commitMessagesCurrentBranchTicketNumberArray[0]) {
            for (var l = k - 1; l >= 0; l--) {
                if (commitMessagesSourceBranchTicketNumberArray[l] != commitMessagesSourceBranchTicketNumberArray[l + 1]) {
                    commitsUniqueToSourceBranch.push(commitMessagesSourceBranchTicketNumberArray[l]);
                }
            }

            break;
        }
    }

    return commitsUniqueToSourceBranch;
};

Automator.prototype.printCommitMessages = function(regex, branch) {
    if (!regex || regex == '') {
        logger.warn('A regular expression must be set with the -r option\n');
        return;
    }

    var args = ['log', '--pretty=%s', '--grep', regex];

    if (branch) {
        args.push(branch);
    }

    var commitMessagesArray = exec.spawnSync(git_command, args).stdout.split('\n');

    for (var i = 0; i < commitMessagesArray.length; i++) {
        logger.log(commitMessagesArray[i]);
    }
};

exports.Impl = Automator;