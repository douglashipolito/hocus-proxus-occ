const convert = require('@buxlabs/amd-to-es6');
const { createFilter } = require('rollup-pluginutils');

const firstpass = /\b(?:define)\b/;

module.exports = function(options = {}) {
    const filter = createFilter( options.include, options.exclude );
    options.converter = options.converter || {};
    options.converter.sourceMap = typeof options.converter.sourceMap !== 'undefined' ? options.converter.sourceMap : true;

    return {
        name: 'amd',

        transform (code, id) {
            if ( !filter( id ) ) return;
            if ( !firstpass.test( code ) ) return;

            let transformed = convert(code, options.converter);

            if(!options.converter.sourceMap) {
              return transformed;
            }

            return { code: transformed.source, map: transformed.map };
        }
    };
}
