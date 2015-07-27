/*
 * Copyright 2015, All Rights Reserved.
 *
 * Code licensed under the BSD License:
 * https://github.com/node-gh/gh/blob/master/LICENSE.md
 *
 * @author Dustin Ryerson <dustin.ryerson@liferay.com>
 */

'use strict';

// -- Environment --------------------------------------------------------------
var GH_PATH = process.env.GH_PATH;

// -- Requires -----------------------------------------------------------------
var exec = require(GH_PATH + 'lib/exec'),
    git_command = process.env.GH_GIT_COMMAND || 'git',
    logger = require(GH_PATH + 'lib/logger');

exports.checkoutBranch = function(branch) {
    var args = ['checkout', branch],
        git;

    git = exec.spawnSync(git_command, args);
 
    if (git.status !== 0) {
        logger.log('Cannot checkout branch ' + branch + '.');
    }
    else {
        logger.log('Branch ' + branch + ' has been checked out.');
    }
};

exports.cherryPickCommit = function(hash) {
    var args = ['cherry-pick', hash],
        git;

    git = exec.spawnSync(git_command, args);

    if (git.status !== 0) {
        logger.log('Cannot cherry-pick commit ' + hash + '.');

        return git;
    }

    return git;
};

exports.createBranch = function(branch) {
    var args = ['branch', branch],
        git;

    git = exec.spawnSync(git_command, args);

    if (git.status !== 0) {
        logger.log('Cannot create branch ' + branch + '.');
    }
    else{
        logger.log('Branch ' + branch + ' has been created.')
    }

    this.checkoutBranch(branch);
};

exports.gitLogFile = function(file, branch) {
    var args = ['log'],
        git;

    if (branch) {
        args.push(branch);
    }

    args.push('--pretty=%s', '--max-count=10', file);

    git = exec.spawnSync(git_command, args);

    if (git.status !== 0) {
        logger.log('Cannot log file ' + file + '.');
    }

    return git;
};

exports.gitStatus = function() {
    var args = ['status', '-s'],        
        git;

    // Temporary addition for testing
    args.push('--untracked-files=no');

    git = exec.spawnSync(git_command, args);

    if (git.status !== 0) {
        logger.log('Cannot get status.');
    }

    return git;
};

exports.sendPullRequest = function(user, branch) {
    var args = ['pr', '-s'],
        cmd = 'gh',
        pullRequest;

    args.push(user, '-b', branch);

    pullRequest = exec.spawnSync(cmd, args);

    if (pullRequest.status !== 0) {
        logger.log('Pull request cannot be sent to ' + user + ' on branch ' + branch + '.');
    }
    else {
        logger.log('Pull request sent to ' + user + ' on branch ' + branch + '.');
    }
};