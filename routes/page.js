const path = require("path");
const fs = require("fs-extra");
const Files = require("../helpers/Files");

async function replaceTemplate(bodyResponse, templateFiles, files) {
  const regions = bodyResponse.regions;
  let foundWidgetsPath = [];
  let widgetsTemplatesContent = {};
  const widgets = [];

  regions.forEach(region => {
    region.widgets.forEach(widget => {
      widgets.push(widget);
    });
  });

  templateFiles.forEach(widgetTemplateFile => {
    const widgetName = path
      .relative(
        path.join(files.config.storefront, "widgets"),
        widgetTemplateFile
      )
      .split(path.sep)[1];

    widgets.some(widget => {
      if (widget.typeId.includes(widgetName)) {
        foundWidgetsPath.push(widgetTemplateFile);
        return true;
      }
    });
  });

  for await (let foundWidgetPath of foundWidgetsPath) {
    const widgetName = path
      .relative(
        path.join(files.config.storefront, "widgets"),
        foundWidgetPath
      )
      .split(path.sep)[1];

    if (foundWidgetPath.includes(widgetName)) {
      widgetsTemplatesContent[widgetName] = widgetsTemplatesContent[
        widgetName
      ] || { templates: [], elements: [] };

      if (foundWidgetPath.includes("element")) {
        widgetsTemplatesContent[widgetName].elements.push({
          path: foundWidgetPath,
          content: await fs.readFile(foundWidgetPath, "utf8")
        });
      } else if (foundWidgetPath.includes("display.template")) {
        widgetsTemplatesContent[widgetName].templates.push({
          path: foundWidgetPath,
          content: await fs.readFile(foundWidgetPath, "utf8")
        });
      }
    }
  }

  Object.keys(widgetsTemplatesContent).forEach(widgetName => {
    const templates = widgetsTemplatesContent[widgetName].templates.map(
      template => template.content
    );

    widgets.some(widget => {
      if (widget.typeId.includes(widgetName)) {
        widget.templateSrc = templates.join();
        widgetsTemplatesContent[widgetName].elements.forEach(element => {
          const elementName = path
            .relative(
              path.join(files.config.storefront, "widgets"),
              element.path
            )
            .split(path.sep)[3];
          const elementId = `${widget.typeId}-${elementName}`;
          widget.elementsSrc = widget.elementsSrc.replace(
            new RegExp(elementId, "g"),
            `${elementId}__disabled-by-proxy__`
          );
          element.content = `<script type="text/html" id="${elementId}__temporary-placeholder-proxy__">${element.content}</script>`;
        });

        widget.elementsSrc += widgetsTemplatesContent[widgetName].elements
          .map(element => element.content)
          .join()
          .replace(/__temporary-placeholder-proxy__/g, "");
        return true;
      }
    });
  });

  return bodyResponse;
}

exports.beforeSendResponse = {
  async shouldResolve({ requestDetail }) {
    return /ccstoreui\/v.+?\/pages\/layout\/.+\??ccvp=.*?$/.test(
      requestDetail.url
    );
  },
  async resolve({ responseDetail, serverOptions }) {
    let files, templateFiles;

    try {
      files = await new Files(serverOptions);
      templateFiles = await files.findFiles(
        ["widgets"],
        ["template", "txt"],
        files.config.storefront
      );
    } catch (error) {
      console.log(error);
      Promise.reject(error);
      throw new Error(error);
    }

    let newResponse = null;
    let bodyResponse;

    try {
      bodyResponse = JSON.parse(responseDetail.response.body.toString());
      bodyResponse = await replaceTemplate(
        bodyResponse,
        templateFiles,
        files
      );

      newResponse = { response: { body: JSON.stringify(bodyResponse) } };
    } catch (error) {
      console.log(error);
    }

    return newResponse;
  }
};
