const Command = require('./Command.js')
const data = require('../data.js')
const GameMap = require('../map.js')
const util = require('../util.js')

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

        // First, let's fetch the data.
        try {
            var dat = await data.get()
        } catch (err) {
            return 'Could not start season: unable to fetch player data.'
        }

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

        // Start category creation
        let pCategory = guild.channels.create(category_name, { 
            type: 'category', 
        })

        // Generate possible error messages
        const permissionErr
            = "I don't have channel creation permissions."
        const otherErr
            = "Something went wrong creating the category."
        pCategory.catch(err => {
            console.error(err)
            if (err instanceof Error && err.message === 'Missing Permissions') {
                return permissionErr
            }
            return otherErr
        })

        // Wait for the category to be created or for it to fail
        let category = await pCategory
        
        // Now actually check if the error actually happened
        // String means it's an error (I hope)
        if (typeof category === 'string') {
            return 'Season start failed: ' + category
        }

        // At this point, category is all good
        // Now the role
        // Start role creation
        let pRole = guild.roles.create({
            data: {
                name: 'Season ' + category_name
            },
            reason: 'Start of Season ' + category_name
        })

        // Generate possible error messages
        pRole.catch(err => {
            console.error(err)
            if (err instanceof Error && err.message === 'Missing Permissions') {
                return permissionErr
            }
            return otherErr
        })

        // Wait for the role to be created or for it to fail
        let role = await pRole
        
        // Now actually check if the error actually happened
        // String means it's an error (I hope)
        if (typeof role === 'string') {

            // Delete the category; it's bad now
            category.delete()

            return 'Season start failed: ' + role
        }

        // Category and role were created! Swell! Let's save them.
        dat.playerRole = role.id
        dat.channels.parent = category.id

        // Create the map's residence channel
        let mapChannelP = guild.channels.create('map')
            .then(mapChannel => mapChannel.setParent(category))
        mapChannelP.then(mapChannel => dat.channels.map = mapChannel.id)

        // Create the map
        let mapGeneratorP = GameMap.generateMap(mapSizeX, mapSizeY)
        mapGeneratorP.then(mp => dat.map = mp)

        // Wait for both the channel and the map to generate
        // Then render the map on the map channel
        Promise.all([mapChannelP, mapGeneratorP]).then(promises => {
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

        // Lastly, let's create the signups channel.
        let signups = await guild.channels.create('signups')
        signups.setParent(category)
            .then(() => dat.channels.signups = signups.id)

        // Save the name of the season
        dat.name = category_name

        return `All set! Go sign up for the next season on <#${signups.id}>!`
    }),

    /**
     * Disposes of the assets created for a season.
     */
    dispose: new Command(async function(argv, sender, guild, channel) {

        switch (argv[1]) {
            case 'delete':
                try {
                    var dat = await data.get()
                } catch (err) {
                    return 'Cannot fetch season data.'
                }

                // Delete the signups channel
                let signupP = 
                    guild.channels.cache.get(dat.channels.signups).delete()
                let parentP =
                    guild.channels.cache.get(dat.channels.parent).delete()
                let mapP =
                    guild.channels.cache.get(dat.channels.map).delete()
                let roleP =
                    guild.roles.cache.get(dat.playerRole).delete()
                await Promise.all([signupP, parentP, mapP, roleP])
                return 'All season assets have been deleted.'
            default:
                return 'Please specify a valid way of disposing of assets.'
        }
    })
}
