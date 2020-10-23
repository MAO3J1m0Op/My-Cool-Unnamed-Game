const discord = require('discord.js')

const auth = require('./auth.json')

const bot = new discord.Client();
bot.login(auth.token)

bot.on('ready', () => {
    console.log("The bot is now active.")
})

bot.on('message', msg => {
    // sudo commands
    checkRunCommand(msg, '##', commands.sudo, async (sender, guild, channel) => {

        // The sender must be the "super user".
        if (sender.id !== auth.super_user)
            throw ('You are not the super user!')
    })
})

/**
 * Checks if a given message is a command, then runs the command requested.
 * @param {discord.Message} msg the message sent that must be checked for 
 * as a command.
 * @param {string} denoter the text used to verify that the text sent is
 * a command.
 * @param {{[command: string]: () => Promise<string>}} command_obj the object containing the command lookup.
 * @param {(
 *   sender: discord.User, 
 *   guild: discord.Guild,
 *   channel: discord.Channel
 * ) => Promise<void>} verification a function called to verify all the conditions
 * required to execute a given type of command. If the function executes 
 * successfully, then the command will be run. If the function throws an
 * error, the error will be printed and the command ignored. If the error 
 * message is "", nothing will be sent and the command will still be ignored.
 */
async function checkRunCommand(msg, denoter, command_obj, 
    verification = async () => {}) {
    if (msg.content.startsWith(denoter)) {
        let argv = msg.content.substring(denoter.length).split(' ')
        let sender = msg.author
        let guild = msg.guild
        let channel = msg.channel
        
        // Runs the verification function
        let verified = true
        await Promise.resolve(verification(sender, guild, channel))
            .catch(fail => {
                msg.reply(fail)
                verified = false
            })
        if (!verified) return

        let id = command_obj[argv[0]]
        // Reply with the command's return value.
        msg.reply(await Promise.resolve(id(argv, sender, guild, channel))
            .catch(err => {
                // If it's just an unrecognized command, it's a waste of my time
                if (command_obj[argv[0]] === undefined) {
                    return "Sorry, I don't understand that command."
                } else {
                    console.log('An error was thrown executing the following:')
                    console.log('  Command: ' 
                        + argv.reduce((a, b) => a + ' ' + b))
                    console.log('  Sender: ' + sender)
                    console.log('  Guild: ' + guild)
                    console.log('  Channel: ' + channel)
                    console.log(err)
                    return "Something went wrong executing your command."
                }
            })
        )
    }
}

// Parses sudo commands entered through console
var stdin = process.openStdin()
stdin.addListener('data', async function(command) {
    let argv = command.toString().trim().split(' ')
    let id = commands.sudo[argv[0]]
    console.log(Promise.resolve(await id(argv, '[console]', null, null))
        .catch(err => err))
})

/**
 * Releases all of the bot's assets.
 */
function onClose() {
    console.log('Releasing assets.')
    console.log('All assets released.')
}

const commands = {
    /**
     * The commands that can only be executed through Discord as the super 
     * user or through the server console. Indicated with a ##.
     */
    sudo: {
        stop: async function() {
            process.exit(0)
        }
    },

    /**
     * The commands that any player can execute.
     */
    game: {

    },

    /**
     * The commands that anyone can execute. Indicated with a /.
     */
    open: {

    }
}

// Exit protection
process.on('exit', onClose)
process.on('SIGINT', () => { console.log("Use 'stop' to exit.") })
process.on('SIGUSR1', onClose)
process.on('SIGUSR2', onClose)
