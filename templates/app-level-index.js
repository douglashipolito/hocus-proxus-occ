define([#dependenciesImports], function(#allDependencies) {
  const allDependencies = Array.from(arguments);

  let app = {
    onLoad : function () {
      var currentContext = this;
      var currentArguments = Array.from(arguments);

      Object.keys(app).filter(appLevelName => appLevelName !== 'onLoad').forEach(appLevelName => {
        if(app[appLevelName].onLoad) {
          app[appLevelName].onLoad.apply(currentContext, currentArguments);
        }
      });
    }
  };

  #dependenciesApp

  return app;
});
