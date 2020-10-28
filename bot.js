const discord = require('discord.js')

const commands = require('./commands.js')
const auth = require('./auth.json')
const data = require('./data.js')

const bot = new discord.Client();
bot.login(auth.token)

bot.on('ready', () => {
    console.log("The bot is now active.")
})

bot.on('message', msg => {

    // Ignore any and all bot message
    if (msg.author.id === bot.user.id) return

    // sudo commands
    checkRunCommand(msg, '##', commands.sudo, (sender, guild, channel) => {

        // The sender must be the "super user".
        if (sender.id !== auth.super_user)
            throw ('You are not the super user!')
    })

    // server admin commands
    checkRunCommand(msg, '!', commands.server_admin, async (sender, guild, channel) => {

        // The sender must be a server admin
        let authorAsMember = await guild.members.fetch(sender.id)
        if (authorAsMember === undefined) 
            throw 'You must be in a guild to run this kind of command.'
        
        if (!authorAsMember.hasPermission('ADMINISTRATOR'))
            throw 'You must be a server administrator to run this command.'
    })

    // Game commands
    checkRunCommand(msg, '/', commands.game)

    // Check if the message is on the signups channel
    if (msg.channel.id === data.get().channels.signups) {
        passToCommand(msg, commands.other.signup)
    }
})

/**
 * Checks if a given message is a command, then runs the command requested.
 * @param {discord.Message} msg the message sent that must be checked for 
 * as a command.
 * @param {string} denoter the text used to verify that the text sent is
 * a command.
 * @param {{[command: string]: commands.Command}} command_obj the object containing the command lookup.
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
        try {
            await verification(sender, guild, channel)
        } catch (fail) {
            return fail
        }

        return passToCommand(msg, command_obj[argv[0]], argv)
    }
}

/**
 * Passes a message to a given command and sends the output as a reply.
 * @param {discord.Message} msg the message to prepare and pass.
 * @param {commands.Command} command the command to pass the message to.
 * @param {string[] | undefined} argv the optional argv to use instead of the
 * message body. If undefined is passed, the message body will be used instead.
 * @returns {string} the command output.
 */
async function passToCommand(msg, command, argv) {
    
    // Get command input
    if (argv === undefined) argv = msg.content.split(' ')
    const sender = msg.author
    const guild = msg.guild
    const channel = msg.channel

    let output

    // Ensures the command is a command
    if (!(command instanceof commands.Command))
        output = "Sorry, I don't understand that command."
    
    else {
        // Reply with the command's return value
        try {
            output = await command.execute(argv, sender, guild, channel)
        } catch (err) {
            console.error('An error was thrown executing the following:')
            console.error('  Command: ' 
                + argv.join(' '))
            console.error('  Sender: ' + sender)
            console.error('  Guild: ' + guild)
            console.error('  Channel: ' + channel)
            console.error(err)
            output = "Something went wrong executing your command."
        }
    }

    // Checks if output is undefined, null, or anything else Discord doesn't like.
    // Just an indication that the command was done.
    if (!output) output = 'Done!'
    
    msg.reply(output).catch(err => {
        console.error(err)
        msg.reply('The command was executed, '
            + 'but there was an error sending the message.')
    })

    return output
}

// Parses sudo commands entered through console
var stdin = process.openStdin()
stdin.addListener('data', async function(command) {
    let argv = command.toString().trim().split(' ')
    let output
    try {
        output = await commands.sudo[argv[0]].execute(argv, '[console]', null, null)
    } catch (err) {
        output = err
    }
    console.log(output)
})

/**
 * Releases all of the bot's assets.
 */
function onClose() {
    console.log('Releasing assets.')
    console.log('All assets released.')
}

// Exit protection
process.on('exit', onClose)
process.on('SIGINT', () => { console.log("\nUse 'stop' to exit.") })
process.on('SIGUSR1', onClose)
process.on('SIGUSR2', onClose)
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Promise Rejection in: Promise', promise + '\nreason:', reason.stack)
})
