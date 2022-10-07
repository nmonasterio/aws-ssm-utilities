const { SSM, SharedIniFileCredentials } = require('aws-sdk');
const Timeout = require ('await-timeout');

const yargs = require('yargs'),
    chalk = require('chalk');

const error = chalk.bold.red;
const debug = chalk.cyan;

var options = yargs
    .option('f', {
        alias: 'from',
        demandOption: true,
        describe: 'The prefix of the source SSM values.',
        type: 'string'
    })
    .option('t', {
        alias: 'to',
        demandOption: true,
        describe: 'The prefix of the destination SSM values.',
        type: 'string'
    })
    .option('s', {
        alias: 'source',
        demandOption: false,
        default: 'default',
        describe: 'The source AWS profile.',
        type: 'string'
    })
    .option('d', {
        alias: 'destination',
        demandOption: false,
        default: 'default',
        describe: 'The destination AWS profile.',
        type: 'string'
    })
    .option('r', {
        alias: 'region',
        demandOption: false,
        default: 'us-east-1',
        describe: 'The AWS region.',
        type: 'string'
    })
    .option('o', {
        alias: 'overwrite',
        demandOption: false,
        default: true,
        describe: 'Whether you want to overwrite the existing value if a key already exists.',
        type: 'boolean'
    })

.help()
    .argv;

const { source, destination, region, overwrite } = options;
let { from, to } = options;


if (from.startsWith('//')) {
    from = from.replace('//', '/')
}

if (to.startsWith('//')) {
    to = to.replace('//', '/')
}

const sourceSSM = new SSM({
    region,
    credentials: new SharedIniFileCredentials({ profile: source })
});

const destinationSSM = new SSM({
    region,
    credentials: new SharedIniFileCredentials({ profile: destination })
});

(async() => {
    console.log(debug(`Migrating from '${from}' prefix in ${source} account to '${to}' prefix in ${destination} account, on ${region} region.`))

    try {
        var keys = await getValues();
        var params = [];
        var count = 0;
        params = params.concat(keys.Parameters);
        count += keys.Parameters.length;
        let token = keys.NextToken;
        while (token) {
            var response = await getValues(token);
            params = params.concat(response.Parameters);
            count += response.Parameters.length;
            token = response.NextToken;
        }
        console.log(debug(`Found ${count} parameter${count !== 1 && 's'} to migrate.`));

        params.forEach(async(param) => {
            var val = {
                Name: param.Name.replace(from, to),
                Description: param.Description,
                Type: param.Type,
                Value: param.Value,
                Overwrite: overwrite
            };

            console.log(debug(`Pushing ${val.Name}`));
            try {
                await destinationSSM.putParameter(val).promise();
                await Timeout.set(1000);
                console.log(debug(`Pushed ${param.Name} to ${to}.`));
            } catch (err) {
                console.log(error(`Unable to move ${val.Name} to ${to}.`));
                console.log(error(err));
            }
        })
        console.log(error(`Migration complete.`));
    } catch (e) {
        console.log(error(`Could not retrieve some of the source tokens.`));
        console.log(error(e));
    }
})();

async function getValues(token) {
    var opts = {
        Path: `${from}`,
        MaxResults: 10,
        NextToken: token,
        Recursive: true,
        WithDecryption: true
    }
    return await sourceSSM.getParametersByPath(opts).promise();
}
