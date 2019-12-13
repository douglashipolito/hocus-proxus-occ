const fs = require("fs-extra");
const path = require("path");

function Config() {
  return new Promise(async (resolve, reject) => {
    const config = {
      projectDir: "/Users/douglashipolito/Sites/occ/motorola",
      environment: {
        name: "shop-stage",
        url: ""
      }
    };

    config.occToolsProject = {
      file: path.join(config.projectDir, "occ-tools.project.json"),
      data: {}
    };

    config.storefrontPath = path.join(config.projectDir, "storefront");
    config.transpiledFolder = path.join(
      config.storefrontPath,
      ".occ-transpiled"
    );

    try {
      config.occToolsProject.data = await fs.readJSON(
        config.occToolsProject.file
      );
    } catch (error) {
      reject(
        `Error on trying to load the file ${config.occToolsProject.file}`,
        error
      );
      throw new Error(error);
    }

    const foundEnv = config.occToolsProject.data.environments.filter(
      env => env.name === config.environment.name
    )[0];

    if (!foundEnv) {
      reject();
      throw new Error(
        `Environment name ${config.environment.name} doesn't exist`
      );
    }

    config.environment.url = foundEnv.url;
    resolve(config);
  });
}

module.exports = Config;
