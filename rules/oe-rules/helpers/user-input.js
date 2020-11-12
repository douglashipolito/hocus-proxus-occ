/**
 * Removes the leading and trailing white space from array items and filtering falsy values
 * @param {Array<string>} arr
 * @returns {Array<string>}
 */

function _cleanArrayStringValues(arr) {
  return arr.map(item => item.trim()).filter(Boolean);
}

/**
 * Formats a string of comma separated values (clean white space and filter falsy values)
 * @param {string} str - string of comma separated values
 * @returns {string}
 */
function formatCommaSeparatedValues(str) {
  return _cleanArrayStringValues(str.split(',')).join(', ');
}

/**
 * Parse a string with comma separated values into an array
 * @param {string} str
 * @returns {Array<string>}
 */
function parseCommaSeparatedValuesIntoArray(str) {
  return typeof str === 'string' && str.length > 0 ? _cleanArrayStringValues(str.split(',')) : [];
}

/**
 * Parse array of string values into a string
 * @param {Array<string>} arr
 * @returns {string} - a comma separated
 */
function parseArrayIntoCommaSeparatedValues(arr) {
  return Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '';
}

/**
 * Prints a display name based on for widget selection command
 * @param {Array<string>} widgets - array of widget names
 * @returns {string}
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
