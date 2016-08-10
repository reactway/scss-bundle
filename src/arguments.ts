import * as yargs from 'yargs';
import * as Contracts from './contracts';
let argv = yargs
    .help('h', 'Show help.')
    .alias('h', 'help')
    .version(() => {
        return `Current version: ${require('../package.json').version}.`;
    })
    .alias('v', 'version')
    .options('c', {
        alias: 'config',
        describe: 'Config file path.',
        type: 'string'
    })
    .options('e', {
        alias: 'entry',
        describe: 'Entry file.',
        type: 'string'
    })
    .options('d', {
        alias: 'dest',
        describe: 'Bundled file destination.',
        type: 'string'
    })
    .usage('Usage: scss-bundle [options]')
    .string(['c', 'e', 'd'])
    .argv;

export default argv as Contracts.Arguments;