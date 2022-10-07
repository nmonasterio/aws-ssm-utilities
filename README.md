# SSM utils #

A collection of utilities for sourcing, pushing and moving Parameter Store utilities around. 🚚

## Pre-requisites ##

* Node 12+
* Yarn
* AWS credentials in your `~/.aws/` directory (or its Windows equivalent)

## How to run it ##

### SSM migration ###

* Run `yarn ssm-migrate --help` for a list of commands, but at a high level:

```shell
yarn ssm-migrate --from /dev/ --to /prod/ --source source-aws-profile --destination destination-aws-profile --region us-east-1
```

### SSM bulk-loading ###

* Create a file for all your environment variables, a la .env. It may look something like:

```shell
MY_ENV=true
ANOTHER_THING=fancy
LAST_ONE=https://example.com/123124
```

* Run `yarn load-envs --help` for a list of commands, but at a high level:

```shell
yarn load-envs --fileName .env --prefix /my/favorite/prefix --account my-aws-profile --region us-east-1
```

### Downloading envs from SSM locally ###

* Run `yarn source-envs --help` for a list of commands, but at a high level:

```shell
 yarn source-envs --prefix /my/favorite/prefix/ --account myaws-profile --region us-east-1 --fileName .env
```
