const cheerio = require("cheerio");

exports.beforeSendResponse = {
  async shouldResolve({ responseDetail }) {
    return /text\/html/.test(responseDetail.response.header["Content-Type"]);
  },
  async resolve({ responseDetail }) {
    const newResponse = {};
    const body = responseDetail.response.body.toString();
    const $ = cheerio.load(body, { decodeEntities: false });
    $("title").text(`${$("title").text()}[Proxy]`);
    $('html').addClass('__local_dev_proxy__');
    newResponse.body = $.html();

    return {
      response: newResponse
    };
  }
};
