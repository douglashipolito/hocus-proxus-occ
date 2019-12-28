const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
const url = require('url');

class Config {
  constructor(serverOptions) {
    this.serverOptions = serverOptions;
    this.configFilePath = path.join(serverOptions.hocusProxusUserPath, 'occ.config.json');
    this._defaultConfigStructure = {
      project: '',
      projectConfig: '',
      storefront: '',
      environment:  {
        name: '',
        url: '',
        hostname: ''
      },
      transpiledFolder: ''
    };
  }

  setProjectDir(dir) {
    return new Promise(async (resolve, reject) => {
      if(!dir) {
        return reject('Please provide a directory for the setProjectDir method');
      }

      try {
        const currentConfig = await this.ensureConfig();
        currentConfig.project = dir;
        resolve(await this.updateConfig(currentConfig));
      } catch(error) {
        reject(error);
      }
    });
  }

  setEnvironment(environment) {
    return new Promise(async (resolve, reject) => {
      if(!environment) {
        return reject('Please provide an environment for the setEnvironment method');
      }

      try {
        const currentConfig = await this.ensureConfig();
        const projectConfig = await this.getProjectConfig();
        const environments = projectConfig.environments;
        const environmentFound = environments.find(projectEnvironment => projectEnvironment.name === environment);

        if(!environmentFound) {
          return reject(`The environment "${environment}" has not been found at "${projectConfig.projectConfig}"`);
        }

        currentConfig.environment.name = environmentFound.name;
        currentConfig.environment.url = environmentFound.url;
        currentConfig.environment.hostname = url.parse(environmentFound.url).hostname;

        resolve(await this.updateConfig(currentConfig));
      } catch(error) {
        reject(error);
      }
    });
  }

  configExists() {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(await fs.exists(this.configFilePath));
      } catch(error) {
        reject(error);
      }
    });
  }

  ensureConfig() {
    return new Promise(async (resolve, reject) => {
      try {
        const configFileExists = await this.configExists();
        if(configFileExists) {
          return resolve(await fs.readJSON(this.configFilePath));
        }

        resolve(await this.createConfig());
      } catch(error) {
        reject(error);
      }
    });
  }

  updateConfig(config) {
    return new Promise(async (resolve, reject) => {
      if(!config) {
        return reject('Please provide a config json object for the updateConfig method.');
      }

      const validConfigs = Object.keys(this._defaultConfigStructure);
      const providedConfigs = Object.keys(config);
      const invalidConfigs = providedConfigs.filter(config => !validConfigs.includes(config));

      if(invalidConfigs.length) {
        return reject(`The following configs are not valid: ${invalidConfigs.join(',')}`);
      }

      try {
        const currentConfig = await this.getConfig();
        await fs.writeJSON(this.configFilePath, _.defaultsDeep(config, currentConfig), { spaces: 2 });
        resolve(await fs.readJSON(this.configFilePath));
      } catch(error) {
        reject(error);
      }
    });
  }

  createConfig(config = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        if(!config.project) {
          return reject(`Please provide the project path for the createConfig method`);
        }

        if(!config.projectConfig) {
          return reject(`Please provide the projectConfig path for the createConfig method`);
        }

        if(!config.environment) {
          return reject(`Please provide the environment for the createConfig method`);
        }

        config.storefront = path.join(config.project, 'storefront');
        config.transpiledFolder = path.join(config.storefront, '.transpiled');
        config.environment.hostname = url.parse(config.environment.url).hostname;

        await fs.outputJson(this.configFilePath, _.defaultsDeep(config, this._defaultConfigStructure), { spaces: 2 });
        resolve(await fs.readJSON(this.configFilePath));
      } catch(error) {
        reject(error);
      }
    });
  }

  getConfig() {
    return new Promise(async (resolve, reject) => {
      try {
        const configExists = await this.configExists();
        if(!configExists) {
          return reject(`The config file doesn't exist, please create this file first: ${this.configFilePath}`)
        }
        return resolve(await fs.readJSON(this.configFilePath));
      } catch(error) {
        reject(error);
      }
    });
  }

  getProjectConfig() {
    return new Promise(async (resolve, reject) => {
      try {
        const currentConfig = await this.getConfig();
        resolve(await fs.readJSON(currentConfig.projectConfig));
      } catch(error) {
        reject(error);
      }
    });
  }

  getEnvironment() {
    return new Promise(async (resolve, reject) => {
      try {
        const currentConfig = await this.getConfig();
        resolve(currentConfig.selectedEnvironmentDetails);
      } catch(error) {
        reject(error);
      }
    });
  }

  getAvailableEnvironments() {
    return new Promise(async (resolve, reject) => {
      try {
        const currentConfig = await this.getProjectConfig();
        const environments = currentConfig.environments.map(env => {
          env.hostname = url.parse(env.url).hostname;
          return env;
        });
        resolve(environments);
      } catch(error) {
        reject(error);
      }
    });
  }

  getProjectDir() {
    return new Promise(async (resolve, reject) => {
      try {
        const currentConfig = await this.getConfig();
        resolve(currentConfig.project);
      } catch(error) {
        reject(error);
      }
    });
  }
}

module.exports = Config;
