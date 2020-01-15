const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const Config = require("../config");
let occConfig = null;
let customRoutes = [];

exports.beforeSendRequest = {
  async shouldResolve({ requestDetail, server }) {
    if (!occConfig) {
      try {
        const config = new Config(server.hocusProxusOptions);
        occConfig = await config.getConfig();
      } catch (error) {
        Promise.reject(error);
        throw new Error(error);
      }
    }

    if (!customRoutes.length) {
      try {
        customRoutes = require(path.join(occConfig.storefront, "proxy-routes"));
      } catch (error) {
        server.logger.error(error);
      }
    }

    if (!customRoutes.length) {
      return false;
    }

    return customRoutes.some(
      customRoute =>
        customRoute.enabled &&
        new RegExp(customRoute.url).test(requestDetail.url)
    );
  },
  async resolve({ requestDetail }) {
    const delay = time =>
      new Promise(resolve => {
        setTimeout(resolve, time);
      });

    const customRoute = customRoutes.find(
      route => route.enabled && new RegExp(route.url).test(requestDetail.url)
    );

    if (!customRoute) {
      return null;
    }

    if (typeof customRoute.process === "function") {
      return new Promise(customRoutes.process);
    }

    if (customRoute.delay) {
      await delay(customRoute.delay);
    }

    if (customRoute.filePath && !customRoute.process) {
      const content = await fs.readFile(
        customRoute.isAbsolute
          ? customRoute.filePath
          : path.join(occConfig.storefront, customRoute.filePath)
      );
      return {
        response: {
          statusCode: 200,
          body: content
        }
      };
    }

    return null;
  }
};
