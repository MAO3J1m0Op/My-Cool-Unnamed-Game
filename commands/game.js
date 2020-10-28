const map = require('../map.js')
const data = require('../data.js')

const Command = require('./Command.js')

/**
 * The commands that any player can execute.
 */
module.exports = {
    /**
     * Shows various data about the current game.
     */
    view: new Command(async function(argv, sender, guild, channel) {
        let request = argv[1]
        if (request === undefined) {
            return 'Please specify what you want to view.'
        }

        if (request == 'map') {
            return map.render((await data.get()).map)
        }
    })
}
