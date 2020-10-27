const fs = require('fs')
const discord = require('discord.js')

const map = require('./map.js')

/**
 * Writes an object as a JSON file, overwriting any existing contents.
 * @param {string} path the path to the file.
 * @param {*} obj the object to write.
 */
async function writeJSON(path, obj) {
    fs.writeFile(path, JSON.stringify(obj, null, 4))
}

class SeasonData {
    /**
     * @param {map.GridSquare[][]} map 
     * @param {string} parentCategory 
     * @param {string} channelSignin 
     */
    constructor(map, parentCategory, channelSignin) {
        this.map = map
        this.channels = {
            parent: parentCategory,
            signin: channelSignin,
        }
    }
}

const data = new SeasonData()

module.exports.get = function() {
    return data
}
