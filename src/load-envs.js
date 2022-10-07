const { SSM, SharedIniFileCredentials } = require("aws-sdk");
const { readFileSync } = require("fs");
const os = require('os')

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

    .option('f', {
      alias: 'fileName',
      demandOption: false,
      default: '.env',
      describe: 'The file from which to source your environment variables',
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
  console.log(debug("Loading variables into SSM."));
  await loadEnvironmentVariables();
  console.log(debug(`Variables successfully loaded into account ${account} in region ${region} from ${fileName}.`));
})();

async function loadEnvironmentVariables() {

  try {
    const ssm = new SSM({
      region,
      credentials: new SharedIniFileCredentials({ profile: account })
    });

    const envs = readFileSync(fileName).toString().split(os.EOL).filter(x => x.length > 0 && !x.startsWith('#') && x.indexOf('=') > -1);
    console.log(envs.length)
    for (let env of envs) {
      let [key, ...val] = env.split('=');
      val = val.join('=')
      if (val.startsWith('"')) {
        val = val.replace(/"/g,"");
      } else if (val.startsWith("'")) {
        val = val.replace(/'/g,"");
      }
      const name = `${prefix}/${key}`;
      console.log(debug(`Loading key ${name} with value ${val}.`))
      await ssm.putParameter({
        Name: `${prefix}/${key}`,
        Value: val.replace(os.EOL, '').trim(),
        Type: 'String',
        Overwrite: true
      }).promise();
      console.log(debug(`Loaded ${prefix}/${key} environment variable into SSM.`));

    }
  } catch (e) {
    console.log(error("Error loading environment variable"));
    console.log(e);
  }
}
