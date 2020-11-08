/**
 * Formats a string of comma separated values (clean white space and filter falsy values)
 * @param {string} str - string of comma separated values 
 */
function formatCommaSeparatedValues(str) {
  return str.split(',').map(item => item.trim()).filter(Boolean).join(', ');
}

function parseCommaSeparatedValuesIntoArray(str) {
  return typeof str === 'string' && str.length > 0 ? str.split(',').map(item => item.trim()).filter(Boolean) : [];
}

function parseArrayIntoCommaSeparatedValues(arr) {
  return arr && Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '';
}
/**
 * Prints a display name based on for widget selection command
 * @param {Array<string>} widgets - array of widget names
 */
function printSelectWidgetsDisplayName(widgets) {
  return widgets && widgets.length > 0 ? `Change selected widgets (${widgets.join(', ')})` : 'Select widgets';
}

module.exports = {
  parseArrayIntoCommaSeparatedValues,
  parseCommaSeparatedValuesIntoArray,
  formatCommaSeparatedValues,
  printSelectWidgetsDisplayName
}
