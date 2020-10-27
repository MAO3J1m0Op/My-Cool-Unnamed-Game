const map = require('../map.js')

/**
 * The commands that any player can execute.
 */
module.exports = {
    /**
     * Shows various data about the current game.
     * @param {string[]} argv the arguments passed to the command, with
     * [0] being the name of the function and [1] being the beginning of
     * the arguments.
     * @param {discord.User} sender the Discord user that issued the
     * command.
     * @param {discord.Guild} guild the Discord guild/server that the
     * command was issued on.
     * @param {discord.Channel} channel the Discord channel that the
     * command was issued on.
     * @returns {string} the command output to be sent as a reply.
     */
    view: async function(argv, sender, guild, channel) {
        let request = argv[1]
        if (request === undefined) {
            return 'Please specify what you want to view.'
        }

        if (request == 'map') {
            return map.render(data.map.get())
        }
    }
}
