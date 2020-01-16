const cheerio = require("cheerio");

exports.beforeSendResponse = {
  async shouldResolve({ responseDetail }) {
    return /text\/html/.test(responseDetail.response.header["Content-Type"]);
  },
  async resolve({ responseDetail }) {
    const newResponse = {};
    const body = responseDetail.response.body.toString();
    const $ = cheerio.load(body, { decodeEntities: false });
    $("html").addClass("__local_dev_proxy__");
    newResponse.body = $.html();

    return {
      response: newResponse
    };
  }
};
