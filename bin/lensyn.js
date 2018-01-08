#!/usr/bin/env node

let commander = require("commander"),
    theme = require('..').init,
    user = 'demingsu';

function versionName(name) {
    return name.split('@');
}

commander
    .option('-i, --install <name>', 'install lensyn theme template', versionName)
    .option('-l, --list', 'show list of lensyn theme template version')
    .arguments('<user>')
    .action(function(val) {
        user = val;
    })
    .parse(process.argv);

theme({
    install: commander.install,
    list: commander.list,
    user: user
});