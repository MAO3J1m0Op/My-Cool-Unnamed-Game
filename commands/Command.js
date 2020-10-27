const discord = require('discord.js')

class Command {
    /**
     * @param {(
     *   argv: string[], 
     *   sender: discord.User, 
     *   guild: discord.Guild, 
     *   channel: discord.Channel
     * ) => (Promise<string> | string)} command
     */
    constructor(command) {
        this.execute = command
    }
}

module.exports = Command
