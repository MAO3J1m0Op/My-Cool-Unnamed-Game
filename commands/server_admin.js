/**
 * The commands that only an administrator of a Discord server can execute.
 * Indicated with a !.
 */
module.exports = {
    /**
     * Sets up a new channel category on the server for the purpose of
     * the game. This starts a new game.
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
    setup: async function(argv, sender, guild, channel) {

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
        data.map.set(map.generateMap(30, 30))

        // let category = await guild.channels.create('Game', { 
        //     type: 'category', 
        // })

        return 'All set! A new season has begun!'
    }
}
