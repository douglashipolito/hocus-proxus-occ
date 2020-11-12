const os = require("os");
const fs = require("fs-extra");
const path = require("path");
const url = require("url");
const inquirer = require("inquirer");
const Config = require("../config");
const { printSelectWidgetsDisplayName, parseCommaSeparatedValuesIntoArray, parseArrayIntoCommaSeparatedValues } = require("../helpers/user-input");
inquirer.registerPrompt("directory", require("inquirer-select-directory"));
inquirer.registerPrompt(
  "autocomplete",
  require("inquirer-autocomplete-prompt")
);

function askProject(server) {
  return new Promise(async (resolve, reject) => {
    try {
      const projectAnswer = await inquirer.prompt([
        {
          type: "directory",
          name: "project",
          message: "Please inform the project folder you want to work on:",
          basePath: os.homedir()
        }
      ]);
      const project = projectAnswer.project;
      const projectConfigPath = path.join(project, "occ-tools.project.json");
      const projectConfigExists = await fs.exists(projectConfigPath);

      if (!projectConfigExists) {
        server.logger.error(
          `The file "occ-tools.project.json" is not available at the provided path "${project}", please create this file and try again`
        );
        process.exit(0);
      }

      const projectConfig = await fs.readJSON(projectConfigPath);
      projectConfig.environments = projectConfig.environments.map(env => {
        env.hostname = url.parse(env.url).hostname;
        return env;
      });

      resolve({
        project,
        projectConfigPath,
        projectConfig
      });
    } catch (error) {
      reject(error);
    }
  });
}

function askEnvironment(environments) {
  return new Promise(async (resolve, reject) => {
    try {
      const maxLength = 25;
      environments = environments.map(env => {
        env.value = env.name;
        env.name = `[${env.name}]${Array(maxLength - env.name.length).join(
          " "
        )}${env.hostname}`;
        return env;
      });

      const environmentsAnswer = await inquirer.prompt([
        {
          type: "autocomplete",
          name: "environment",
          message: "Which environment do you want to use:",
          source: (answers, input) => {
            return new Promise(resolve =>
              resolve(
                environments.filter(env =>
                  new RegExp(input, "i").test(env.value)
                )
              )
            );
          }
        }
      ]);

      const selectedEnvironment = environments.find(
        env => env.value === environmentsAnswer.environment
      );
      resolve(selectedEnvironment);
    } catch (error) {
      reject(error);
    }
  });
}

function askWidgets(currentlySelectedWidgets) {
  return new Promise(async (resolve, reject) => {
    try {
      const widgetsAnswer = await inquirer.prompt([
        {
          name: "widgets",
          message: "Which widgets do you want to proxy (type comma separated widgets):",
          default: parseArrayIntoCommaSeparatedValues(currentlySelectedWidgets) || null,
        }
      ]);

      resolve(widgetsAnswer);
    } catch (error) {
      reject(error);
    }
  });
}

function createConfig(config, server) {
  return new Promise(async (resolve, reject) => {
    try {
      const configData = {};
      const projectAnswer = await askProject(server);
      const project = projectAnswer.project;
      const projectConfigPath = projectAnswer.projectConfigPath;
      const projectConfig = projectAnswer.projectConfig;
      const selectedEnvironment = await askEnvironment(
        projectConfig.environments
      );

      configData.project = project;
      configData.projectConfig = projectConfigPath;
      configData.environment = selectedEnvironment;
      const newConfig = await config.createConfig(configData);

      // Update server rule
      await server.updateRuleConfig({
        domain: newConfig.environment.hostname,
        enabledRule: "oe-rules"
      });

      resolve(newConfig);
    } catch (error) {
      reject(error);
    }
  });
}

function optionsToRun(projectConfig, times, serverOptions) {
  return new Promise(async (resolve, reject) => {
    const options = [
      {
        value: "run",
        name: `Run proxy on domain: ${projectConfig.environment.hostname}`
      },
      {
        value: "environment",
        name: "Select environment"
      },
      {
        value: "widgets",
        name: printSelectWidgetsDisplayName(serverOptions.widgets)
      },
      {
        value: "config",
        name: "Show configs"
      },
      {
        value: "project",
        name: "Change Project"
      },
      {
        value: "browser",
        name: "Change browser"
      },
      {
        value: "exit",
        name: "Exit"
      }
    ];

    const optionsAnswer = await inquirer.prompt([
      {
        type: "autocomplete",
        name: "option",
        message: times === 0 ? "What do you want to do:" : "What about now?",
        source: (answers, input) => {
          return new Promise(resolve =>
            resolve(
              options.filter(option => new RegExp(input, "i").test(option.name))
            )
          );
        }
      }
    ]);
    resolve(optionsAnswer);
  });
}

function selectEnvironment(config, server) {
  return new Promise(async (resolve, reject) => {
    try {
      let environments = await config.getAvailableEnvironments();
      const selectedEnvironment = await askEnvironment(environments);
      await config.setEnvironment(selectedEnvironment.value);

      // Update server rule
      await server.updateRuleConfig({
        domain: selectedEnvironment.hostname
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function selectWidgets(serverOptions) {
  return new Promise(async (resolve, reject) => {
    try {
      const selectedWidgets = await askWidgets(serverOptions.widgets);
      const widgetsArray = parseCommaSeparatedValuesIntoArray(selectedWidgets.widgets);

      serverOptions.widgets = widgetsArray;
     
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function changeBrowser(serverOptions) {
  return new Promise(async (resolve, reject) => {
    try {
      const browserAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "browser",
          message: "Please inform browser name you want to use:"
        }
      ]);
      serverOptions.browserConfigs.browser = browserAnswer.browser;
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

exports.preprocessors = {
  async shouldResolve() {
    return true;
  },
  async resolve({ server, serverOptions }) {
    try {
      const config = new Config(serverOptions);
      const configExists = await config.configExists();
      let projectConfig = {};
      let times = 0;

      if (!configExists) {
        server.logger.info("No config found, creating a new one...");
        projectConfig = await createConfig(config, server);
      } else {
        let selectedOption = false;
        const exitOptions = ["run", "exit"];
        projectConfig = await config.getConfig();

        while (!selectedOption || !exitOptions.includes(selectedOption)) {
          switch (selectedOption) {
            case "environment": {
              await selectEnvironment(config, server);
              break;
            }
            case "widgets": {
              await selectWidgets(serverOptions);
              break;
            }
            case "config": {
              server.logger.info(projectConfig);
              break;
            }
            case "project": {
              await createConfig(config, serverOptions);
              break;
            }
            case "browser": {
              await changeBrowser(serverOptions);
              break;
            }
          }

          projectConfig = await config.getConfig();
          const optionsAnswer = await optionsToRun(projectConfig, times++, serverOptions);
          selectedOption = optionsAnswer.option;
        }

        const currentServerConfigs = await server.listConfigs();

        // Ensure environment server configs
        serverOptions.url = projectConfig.environment.url;
        serverOptions.domain = projectConfig.environment.hostname;

        if (
          currentServerConfigs.domain !== projectConfig.environment.hostname
        ) {
          await server.updateRuleConfig({
            domain: projectConfig.environment.hostname
          });
        }

        if (selectedOption === "exit") {
          process.exit(0);
        }

        if (selectedOption === "run") {
          server.logger.success("running...");
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }

    Promise.resolve(true);
  }
};
