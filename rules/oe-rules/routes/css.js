const path = require("path");
const fs = require('fs-extra');
const Files = require("../helpers/Files");

exports.beforeSendResponse = {
  async shouldResolve({ requestDetail }) {
    return /\/css\/(base|common)\.css/.test(requestDetail.url);
  },
  async resolve({ requestDetail, responseDetail, serverOptions, server }) {
    let fileContent = null, files, filePath;
    const requestedCssFile = path.basename(requestDetail.url).replace(/(.*\.css)\?.*/, '$1');

    try {
      files = await new Files(serverOptions);
      const cssBasePath = path.join(files.config.transpiledFolder, 'less');
      filePath = path.join(cssBasePath, requestedCssFile);
      fileContent = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      server.logger.error("Error on loading ", filePath);
      Promise.reject(error);
    }

    if(fileContent) {
      let bodyResponse = responseDetail.response.body.toString();

      if(/base/.test(requestedCssFile)) {
        bodyResponse += fileContent;
      } else {
        bodyResponse = fileContent;
      }

      return {
        response: {
          body: bodyResponse
        }
      };
    }

    return null;
  }
};
