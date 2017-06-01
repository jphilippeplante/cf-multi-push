#!/usr/bin/env node

const startPath = process.cwd();
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const Prompt = require('prompt-checkbox');
const PromptBase = require('prompt-base');
const commandExists = require('command-exists').sync;

const spawn = child_process.spawn;
const spawnSync = child_process.spawnSync;

var applications = listApplicationsWithManifest();

checkIfCfCLIInstalled();
checkLoggedIn();

var targetOrganization = "";
var targetSpace = "";

const targetCmd = spawnSync('cf', ['target'], { stdio: 'pipe' });
var targetCmdStdOut = targetCmd.stdout;
var targetOutputLines = String(targetCmdStdOut).toString().split(/(?:\r\n|\r|\n)/g);

targetOutputLines.forEach(function (element) {
    if (element.indexOf("org:") != -1) {
        targetOrganization = element;
    } else if (element.indexOf("space:") != -1) {
        targetSpace = element;
    }
}, this);

if (targetOrganization == "" || targetSpace == "") {
    console.log('Failed to get the organisation or space');
    process.exit(1);
}

var promptInstall = new Prompt({
    name: 'install',
    message: 'Which application(s) do you want to push with cf CLI?',
    radio: true,
    choices: applications
});

var promptYesNo = new PromptBase({
    name: 'yesno',
    message: 'Do you want to push your applications? (y/Y/yes/YES)'
});

promptInstall.ask(function (answers) {
    console.log(chalk.red("Cloudfoundry target:"));
    console.log(chalk.red(targetOrganization));
    console.log(chalk.red(targetSpace));
    console.log("");

    promptYesNo.ask(function (answerYesNo) {
        if (answerYesNo == "yes" || answerYesNo == "YES" || answerYesNo == "y" || answerYesNo == "Y") {
            answers.forEach(function (answer) { cfPush(answer); }, this);
        } else {
            console.log(chalk.red('Operation(s) canceled.'));
            process.exit(1);
        }
    });
});

function cfPush(application) {
    const pushCmd = spawn('cf', ['push', '-f', application]);
    pushCmd.stdout.removeAllListeners("data");
    pushCmd.stdout.pipe(process.stdout);
    pushCmd.stderr.on('data', (err) => {
        console.log(chalk.red('Failed to start cf push process for ' + application));
        console.log(err);
        process.exit(1);
    });
}

function listApplicationsWithManifest() {
    var results = [];

    var files = fs.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            var manifestFilename = path.join(filename, "/manifest.yml");
            if (fs.existsSync(manifestFilename)) {
                results.push(filename);
            }
        }
    }

    return results;
}

function checkLoggedIn() {
    var loggedIn = true;
    const oauthTokenCmd = spawnSync('cf', ['oauth-token'], { stdio: 'pipe' });
    var oauthTokenCmdStdOut = oauthTokenCmd.stdout;
    var oauthTokenCmdStdOutLines = String(oauthTokenCmdStdOut).toString().split(/(?:\r\n|\r|\n)/g);
    oauthTokenCmdStdOutLines.forEach(function (element) {
        if (element.indexOf("'cf login'") > -1) {
            loggedIn = false;
        }
    }, this);

    if (!loggedIn) {
        console.log(chalk.red("Not logged in. Use 'cf login' to log in."));
        process.exit(1);
    }

}

function checkIfCfCLIInstalled() {
    if(!commandExists('cf')) {
        console.log(chalk.red("cf CLI is not installed."));
        process.exit(1);
    }
}