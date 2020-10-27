const Command = require('./Command.js')
const data = require('../data.js')
const map = require('../map.js')

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

        let if_exist = argv[2]
        if (if_exist === undefined) if_exist = 'error'
        if (!['error', 'delete', 'archive'].includes(if_exist)) {
            return '"' + if_exist + '" is not a valid argument.'
        }

        // Generate a new map.
        data().map = map.generateMap(30, 30)

        // let category = await guild.channels.create('Game', { 
        //     type: 'category', 
        // })

        return 'All set! A new season has begun!'
    })
}
