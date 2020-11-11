const fs = require('fs').promises
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
    return fs.writeFile(path, JSON.stringify(obj, null, 4))
}

/**
 * Reads in a JSON file and parses its contents.
 * @param {string} path the path to the file.
 * @returns {Promise<*>} a promise to the data being read in.
 */
async function readJSON(path) {
    try {
        await fs.access(path)
    } catch (err) {
        console.log(`Could not find file ${path}. Continuing as if file reads "{}".`)
        return {} // An empty JSON object
    }
    return JSON.parse(await fs.readFile(path, { encoding: 'utf8', flag: '' }))
}

class SeasonData {
    /**
     * @param {map.GridSquare[][]} map 
     * @param {string} parentCategory 
     * @param {string} channelSignups
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
 * Writes data.map to file.
 */
async function saveMap() {
    let dat
    try {
        dat = (await module.exports.get()).map
    } catch (err) { return } // Do nothing if the data is broken
    return writeJSON(mapPath, dat)
}

/**
 * Writes all data (excluding the map) to file.
 */
async function saveData() {
    let datCopy = {}
    let dat
    try {
        dat = await module.exports.get()
    } catch (err) { return } // Do nothing if the data is broken

    // Make a shallow copy
    for (const key in dat) {
        if (key === 'map') continue // Skip the map object
        datCopy[key] = dat[key]
    }

    return writeJSON(dataPath, datCopy)
}

/**
 * Saves both data and map.
 */
function saveAll() {
    let dat = saveData().then(() => console.log('Data written to file ' + dataPath))
    let mp = saveMap().then(() => console.log('Map written to file ' + mapPath))
    return Promise.all([dat, mp])
}

/**
 * Reloads the data.
 * @returns a promise that is resolved when the data is reloaded and rejected
 * if the data fails.
 */
async function reloadPrivate() {
    // Use a dummy variable so it can be discarded if a reload fails.
    let dummyData = await readJSON(dataPath)
    if (Object.keys(dummyData).length === 0) dummyData = new SeasonData()
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
