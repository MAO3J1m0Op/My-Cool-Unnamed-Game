/**
 * Returns a random integer between min and max.
 * @param {number} min the low value, rounded by function to nearest integer.
 * @param {number} max the low value, rounded by function to nearest integer.
 */
module.exports.randint = function(min, max) {
    let range = Math.floor(max) - Math.floor(min)
    return Math.floor(Math.random() * range) + Math.floor(min)
}

/**
 * Chooses a random value from the given array and returns it.
 * @param {any[]} array the array to pull from.
 */
module.exports.element = function(array) {
    return array[module.exports.randint(0, array.length)]
}

/**
 * Chooses a random property from a given object and returns its key.
 * @param {*} object the object to select a random property from.
 */
module.exports.attribute = function(object) {
    return module.exports.element(Object.keys(object))
}
