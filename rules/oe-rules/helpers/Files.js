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
        this.serverOptions = serverOptions;
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

  // Get a glob filter to include only specifc widgets from the user input like 'oeHeaderWidget,msiNotifications' (comma separated widgets)
  getWidgetFileGlobFilter() {
    if (Array.isArray(this.serverOptions.widgets) && this.serverOptions.widgets.length) {
      return ['!**/*', ...this.serverOptions.widgets.map(widget => `**/${widget.trim()}/**/*`)];
    }
    return null;
  }

  findFiles(paths, filter = [], basePath, fileGlob) {
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

      const globbyOptions = {
        expandDirectories: {
          extensions: filter
        }
      };

      if (fileGlob) {
        globbyOptions.expandDirectories.files = fileGlob;
      }

      try {
        foundFiles = await globby(paths, globbyOptions);

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
