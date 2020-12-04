const fs = require('fs').promises
const discord = require('discord.js')

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
async function saveSeasons() {
    let promises = []
    try {
        const dat = await module.exports.getAll()
        for (const season in dat) {
            if (dat[season] === undefined) continue
            let seasonDat = dat[season].toJSON()
            let p = writeJSON(module.exports.settings.dataPathRoot
                + season + '.json', seasonDat)
            p.then(() => console.log(`${season} written to file.`))
            promises.push(p)
        }
        await Promise.all(promises)
    } catch (err) {
        console.error('Seasons could not be saved.')
        console.error(err)
    }
}

/**
 * Saves both data and map.
 */
module.exports.save = async function() {
    let dat = saveSeasons().then(() => console.log('All seasons written to file.'))
    await Promise.all([dat])
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

    let dummyData = {}

    // Read in map
    let seasonFiles = await fs.readdir(module.exports.settings.dataPathRoot)
    
    // Read in each file
    // Use map instead of foreach to get array of promises
    let seasonContents = seasonFiles.map(file => {
        let promise
        
        if (!file.match(/(?<guild>\d+):(?<name>.+)\.json/))
            promise = Promise.resolve()
        else promise = readJSON(module.exports.settings.dataPathRoot + file)
            .then(SeasonManager.fromObj, err => {
                console.error(`INVALID JSON: Could not read the contents of ${file}.`)
            })
            .catch(err => {
                console.error(`${file} is incomplete.`)
                console.error(err)
            })
        return {
            // Cuts the .json file extension
            file: file.substr(0, file.length - 5), 
            promise: promise 
        }
    })

    // Add maps to dummyDatas
    seasonContents.forEach(season => {
        season.promise.then(contents => {
            if (contents === undefined) return
            dummyData[season.file] = contents
        })
    })
    // Wait for all above promises to resolve
    await Promise.all(seasonContents.map(s => s.promise))

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
 * asked for before the request can be properly managed. If guild is undefined,
 * name should be in the format guild ID:season name. Otherwise, only the season
 * name is necessary.
 * @param {string} name the name of the season.
 * @param {discord.Guild} guild the guild that the season belongs to.
 * @returns {Promise<SeasonManager>} a promise to the data.
 */
module.exports.get = async function(name, guild) {
    await dataBlockingPromise
    if (guild) return data[guild.id + ':' + name]
    else return data[name]
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
    data[season.guild.id + ':' + season.name] = season
}
