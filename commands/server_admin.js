const Command = require('./Command.js')
const data = require('../data.js')
const SeasonManager = require('../season_manager.js')

/**
 * The commands that only an administrator of a Discord server can execute.
 * Indicated with a !.
 */
module.exports = {
    /**
     * Sets up a new channel category on the server for the purpose of
     * the game. This starts a new game.
     */
    setup: new Command(async function(argv, sender, guild, channel) {

        let category_name = argv[1]
        if (category_name === undefined) {
            return 'Please supply a category name.'
        }

        let mapSizeX = parseInt(argv[2])
        if (isNaN(mapSizeX)) {
            return 'X value for map size is invalid.'
        }

        let mapSizeY = parseInt(argv[3])
        if (isNaN(mapSizeY)) {
            return 'Y value for map size is invalid.'
        }

        // Generate possible error messages
        const permissionErr
            = "I don't have channel creation permissions."
        const otherErr
            = "Something went wrong creating the category."

        const season = new SeasonManager(
            guild, category_name, mapSizeX, mapSizeY)
        data.add(season)
        
        // Create the season, but with extra error handling
        const seasonCreator = season.create()

        // Generate the output message
        return seasonCreator.then(() => {
            return 'All set! Go sign up for the next season on '
                + `<#${season.channels.signups.channel.id}>!`
        }, err => {
            console.error(err)
              
            if (err instanceof Error && err.message === 'Missing Permissions') {
                return permissionErr
            }
            return otherErr
        })
    }),

    /**
     * Disposes of the assets created for a season.
     */
    delete: new Command(async function(argv, sender, guild, channel) {
        try {
            await (await data.get(argv[1], guild)).delete()
            return `Season ${argv[1]} deleted.`
        } catch (err) {
            console.error(err)
            return 'Cannot fetch season data.'
        }
    })
}
