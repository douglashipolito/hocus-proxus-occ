const path = require("path");
const fs = require("fs-extra");
const Files = require("../helpers/Files");
const { isWin } = require('../helpers/system');

exports.beforeSendRequest = {
  async shouldResolve({ requestDetail, server }) {
    return /\.js|\/js\//.test(requestDetail.url);
  },
  async resolve({ requestDetail, serverOptions, server }) {
    let files, jsFiles, requestedFileName;

    if (!/\.js/.test(requestDetail.url)) {
      requestDetail.url = requestDetail.url.replace(/\?bust/, ".js?bust");
    }

    try {
      files = await new Files(serverOptions);
      requestedFileName = files.fileName(requestDetail.url);
      jsFiles = await files.findFiles(
        ["widgets", "app-level"],
        ["js"],
        files.config.transpiledFolder
      );
    } catch (error) {
      server.logger.error(error);
      Promise.reject(error);
      throw new Error(error);
    }

    //If there is no local file, don't change the response
    if (!requestedFileName) {
      return null;
    }

    requestedFileName = requestedFileName.replace(/\.min/, '');

    const foundJsFiles = jsFiles.filter(jsFile =>
      new RegExp(requestedFileName).test(jsFile)
    );

    if (foundJsFiles.length) {
      const pathSep = isWin() ? '\\\\' : path.sep;
      const filePath = foundJsFiles.find(file => {
        if (/element/.test(file)) {
          const elementName = file.split(pathSep).reverse()[1];
          return requestDetail.url.includes(elementName);
        }

        return (
          path.basename(file, ".js") === requestedFileName ||
          (path.basename(file).includes("index.js") &&
            file.includes(requestedFileName))
        );
      });

      let fileContent = "";

      if (filePath) {
        if(requestDetail.url.includes('widget')) {
          const localWidgetName = filePath.split(pathSep).reverse()[1];

          if(!requestDetail.url.includes(localWidgetName)) {
            return null;
          }
        }

        try {
          fileContent = await fs.readFile(filePath);
        } catch (error) {
          server.logger.error("Error on loading ", filePath);
          Promise.reject(error);
        }

        server.logger.info(`replacing "${requestDetail.url}" by "${filePath}"...`);

        return {
          response: {
            statusCode: 200,
            header: requestDetail.requestOptions.headers,
            body: fileContent
          }
        };
      }
    }
    return null;
  }
};
