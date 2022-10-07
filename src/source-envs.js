const { SSM, SharedIniFileCredentials } = require("aws-sdk");
const { writeFileSync } = require("fs");



const yargs = require('yargs'),
    chalk = require('chalk');

const error = chalk.bold.red;
const debug = chalk.cyan;

var options = yargs
    .option('p', {
        alias: 'prefix',
        demandOption: true,
        describe: 'The prefix for the SSM values.',
        type: 'string'
    })
    .option('a', {
        alias: 'account',
        demandOption: false,
        default: 'default',
        describe: 'The source AWS profile.',
        type: 'string'
    })
    .option('r', {
        alias: 'region',
        demandOption: false,
        default: 'us-east-1',
        describe: 'The AWS region.',
        type: 'string'
    })

    .option('f', {
      alias: 'fileName',
      demandOption: false,
      default: '.env',
      describe: 'The file to which you would like to save your environment variables',
      type: 'string'
  })

.help()
    .argv;


const { fileName, region, account } = options;
let { prefix } = options;

if (prefix.startsWith('//')) {
  prefix = prefix.replace('//', '/')
}

if (prefix.endsWith('/')) {
  prefix = prefix.slice(0, -1);
}


(async () => {
  console.log("Importing variables from SSM.");
  const envs = await getEnvironmentVariables();
  console.log(envs)
  console.log(`Writing variables to ${fileName}.`);
  writeFileSync(fileName, envs.map((x) => `${x.name}=${x.value}`).join("\r\n"));
  console.log("Variables successfully written to a file.");
})();

async function getEnvironmentVariables() {
  try {
    const path = prefix;
    console.log(`Path prefix: ${prefix}`);

    const ssm = new SSM({
      region,
      credentials: new SharedIniFileCredentials({ profile: account })
    });

    var keys = await getValues(ssm, path);
    var params = [];
    var count = 0;
    params = params.concat(keys.Parameters);
    count += keys.Parameters.length;
    let token = keys.NextToken;
    while (token) {
      var response = await getValues(ssm, path, token);
      params = params.concat(response.Parameters);
      count += response.Parameters.length;
      token = response.NextToken;
    }
    console.log(`Retrieved ${params.length} environment variables from SSM.`);
    return params.map((x) => {
      return {
        name: x.Name.replace(path, "").replace('/', ''),
        value: x.Value,
      };
    });
  } catch (e) {
    console.log("Error getting .envs");
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
