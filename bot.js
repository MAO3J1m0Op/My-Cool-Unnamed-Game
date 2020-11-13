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
    reply(checkRunCommand(msg, '##', commands.sudo, (sender, guild, channel) => {

        // The sender must be the "super user".
        if (sender.id !== auth.super_user)
            throw ('You are not the super user!')
    }))

    // server admin commands
    reply(checkRunCommand(msg, '!', commands.server_admin, async (sender, guild, channel) => {

        // The sender must be a server admin
        if (guild === null) 
            throw 'You must be in a guild to run this kind of command.'
        
        if (!(await guild.members.fetch(sender.id)).hasPermission('ADMINISTRATOR'))
            throw 'You must be a server administrator to run this command.'
    }))

    // Game commands
    reply(checkRunCommand(msg, '/', commands.game))

    // Check if the message is on the signups channel
    data.get().then(dat => {
        if (msg.channel.id === dat.channels.signups) {
            reply(passToCommand(msg, commands.other.signup))
        }
    }).catch(() => {})
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
 * @returns {Promise<{ input: discord.Message, output: string }>} an object containing both the
 * input message and the command output.
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
            return { input: msg, output: fail }
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
 * @returns {Promise<{ input: discord.Message, output: string }>} an object containing both the
 * input message and the command output.
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
    
    return { input: msg, output: output }
}

/**
 * Replies to a given message.
 * @param {Promise<{ input: discord.Message, output: string }>} ioObj the message to reply to and
 * the command output (or other string) to send to reply to the given message.
 */
async function reply(ioObj) {

    // Wait for the command to finish executing
    let io = await ioObj

    // Checks if output is undefined, null, or anything else Discord doesn't like.
    // Just an indication that the command was done.
    if (!io || !io.output) return

    io.input.reply(io.output).catch(err => {
        console.error(err)
        console.error('Offending message: "' + io.output + '"')
        io.input.reply('The command was executed, '
            + 'but there was an error sending the message.')
    })
}

// Parses sudo commands entered through console
process.stdin.resume()
process.stdin.addListener('data', async function(command) {
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
 * Calls close()
 */
commands.sudo.stop = new commands.Command(async function() {
    // Calls onClose function after 5 seconds.
    const DELAY_STOP_TIME = data.settings.botCloseDelaySeconds
    console.log(`Bot closing in ${DELAY_STOP_TIME} seconds.`)
    setTimeout(close, DELAY_STOP_TIME * 1000);
    return 'Goodbye!'
})

/**
 * Closes everything. After this function is called and resolves, everything
 * should exit gracefully.
 */
async function close() {
    console.log('Releasing assets.')
    bot.destroy()
    process.stdin.destroy()
    let dat = data.close()

    // Place any additional promises in this await statement
    await Promise.all([dat])
    console.log('All assets released.')
}

// Exit protection
process.on('SIGINT', () => { console.log("\nUse 'stop' to exit.") })
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Promise Rejection in: Promise', promise + '\nreason:', reason)
})
