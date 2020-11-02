const fs = require('fs')
const discord = require('discord.js')

const map = require('./map.js')

/**
 * Writes an object as a JSON file, overwriting any existing contents.
 * @param {string} path the path to the file.
 * @param {*} obj the object to write.
 * @returns {Promise<void>} a promise to be settled when the file operation
 * is complete.
 */
async function writeJSON(path, obj) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(obj, null, 4), err => {
            if (err) reject() 
            else resolve()
        })
    })
}

/**
 * Reads in a JSON file and parses its contents.
 * @param {string} path the path to the file.
 * @returns {Promise<*>} a promise to the data being read in.
 */
async function readJSON(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, null, (err, data) => {
            if (err) reject(err)
            else resolve(JSON.parse(data.toString('utf8')))
        })
    })
}

class SeasonData {
    /**
     * @param {map.GridSquare[][]} map 
     * @param {string} parentCategory 
     * @param {string} channelSignin 
     * @param {string} playerRole
     */
    constructor(map, parentCategory, channelSignups, playerRole) {
        this.map = map
        this.playerRole = playerRole
        this.channels = {
            parent: parentCategory,
            signups: channelSignups,
        }
    }
}

var data = new SeasonData()
/**
 * This promise is waited on when any operation involving data is called.
 * This is to ensure that data is not being given when there isn't anything
 * to give.
 * @type {Promise<void>}
 */
var dataBlockingPromise
const pathRoot = './data/'
const mapPath = pathRoot + 'map.json'
const dataPath = pathRoot + 'data.json'

/**
 * Reloads the data.
 * @returns a promise that is resolved when the data is reloaded and rejected
 * if the data fails.
 */
async function reloadPrivate() {
    // Use a dummy variable so it can be discarded if a reload fails.
    let dummyData = await readJSON(dataPath)
    dummyData.map = await readJSON(mapPath)
    data = dummyData
}

/**
 * Reloads the data from the file.
 */
module.exports.reload = async function() {

    // We're loading in data! Set to dataBlockingPromise to ensure data isn't
    // asked for while we're reloading.
    dataBlockingPromise = reloadPrivate()
    return dataBlockingPromise.catch(err => {
        console.error('An error occurred reloading data: ' + err)
        console.error('Restart the bot to try again.')
    })
}

// Call on initialization
module.exports.reload()

/**
 * Gets the data object. This function returns a promise in case data is
 * asked for before the request can be properly managed.
 * @returns {Promise<SeasonData>} a promise to the data.
 */
module.exports.get = async function() {
    await dataBlockingPromise
    return data
}

/**
 * Sets the key of the data object to the current value. Synonymous to
 * <pre><code>
 * get().then(data => data[key] = value)
 * </code></pre>
 * @param {string} key 
 * @param {*} value 
 * @returns {Promise<void>}
 */
module.exports.set = function(key, value) {
    return module.exports.get().then(data => data[key] = value)
}
