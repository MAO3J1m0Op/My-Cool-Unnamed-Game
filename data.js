const fs = require('fs').promises
const discord = require('discord.js')

const GameMap = require('./map.js')
const SeasonManager = require('./season_manager.js')

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
    // The name of the map folder name (with trailing slash)
    dataMapFileName: 'maps/',
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

/**
 * All of the read-in data
 * @type {{[season: string]: SeasonManager}}
 */
var data = {}

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
 * Saves all maps.
 */
async function saveMap() {
    let promises = []
    try {
        for (const season in data) {
            let map = (await module.exports.get(season)).mapToJSON()
            let p = writeJSON(mapPath + season + '.json', map)
            p.then(() => console.log(`Map for ${season} written to file.`))
            promises.push(p)
        }
        await Promise.all(promises)
    } catch (err) {
        console.error('Maps could not be saved.')
        console.error(err)
    }
}

/**
 * Writes all data (excluding the map) to file.
 */
async function saveData() {
    try {
        let saveObj = {}
        for (const season in data) {
            saveObj[season] = (await module.exports.get(season)).dataToJSON()
        }
        return writeJSON(dataPath, saveObj)
    } catch (err) {
        console.error('Data could not be saved.')
        console.error(err)
    }
}

/**
 * Saves both data and map.
 */
module.exports.save = async function() {
    let dat = saveData().then(() => console.log('Data written to file ' + dataPath))
    let mp = saveMap().then(() => console.log('All maps written to file.'))
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
        data = {}
        console.log('Data files have been ignored. Using default values.')
        return
    }

    // Ensures the enclosing folder exists.
    makeFolder(module.exports.settings.dataPathRoot)

    // Use a dummy variable so it can be discarded if a reload fails.
    let dummyData = await readJSON(dataPath)

    // Convert JSON objects to real SeasonManagers
    for (const season in dummyData) {
        dummyData[season] = SeasonManager.fromObj(dummyData[season])
    }

    // Read in map
    makeFolder(mapPath)
    let mapFiles = await fs.readdir(mapPath)
    
    // Read in each file
    // Use map instead of foreach to get array of promises
    let mapContents = mapFiles.map(file => {
        let promise
        if (!file.endsWith('.json')) promise = Promise.resolve()
        promise = readJSON(file).then(map => 
            map.map(subArr => subArr.map(entry => GameMap.GridSquare.fromObj(entry))))
            return {
                // Cuts the .json file extension
                file: file.substr(0, file.length - 5), 
                promise: promise 
            }
    })

    // Add maps to dummyDatas
    mapContents.forEach(map => {
        map.promise.then(contents => dummyData[map.file] = new GameMap(contents))
    })
    // Wait for all above promises to resolve
    await Promise.all(mapContents.map(map => map.promise))

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
        console.error('An error occurred reloading data.')
        console.error(err)
        console.error('Fix the problem, then run the command ##reload.')
    })
}

// Call on initialization
module.exports.reload()

/**
 * Gets the data object. This function returns a promise in case data is
 * asked for before the request can be properly managed.
 * @param {string} name the name of the season.
 * @returns {Promise<SeasonManager>} a promise to the data.
 */
module.exports.get = async function(name) {
    await dataBlockingPromise
    return data[name]
}

/**
 * @returns {Promise<{[season: string]: SeasonManager}>} an object containing
 * all of the SeasonManagers currently read in.
 */
module.exports.getAll = async function() {
    await dataBlockingPromise
    const datCopy = {}
    for (const season in data) datCopy[season] = data[season]
    return datCopy
}

/**
 * Makes a new season, overwriting any existing season of the same name.
 * @param {discord.Guild}
 * @param {SeasonManager} season the manager of the new season.
 */
module.exports.add = async function(season) {
    await dataBlockingPromise
    data[season.name] = season
}
