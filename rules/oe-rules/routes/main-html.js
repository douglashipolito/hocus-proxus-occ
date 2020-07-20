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
    $('body').append(`<script>
                          requirejs(["knockout"], ko => {
                                      window.ko = ko;
                                      window.$dataFor = () => ko.dataFor($0);
                                      window.$contextFor = () => ko.contextFor($0);
                          })</script>`)
    newResponse.body = $.html();

    return {
      response: newResponse
    };
  }
};
