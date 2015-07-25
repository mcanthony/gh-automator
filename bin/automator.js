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
        'printcommitmessages': Boolean,
        'ticket': String
    },
    shorthands: {
        'pcm': [ '--printcommitmessages' ],
        't': [  '--ticket']
    },
    payload: function(payload, options) {
        if (options.printcommitmessages) {
            options.printcommitmessages = true;

            options.ticket = payload[0];
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