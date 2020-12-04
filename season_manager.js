const discord = require('discord.js')
const util = require('./util.js')
const GameMap = require('./map.js')
const bot = require('./bot.js')

/**
 * Manages a specific Discord asset as a part of a SeasonManager.
 */
class AssetManager {

    /**
     * @param {SeasonManager} parent the SeasonManager that is the parent of this 
     * Channel.
     * @param {() => Promise<void>} create function that creates a new channel
     * to manage.
     */
    constructor(parent, create) {
        this.parent = parent
        this.create = create
    }

    /**
     * Gets the channel object based on the ID.
     * @param {string} id the ID of the channel
     */
    initialize(id) {
        // Say this 5 times fast
        this.channel = this.parent.guild.channels.cache.get(id)
        if (this.channel === undefined)
            throw new Error(`No channel of guild ${this.parent.guild.name} `
            + `with ID ${id} exists.`)
    }

    /**
     * Deletes the channel.
     */
    delete() {
        return this.channel.delete()
    }
}

/**
 * Manages all data and channels for a season.
 * @property {number} map a map
 */
class SeasonManager {

    /**
     * The season map.
     * @type {GameMap}
     */
    map = undefined
    
    parentChannel = new AssetManager(this, async function() {
        this.channel = await this.parent.guild.channels
            .create(this.parent.name, { 
                type: 'category', 
            })
    })

    /**
     * @type {{[season_name: string]: AssetManager}}
     */
    channels = {
        map: new AssetManager(this, async function() {

            // Create channel
            let mapChannelP = this.parent.guild.channels.create('map')
                .then(mapChannel => {
                    return mapChannel.setParent(this.parent.parentChannel.channel)
                })
            mapChannelP.then(mapChannel => this.channel = mapChannel)

            // Create the map
            let sizeX = this.parent.mapSizeX
            let sizeY = this.parent.mapSizeY
            let mapGeneratorP = GameMap.generateMap(sizeX, sizeY)
            mapGeneratorP.then(mp => this.parent.map = mp)

            // Wait for both the channel and the map to generate
            // Then render the map on the map channel
            return Promise.all([mapChannelP, mapGeneratorP]).then(promises => {
                let channel = promises[0]
                let mp = promises[1]

                // If any error happens, all the following promises reject.
                util.chunkMessage(mp.render(), content => channel.send(content))
                    .catch(err => {
                        console.error("Unable to fully send map.")
                        console.error(err)
                        channel.send('[ Error in sending map ]')

                            // At this point...really? Come on!
                            .catch(console.error)
                    })
            })
        }),
        signups: new AssetManager(this, async function() {
            // Lastly, let's create the signups channel.
            let channel = await this.parent.guild.channels.create('signups')
            await channel.setParent(this.parent.parentChannel.channel)
            this.channel = channel
        }),
    }

    role = new AssetManager(this, async function() {
        this.channel = await this.parent.guild.roles.create({
            data: {
                name: 'Season ' + this.parent.name
            },
            reason: 'Start of Season ' + this.parent.name
        })
    })

    /**
     * Invokes create on all assets.
     */
    async create() {
        const ps = []

        await this.parentChannel.create()
        for (const channel in this.channels) {
            ps.push(this.channels[channel].create())
        }
        ps.push(this.role.create())

        const value = Promise.all(ps)
        
        // Deletes the channel if anything goes wrong.
        value.catch(() => this.delete())

        // But the promise will reject nonetheless
        return value
    }

    async delete() {
        
        // Saves all the promises of the channel deletions
        const deletePs = []
        deletePs.push(this.parentChannel.delete())

        for (const channel in this.channels) {
            deletePs.push(this.channels[channel].delete())
        }
        deletePs.push(this.role.delete())

        return Promise.allSettled(deletePs).then(() => {})
    }

    /**
     * @param {discord.Guild} guild the guild this SeasonManager belongs to.
     * @param {string} name the name of the season being managed.
     * @param {number} mapSizeX the X coordinate for the size of the map.
     * @param {number} mapSizeY the Y coordinate for the size of the map.
     */
    constructor(guild, name, mapSizeX, mapSizeY) {
        this.guild = guild
        this.name = name
        this.mapSizeX = mapSizeX
        this.mapSizeY = mapSizeY

        this.role.initialize = function(id) {
            this.channel = this.parent.guild.roles.cache.get(id)
            if (this.channel === undefined)
                throw new Error(`No role of guild ${this.parent.guild.name} `
            + `with ID ${id} exists.`)
        }
    }

    /**
     * @typedef {Object} SeasonManagerJSONObj
     * @property {string} guild the ID of the guild.
     * @property {string} name the name of the season
     * @property {string} parentChannel the ID of the parent channel
     * @property {{[channel_name: string]: string}} channels the IDs of the
     * other channels.
     * @property {string} role the ID of the role.
     * @property {any[][]} map the serialized map.
     */
    
    /**
     * @returns {SeasonManagerJSONObj} an object that is saved as data in a
     * JSON-friendly format.
     */
    toJSON() {
        const json = {
            guild: this.guild.id,
            name: this.name,
            parentChannel: this.parentChannel.channel.id,
            role: this.role.channel.id,
            channels: {},
            map: this.map.arr
        }
        for (const channel in this.channels) {
            json.channels[channel] = this.channels[channel].id
        }
        return json
    }

    /**
     * Builds a proper SeasonManager from a JSON-friendly object.
     * @param {SeasonManagerJSONObj} obj the object to build the instance from.
     */
    static async fromObj(obj) {
        const val = new SeasonManager(await bot.getGuild(obj.guild), obj.name)
        val.parentChannel.initialize(obj.parentChannel)
        for (const channel in val.channels) {
            if (obj.channels[channel] === undefined) continue
            val.channels[channel].initialize(obj.channels[channel])
        }
        val.role.initialize(obj.role)
        val.map = new GameMap(obj.map
            .map(subArr => subArr.map(entry => GameMap.GridSquare.fromObj(entry))))
        return val
    }
}
module.exports = SeasonManager
module.exports.AssetManager = AssetManager
