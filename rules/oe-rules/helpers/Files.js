const globby = require("globby");
const path = require("path");
const cache = [];
const Config = require('../config');
const { isWin } = require('./system');

class Files {
  constructor(serverOptions) {
    return new Promise(async (resolve, reject) => {
      try {
        const config = new Config(serverOptions);
        this.config = await config.getConfig();
      } catch (error) {
        reject(error);
        throw new Error("Error on loading configs");
      }

      resolve(this);
    });
  }

  fileName(path, extension = "js") {
    let match = path.match(new RegExp(`v.+\/(.+)\.${extension}`)) || "";

    if (match) {
      match = match[1].replace(/\.min/, '');
    }

    return match;
  }

  findFiles(paths, filter = [], basePath) {
    return new Promise(async (resolve, reject) => {
      let foundFiles;

      paths = paths.map(currentPath =>
        path.join(basePath || this.config.storefront, currentPath).replace(/\\/g, '/')
      );

      const foundCache = cache.find(
        cache =>
          Object.keys(cache).includes(paths) &&
          cache.filter === filter.join(",")
      );
      if (foundCache) {
        return resolve(foundCache);
      }

      try {
        foundFiles = await globby(paths, {
          expandDirectories: {
            extensions: filter
          }
        });

        if(isWin()) {
          foundFiles = foundFiles.map(filePath => filePath.replace(/\//g, '\\\\'));
        }

      } catch (error) {
        reject(error);
        throw new Error(error);
      }

      cache.push({
        [paths]: foundFiles,
        filter: filter.join(",")
      });
      resolve(foundFiles);
    });
  }
}

module.exports = Files;
