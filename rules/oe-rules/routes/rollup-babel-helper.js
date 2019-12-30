const path = require("path");
const fs = require("fs-extra");
const Files = require("../helpers/Files");

exports.beforeSendRequest = {
  async shouldResolve({ requestDetail }) {
    return /index-|\.\.\/viewModel-/.test(requestDetail.url);
  },
  async resolve({ requestDetail, serverOptions, server }) {
    let files, babelJSFile;

    try {
      files = await new Files(serverOptions);
      babelJSFile = await files.findFiles(
        ["index-*"],
        ["js"],
        files.config.transpiledFolder
      );
    } catch (error) {
      server.logger.error(error);
      Promise.reject(error);
      throw new Error(error);
    }

    if (babelJSFile.length) {
      let fileContent = "";
      const filePath = babelJSFile[0];

      try {
        fileContent = await fs.readFile(filePath);
      } catch (error) {
        server.logger.error("Error on loading ", filePath);
        Promise.reject(error);
      }

      return {
        response: {
          statusCode: 200,
          header: requestDetail.requestOptions.headers,
          body: fileContent
        }
      };
    }

    return null;
  }
};
