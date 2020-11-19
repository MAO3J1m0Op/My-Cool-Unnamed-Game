const fs = require('fs').promises
const discord = require('discord.js')

const GameMap = require('./map.js')

/**
 * Creates a folder, or does nothing if the folder already exists.
 * @param {string} path the path to the folder to create.
 */
function makeFolder(path) {
    return fs.mkdir(path).catch(err => {
        if (err.code == 'EEXIST') { return }
        else throw err
    })
}

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

/**
 * The default contents of the settings file.
 */
const DEFAULT_SETTINGS = {
    // The number of seconds before the bot closes.
    botCloseDelaySeconds: 3,
    // The number of minutes between each save refresh.
    dataSaveIntervalMins: 3,
    // The path to the data folder (with trailing slash)
    dataPathRoot: './data/',
    // The name of the map file name
    dataMapFileName: 'map.json',
    // The name of the data file name
    dataFileName: 'data.json',
    // Bot authtoken
    authToken: "[ bot's auth token goes here ]",
    // Discord User ID for the user that can run sudo commands.
    superUser: '[ super user ID goes here ]',
}
const SETTINGS_PATH = './settings.json'

/**
 * Reads in settings.json and returns its value.
 * @return {typeof DEFAULT_SETTINGS} 
 */
function readSettings() {
    let val
    try {
        console.log('Reading in settings.')
        val = require(SETTINGS_PATH)
    } catch (err) {
        // No settings.json file exists
        if (err.code = 'MODULE_NOT_FOUND') {
            console.log('No settings file found. Assuming default settings.')
            writeJSON(SETTINGS_PATH, DEFAULT_SETTINGS).then(() => {
                console.log('A new settings file has been created at ' 
                    + SETTINGS_PATH)
            })
            return DEFAULT_SETTINGS
        }
        else throw err
    }

    // Ensure the read-in file has all of the settings
    for (const setting in DEFAULT_SETTINGS) {

        // Runs if the values are not the same type
        if (!(typeof val[setting] === typeof DEFAULT_SETTINGS[setting])) {
            console.log(`${setting} value "${val[setting]}" is invalid. ` +
            `Applying default value: ${DEFAULT_SETTINGS[setting]}.`)
            val[setting] = DEFAULT_SETTINGS[setting]
        }
    }

    return val
}

/**
 * @type {(typeof DEFAULT_SETTINGS) & { write: () => Promise<void>}}
 */
module.exports.settings = readSettings()
/**
 * Writes the current settings to file. Useful for overwriting invalid 
 * settings.
 */
module.exports.settings.write = function() {
    return writeJSON(SETTINGS_PATH, module.exports.settings)
}

module.exports.settings.write()

class SeasonData {
    /**
     * @param {GameMap} map 
     * @param {string} parentCategory 
     * @param {string} channelSignups
     * @param {string} playerRole
     * @param {string} mapChannel
     */
    constructor(map = new GameMap(), parentCategory, channelSignups, playerRole,
        mapChannel) {
        this.map = map
        this.playerRole = playerRole
        this.channels = {
            parent: parentCategory,
            signups: channelSignups,
            map: mapChannel,
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
const mapPath = module.exports.settings.dataPathRoot 
    + module.exports.settings.dataMapFileName
const dataPath = module.exports.settings.dataPathRoot 
    + module.exports.settings.dataFileName

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
module.exports.save = async function() {
    let dat = saveData().then(() => console.log('Data written to file ' + dataPath))
    let mp = saveMap().then(() => console.log('Map written to file ' + mapPath))
    await Promise.all([dat, mp])
}

// Starts save on an interval
const SAVE_INTERVAL_MINS = 3
const SAVE_INTERVAL_MS = SAVE_INTERVAL_MINS * 60 * 1000
const saveInterval = setInterval(module.exports.save, SAVE_INTERVAL_MS)

module.exports.close = async function() {
    console.log('Releasing assets of data.js')
    clearInterval(saveInterval); console.log('Saving interval stopped.')
    return module.exports.save().then(() => console.log('data.js has been closed.'))
}

/**
 * Reloads the data.
 * @returns a promise that is resolved when the data is reloaded and rejected
 * if the data fails.
 * @param {boolean} noFiles if true, the data files will be ignored and the default
 * values loaded in.
 */
async function reloadPrivate(noFiles = false) {

    if (noFiles) {
        data = new SeasonData()
        console.log('Data files have been ignored. Using default values.')
        return
    }

    // Ensures the enclosing folder exists.
    makeFolder(module.exports.settings.dataPathRoot)

    // Use a dummy variable so it can be discarded if a reload fails.
    let dummyData = await readJSON(dataPath)
    if (Object.keys(dummyData).length === 0) dummyData = new SeasonData()
    dummyData.map = await readJSON(mapPath)
    data = dummyData
}

/**
 * Reloads the data from the file.
 * @param {boolean} noFiles if true, the data files will be ignored and the default
 * values loaded in.
 */
module.exports.reload = async function(noFiles = false) {

    // We're loading in data! Set to dataBlockingPromise to ensure data isn't
    // asked for while we're reloading.
    dataBlockingPromise = reloadPrivate(noFiles)
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
