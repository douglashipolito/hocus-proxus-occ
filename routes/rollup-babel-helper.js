const path = require("path");
const fs = require("fs-extra");
const Files = require("../helpers/Files");

exports.beforeSendRequest = {
  async shouldResolve({ requestDetail }) {
    return /index-/.test(requestDetail.url);
  },
  async resolve({ requestDetail }) {
    let filesHelper, babelJSFile;

    try {
      filesHelper = await new Files();
      babelJSFile = await filesHelper.findFiles(
        ["index-*"],
        ["js"],
        filesHelper.config.transpiledFolder
      );
    } catch (error) {
      console.log(error);
      Promise.reject(error);
      throw new Error(error);
    }

    if (babelJSFile.length) {
      let fileContent = "";
      const filePath = babelJSFile[0];

      try {
        fileContent = await fs.readFile(filePath);
      } catch (error) {
        console.log("Error on loading ", filePath);
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
