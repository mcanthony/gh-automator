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
        'uniqueissues': Boolean,
        'user': String
    },
    shorthands: {
        'b': ['--sourcebranch'],
        'c': ['--cherrypickfix'],
        's': ['--startinghash'],
        'm': ['--printcommitmessages'],
        'p': ['--prbranch'],
        'S': ['--submit'],
        'r': ['--regex'],
        'i': ['--uniqueissues'],
        'u': ['--user']
    }
};

// -- Commands -----------------------------------------------------------------
Automator.prototype.run = function() {
    var instance = this,
        options = instance.options;

    if (!options.cherrypickfix && !options.printcommitmessages) {
        logger.warn('Please supply options --cherrypickfix or --printcommitmessages\n');
        return;
    }

    if (options.cherrypickfix) {
        if (!options.regex) {
            logger.warn('A regular expression must be set with the -r option\n');
            return;
        }

        if (!options.sourcebranch) {
            logger.warn('A branch to cherry-pick from must be set with the -b option\n');
            return;
        }

        instance.cherryPickFix(options.regex, options.sourcebranch, options.startinghash, options.user, options.prbranch, options.uniqueissues);
    }
    else if (options.printcommitmessages) {
        if (!options.regex) {
            logger.warn('A regular expression must be set with the -r option\n');
            return;
        }

        instance.printCommitMessages(options.regex, options.sourcebranch);
    }
};

Automator.prototype.cherryPickFix = function(regex, sourceBranch, startingHash, user, prBranch, printiIsuesUniqueToSourceBranch) {
    var cherryPickResult,
        instance = this;

    var args = ['log', '--reverse', '--pretty=%h', '--grep', regex, sourceBranch];

    var gitHashArray = exec.spawnSync(git_command, args).stdout.split('\n');

    var args2 = ['log', '--reverse', '--pretty=%s', '--grep', regex, sourceBranch];

    var gitMessageArray = exec.spawnSync(git_command, args2).stdout.split('\n');

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

        logger.log('Cherry-picking commit - ' + gitHashArray[i] + ' ' + gitMessageArray[i]);

        cherryPickResult = git_util.cherryPickCommit(gitHashArray[i]);

        if (cherryPickResult.status !== 0) {

            if (printiIsuesUniqueToSourceBranch) {
                instance.handleFailedCherryPick(sourceBranch);
            }
            else {
                logger.log('\nYou can re-run the previous command with the -i option to show issues unique to the ' + sourceBranch + ' branch');
            }
            
            if ((i + 1) < gitHashArray.length) {
                logger.log('\nIf you are able to manually resolve the conflict you can continue the ' +
                    'cherry-picking process by re-running the previous command with the option -s ' + gitHashArray[i + 1] + '\n');
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
        var codeY = fileStatusArray[i].substring(1, 2);

        if (codeX != "U" && codeY != "U") {
            continue;
        };
        
        var unmergedFilePath = fileStatusArray[i].substring(3);

        logger.log('\nUnmerged file: ' + unmergedFilePath + '\nComparing branches...');

        var currentBranchLog = git_util.gitLogFile(unmergedFilePath);
        var sourceBranchLog = git_util.gitLogFile(unmergedFilePath, sourceBranch);

        var issuesUniqueToSourceBranch = instance.parseCommitMessages(currentBranchLog.stdout, sourceBranchLog.stdout);

        logger.log('The following issues have been committed to ' + unmergedFilePath + ' on the ' + sourceBranch + ' branch, ' + 
            'but are not on your current branch:');

        for (var j = 0; j < issuesUniqueToSourceBranch.length; j++) {
            logger.log(issuesUniqueToSourceBranch[j]);
        }
    }
};

Automator.prototype.parseCommitMessages = function(currentBranchCommitMessages, sourceBranchCommitMessages) {
    var currentBranchIssueKeyArray = [],
        sourceBranchIssueKeyArray = [],
        issuesUniqueToSourceBranch = [];

    var sourceBranchCommitMessageArray = sourceBranchCommitMessages.split('\n');

    for (var i = 0; i < sourceBranchCommitMessageArray.length; i++) {
        var issueKey = /[a-z]+-[0-9]+/i.exec(sourceBranchCommitMessageArray[i]);
        
        if (issueKey != null) {            
            if (sourceBranchIssueKeyArray.indexOf(issueKey.toString()) == -1) { //creates unique list of issue keys in source branch
                sourceBranchIssueKeyArray.push(issueKey.toString());
            }
        }
    }

    var currentBranchCommitMessageArray = currentBranchCommitMessages.split('\n');
    
    for (var i = 0; i < currentBranchCommitMessageArray.length; i++) {
        var issueKey = /[a-z]+-[0-9]+/i.exec(currentBranchCommitMessageArray[i]);
        
        if (issueKey != null) {
            if (currentBranchIssueKeyArray.indexOf(issueKey.toString()) == -1) { //creates unique list of issue keys in current branch
                currentBranchIssueKeyArray.push(issueKey.toString());
            }
        }
    }

    //checks all the issue keys from the source branch to see if they are in the current branch.
    //if they are not, add them to the issuesUniqueToSourceBranch array
    for (var i = 0; i < sourceBranchIssueKeyArray.length; i++) { 
        var foundMatch = false;

        for (var j = 0; j < currentBranchIssueKeyArray.length; j++) {
            if (sourceBranchIssueKeyArray[i] == currentBranchIssueKeyArray[j]) {
                foundMatch = true;
                break;
            }
        }

        if (foundMatch == false) {
            issuesUniqueToSourceBranch.push(sourceBranchIssueKeyArray[i]);
        }
    }

    return issuesUniqueToSourceBranch;
};

Automator.prototype.printCommitMessages = function(regex, branch) {
   var args = ['log', '--pretty=%h %s', '--grep', regex];

    if (branch) {
        args.push(branch);
    }

    var commitMessagesArray = exec.spawnSync(git_command, args).stdout.split('\n');

    for (var i = 0; i < commitMessagesArray.length; i++) {
        logger.log(commitMessagesArray[i]);
    }

    logger.log();
};

exports.Impl = Automator;