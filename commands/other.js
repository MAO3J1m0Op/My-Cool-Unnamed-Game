const Command = require('./Command.js')
const data = require('../data.js')
const map = require('../map.js')

/**
 * Commands that don't belong to a command object.
 */
module.exports = {
    signup: new Command(async function(argv, sender, guild, channel) {
        
        let content = argv.join(' ')
        const badSyntax 
            = "Make sure you're using the correct format of `(x, y)`."
        
        // Lint the message to ensure it's correct
        if (!content.startsWith('(') && content.endsWith(')')) return badSyntax

        // Strip parentheses
        content = content.slice(1, content.length - 1)

        let numbers = content.split(', ')
        if (numbers.length !== 2) return badSyntax

        const x = parseInt(numbers[0])
        const y = parseInt(numbers[1])
        if (x === NaN || y === NaN) return badSyntax

        try {
            var dat = await data.get()
        } catch (err) {
            return 'Something went wrong getting the game data.'
        }

        // Linting is done. Now, check capital
        if (map.assignCapital(dat.map, sender.id, x, y)) {

            // Add them to role
            let role = await guild.roles.fetch(dat.playerRole)
            (await guild.members.fetch(sender.id)).roles.add(role)
            return "You're in!"
        } else {
            return 'Your capital is in an invalid spot. Try a different spot.'
        }
    })
}
