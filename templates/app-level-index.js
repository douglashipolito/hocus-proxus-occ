define([#dependenciesImports], function(#allDependencies) {
  const allDependencies = Array.from(arguments);

  let app = {
    onLoad : function () {
      var currentContext = this;
      var currentArguments = Array.from(arguments);

      allDependencies.forEach(function (currentDependency) {
        if(currentDependency && currentDependency.onLoad) {
          currentDependency.onLoad.apply(currentContext, currentArguments);
        }
      });
    }
  };

  #dependenciesApp

  return app;
});
