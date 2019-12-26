const path = require("path");
const fs = require("fs-extra");
const chokidar = require("chokidar");
const Files = require("../helpers/Files");
const rollup = require("rollup");
const babel = require("rollup-plugin-babel");
const less = require("less");
const nodeResolve = require("rollup-plugin-node-resolve");
const multiInput = require("rollup-plugin-multi-input").default;
const html = require("rollup-plugin-html");
const progress = require("rollup-plugin-progress");
const amd = require("rollup-plugin-amd");
const exitHook = require("async-exit-hook");

/**
 * Create the index file containing the app level
 * dependencies
 * @param  {Array} filesList each file
 * @return {String}           the index file content
 */
function createJsBundleIndexFile(filesList, appLevelIndexTemplate) {
  var dependenciesImports = [];
  var allDependencies = [];
  var dependenciesApp = [];

  filesList.forEach(function(file) {
    var fileName = path.basename(file, ".js").replace(/[\W]/g, "_");

    dependenciesImports.push(`"${file}"`);
    allDependencies.push(fileName);
    dependenciesApp.push("app['" + fileName + "'] = " + fileName + ";");
  });

  dependenciesImports = dependenciesImports.join(",");
  allDependencies = allDependencies.join(",");
  dependenciesApp = dependenciesApp.join("\n");

  appLevelIndexTemplate = appLevelIndexTemplate.replace(
    /#dependenciesImports/g,
    dependenciesImports
  );
  appLevelIndexTemplate = appLevelIndexTemplate.replace(
    /#allDependencies/g,
    allDependencies
  );
  appLevelIndexTemplate = appLevelIndexTemplate.replace(
    /#dependenciesApp/g,
    dependenciesApp
  );

  return appLevelIndexTemplate;
}

class Transpiler {
  constructor() {
    this.config = {};
    exitHook(async callback => {
      console.log("Transpiler - Clearing temp files...");
      try {
        await fs.remove(this.config.transpiledFolder);
        await this.lessWatcher.close();
      } catch (error) {
        console.log(error);
      }

      setTimeout(callback, 200);
    });
  }

  setConfigs() {
    return new Promise(async (resolve, reject) => {
      try {
        this.config = await require("../config")();

        //It will replace the main widget index.js file
        // Temporary solution
        this.widgetJsIndexContent = await fs.readFile(
          path.join(__dirname, "..", "templates", "widget-index.js"),
          "utf8"
        );
        resolve(this);
      } catch (error) {
        console.log(error);
        reject(error);
        throw new Error(error);
      }
    });
  }

  less() {
    return new Promise(async (resolve, reject) => {
      let files, widgetsLessFiles, themeLessFiles;
      const lessPath = path.join(this.config.transpiledFolder, 'less');
      const commonCSSOutputPath = path.join(lessPath, 'common.css');
      const themeCSSOutputPath = path.join(lessPath, 'base.css');

      const bootstrapPath = path.join(
        __dirname,
        "..",
        "node_modules",
        "occ-custom-bootstrap-less",
        "less",
        "bootstrap.less"
      );

      try {
        await fs.ensureDir(lessPath);
        files = await new Files();
        widgetsLessFiles = await files.findFiles(["widgets"], ["less"]);
        themeLessFiles = await files.findFiles(["less"], ["less"]);
      } catch (error) {
        console.log(error);
        reject(error);
        throw new Error(error);
      }

      const importWidgetsLessFiles = widgetsLessFiles.map(
        lessFile => `@import "${lessFile}";`
      ).join("")
      const importThemeLessFiles = themeLessFiles.map(
        lessFile => `@import "${lessFile}";`
      ).join("");

      const commonLessSource = () => {
        let lessSourceToRender = '';
        lessSourceToRender += `/*__proxy_delete__*/@import "${bootstrapPath}";/*__proxy_delete_end__*/`;
        lessSourceToRender += importWidgetsLessFiles;
        lessSourceToRender += `/*__proxy_delete__*/${importThemeLessFiles}/*__proxy_delete_end__*/`;
        return lessSourceToRender;
      }

      const themeLessSource = () => {
        let lessSourceToRender = '';
        lessSourceToRender += `/*__proxy_delete__*/@import "${bootstrapPath}";/*__proxy_delete_end__*/`;
        lessSourceToRender += `${importThemeLessFiles}`;
        return lessSourceToRender;
      }

      const generateCSS = ({lessSourceToRender, outputFile, changedFile, type}) => {
        return new Promise(async (resolve, reject) => {
          console.log(`===> processing less files for the "${type}"`);
          if (changedFile) {
            console.log(`===> processing less file ${changedFile}`);
          }
          try {
            const rendered = await less.render(lessSourceToRender);
            let code = rendered.css;
            code = code.replace(/\/\*__proxy_delete__\*\/[^]+?\/\*__proxy_delete_end__\*\//gm, '');
            await fs.writeFile(outputFile, code);
            console.log(`===> ${type}'s less processed`);
            console.log(`===> ${type}'s file saved at: ${outputFile}\n`);
            resolve();
          } catch (error) {
            console.log("===> error on less process");
            console.log(error);
            reject();
          }
        });
      };

      try {
        await generateCSS({ lessSourceToRender: commonLessSource(), outputFile: commonCSSOutputPath, type: 'widgets'});
        await generateCSS({ lessSourceToRender: themeLessSource(), outputFile: themeCSSOutputPath, type: 'theme'});
      } catch (error) {
      }

      this.lessWatcher = chokidar.watch(widgetsLessFiles);
      this.lessWatcher.on("change", changedFile => {
        const isThemeFile = !/widgets/.test(changedFile);
        const options = {
          lessSourceToRender: isThemeFile ? themeLessSource() : commonLessSource(),
          outputFile: isThemeFile ? themeCSSOutputPath : commonCSSOutputPath,
          type: isThemeFile ? 'theme' : 'widgets',
          changedFile
        }

        generateCSS(options);
      });

      resolve();
    });
  }

  js() {
    return new Promise(async (resolve, reject) => {
      let files,
        widgetsJsFiles,
        appLevelFiles,
        appLevelIndexTemplate;
      const widgetJsIndexContent = this.widgetJsIndexContent;

      try {
        files = await new Files();
        widgetsJsFiles = await files.findFiles(["widgets"], ["js"]);
        appLevelFiles = await files.findFiles(["app-level"], ["js"]);
        appLevelIndexTemplate = await fs.readFile(
          path.join(__dirname, "..", "templates", "app-level-index.js"),
          "utf8"
        );
      } catch (error) {
        console.log(error);
        reject(error);
        throw new Error(error);
      }

      const entries = widgetsJsFiles
        .filter(file => !/view-models|models|\.min/.test(file))
        .map(file => {
          let outputFile = "";
          const type = path
            .relative(this.config.storefrontPath, file)
            .split(path.sep)[0];
          const widgetSegments = path
            .relative(this.config.storefrontPath, file)
            .split(path.sep);
          const widgetName = widgetSegments[2];

          if (/element/.test(file)) {
            outputFile = path.join(
              type,
              widgetName,
              "element",
              widgetSegments[4],
              path.basename(file, ".js")
            );
          } else {
            outputFile = path.join(
              type,
              widgetName,
              path.basename(file, ".js")
            );
          }

          return {
            [outputFile]: file
          };
        });

      const extraAppLevelJSs = appLevelFiles.filter(
        file => !/oeCore|oeLibs/.test(file)
      );
      entries.push({
        [path.join("app-level", "oeCore")]: "oeCore.js"
      });

      entries.push({
        [path.join("app-level", "oeLibs")]: "oeLibs.js"
      });

      extraAppLevelJSs.forEach(file => {
        const basePath = path
          .relative(this.config.storefrontPath, file)
          .split(path.sep)[0];

        const appLevelName = path
          .relative(this.config.storefrontPath, file)
          .split(path.sep)[1];

        entries.push({
          [path.join(basePath, appLevelName)]: file
        });
      });

      // We will enforce the / in the end of some requests because OCC consider / in the beginning as external, not internal.
      const EXTERNAL_ABSOLUTE_PATH_REPLACER = "__OCC_EXTERNAL_DEPENDENCY__";

      const occResolverPlugin = () => {
        return {
          name: "occ-resolver-plugin", // this name will show up in warnings and errors
          resolveId: source => {
            // /oe-files and /file are external dependency, marking them as external
            if (/\/oe-files|\/file/.test(source)) {
              return {
                id: source.replace("/", EXTERNAL_ABSOLUTE_PATH_REPLACER),
                external: true
              };
            }

            if (source.startsWith("occ-components")) {
              return {
                id: path.join(
                  this.config.storefrontPath,
                  ".occ-components",
                  "widgets",
                  source.replace("occ-components", ""),
                  "index.js"
                ),
                external: false
              };
            }

            if (/oeCore\.js|oeLibs\.js/.test(source)) {
              return source;
            }

            return null; // other ids should be handled as usually
          },
          load(id) {
            // Replacing the main js file index
            if (/widgets/.test(id) && /\/js\/index\.js/.test(id)) {
              return widgetJsIndexContent;
            }

            if (/oeCore\.js|oeLibs\.js/.test(id)) {
              return createJsBundleIndexFile(
                appLevelFiles.filter(file =>
                  new RegExp(id.replace(".js", "")).test(file)
                ),
                appLevelIndexTemplate
              );
            }
            return null; // other ids should be handled as usually
          },
          generateBundle(options, bundle) {
            Object.keys(bundle).forEach(file => {
              bundle[file].code = bundle[file].code.replace(new RegExp(EXTERNAL_ABSOLUTE_PATH_REPLACER, 'g'), '/')
            })
          }
        };
      };

      const inputOptions = {
        input: entries,
        external: id => {
          return /^((?!\.{1}|occ-components|(.+:\\)|\/{1}[a-z-A-Z0-9_.]{1})).+?$/.test(
            id
          );
        },
        onwarn({ code, loc, frame, message }) {
          // skip certain warnings
          if (code === "UNUSED_EXTERNAL_IMPORT") return;

          // throw on others
          if (code === "NON_EXISTENT_EXPORT") throw new Error(message);

          if (loc) {
            console.warn(`${loc.file} (${loc.line}:${loc.column}) ${message}`);
            if (frame) console.warn(frame);
          } else {
            console.warn(message);
          }
        },
        plugins: [
          progress(),
          html({
            include: [path.join(this.config.storefrontPath, '**', '*.html')]
          }),
          multiInput(),
          occResolverPlugin(),
          amd(),
          nodeResolve(),
          babel({
            exclude: "node_modules/**",
            plugins: [
              [
                path.join(
                  __dirname,
                  '..',
                  "node_modules",
                  "@babel/plugin-proposal-decorators"
                ),
                { legacy: true }
              ],
              path.join(
                __dirname,
                '..',
                "node_modules",
                "@babel/plugin-proposal-class-properties"
              )
            ]
          })
        ]
      };

      const outputOptions = {
        format: "amd",
        dir: this.config.transpiledFolder,
        sourceMap: "inline"
      };

      console.log("===> Starting Transpilers...");
      const watcher = rollup.watch({
        ...inputOptions,
        output: [outputOptions]
      });

      watcher.on("event", event => {
        if (event.code === "BUNDLE_START") {
          console.log("===> Bundling...");
        }

        if (event.code === "BUNDLE_END") {
          console.log("===> Bundling ended...");
        }

        if (event.code === "ERROR") {
          console.log(event.error);
        }

        if (event.code === "END") {
          console.log("===> Transpiling process finished");
          resolve();
        }
      });
    });
  }
}

exports.preprocessors = {
  async shouldResolve() {
    return true;
  },
  async resolve() {
    const transpiler =  new Transpiler();

    try {
      await transpiler.setConfigs();
      await transpiler.js();
      await transpiler.less();
    } catch (error) {
      Promise.reject(error);
    }

    return true;
  }
};
