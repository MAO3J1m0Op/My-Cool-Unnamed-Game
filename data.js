const fs = require('fs')

const map = require('./map.js')

/**
 * Writes an object as a JSON file, overwriting any existing contents.
 * @param {string} path the path to the file.
 * @param {*} obj the object to write.
 */
async function writeJSON(path, obj) {
    fs.writeFile(path, JSON.stringify(obj, null, 4))
}

var currentMap

module.exports.map = {
    get: function() {
        return currentMap
    },
    /**
     * @param {map.GridSquare[][]} mp
     */
    set: function(mp) {
        currentMap = mp
    }
}
