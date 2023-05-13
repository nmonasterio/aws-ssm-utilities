const { SSM, SharedIniFileCredentials } = require("aws-sdk");
const { writeFileSync } = require("fs");
const os = require('os')

const yargs = require('yargs'),
    chalk = require('chalk');

const error = chalk.bold.red;
const debug = chalk.cyan;

var options = yargs
    .option('f', {
        alias: 'from',
        demandOption: true,
        describe: 'The prefix for the source SSM values.',
        type: 'string'
    })
    .option('s', {
        alias: 'source',
        demandOption: false,
        default: 'default',
        describe: 'The source AWS profile.',
        type: 'string'
    })
    .option('r', {
        alias: 'sourceRegion',
        demandOption: false,
        default: 'us-east-1',
        describe: 'The source AWS region.',
        type: 'string'
    })
    .option('t', {
        alias: 'to',
        demandOption: true,
        describe: 'The prefix for the destination SSM values.',
        type: 'string'
    })
    .option('d', {
        alias: 'destination',
        demandOption: false,
        default: 'default',
        describe: 'The destination AWS profile.',
        type: 'string'
    })
    .option('e', {
        alias: 'destinationRegion',
        demandOption: false,
        default: 'us-east-1',
        describe: 'The destination AWS region.',
        type: 'string'
    })
    .option('w', {
        alias: 'writeToFile',
        demandOption: false,
        default: false,
        describe: 'Whether to write the missing envs to a file',
        type: 'boolean'
    })
    .option('v', {
        alias: 'writeValues',
        demandOption: false,
        default: false,
        describe: 'Whether to write the values of the missing envs from the source environment to a file',
        type: 'boolean'
    })
    .option('n', {
        alias: 'fileName',
        demandOption: false,
        default: '.env',
        describe: 'The name of the file to write to',
        type: 'string'
    })


.help()
    .argv;

(async() => {
        console.log(debug("Comparing variables between SSM environments."));
        const { from, to, sourceRegion, destinationRegion, source, destination, writeToFile, writeValues, fileName } = options;
        const sourceEnvs = await sourceEnvironmentVariables(from, sourceRegion, source);
        const destinationEnvs = await sourceEnvironmentVariables(to, destinationRegion, destination);
        const missingEnvs = sourceEnvs.filter(x => !destinationEnvs.find(y => y.name === x.name));
        if (!missingEnvs.length) {
            console.log('Congratulations! There are no missing envs between the source and the destination environments');
            return;
        }
        console.log('The following envs are missing from the destination environment')
        console.log(missingEnvs.map(x => x.name));

        if (writeToFile) {
            console.log('Writing missing envs to a file')
            writeFileSync(fileName, missingEnvs.map((x) => `${x.name}=${writeValues ? `"${x.value}"` : ''}`).join("\r\n"));
    }
})();

async function sourceEnvironmentVariables(prefix, region, account) {

    if (prefix.startsWith('//')) {
        prefix = prefix.replace('//', '/')
    }

    if (prefix.endsWith('/')) {
        prefix = prefix.slice(0, -1);
    }
    try {
        const ssm = new SSM({
            region,
            credentials: new SharedIniFileCredentials({ profile: account })
        });

        var keys = await getValues(ssm, prefix);
        var params = [];
        var count = 0;
        params = params.concat(keys.Parameters);
        count += keys.Parameters.length;
        let token = keys.NextToken;
        while (token) {
            var response = await getValues(ssm, prefix, token);
            params = params.concat(response.Parameters);
            count += response.Parameters.length;
            token = response.NextToken;
        }
        console.log(`Retrieved ${params.length} environment variables from SSM from prefix ${prefix}.`);
        return params.map((x) => {
            return {
                name: x.Name.replace(prefix, "").replace('/', ''),
                value: x.Value,
            };
        });
    } catch (e) {
        console.log("Error getting envs");
        console.log(e);
    }
}

async function getValues(ssm, path, token) {

    var opts = {
        Path: path,
        MaxResults: 10,
        NextToken: token,
        Recursive: true,
        WithDecryption: true,
    };
    return await ssm.getParametersByPath(opts).promise();
}