exports.preprocessors = [
  require("./preprocessors/commands"),
  require("./preprocessors/transpiler")
];

exports.routes = [
  require("./routes/custom-routes"),
  require("./routes/main-html"),
  require("./routes/rollup-babel-helper"),
  require("./routes/page"),
  require("./routes/javascript"),
  require("./routes/css")
];
