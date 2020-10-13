const discord = require('discord.js')

const auth = require('./auth.json')

const commands = require('./commands')

const bot = new discord.Client();
bot.login(auth.token)

bot.on('ready', () => {
    console.log("The bot is now active.")
})

bot.on('message', msg => {
    // sudo commands
    checkRunCommand(msg, '##', commands.sudo, (sender, guild, channel) => {

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
 * @param {*} command_obj the object containing the command lookup.
 * @param {(
 *   sender: discord.User, 
 *   guild: discord.Guild,
 *   channel: discord.Channel
 * ) => void} verification a function called to verify all the conditions
 * required to execute a given type of command. If the function executes 
 * successfully, then the command will be run. If the function throws an
 * error, the error will be printed and the command ignored. If the error 
 * message is "", nothing will be sent and the command will still be ignored.
 */
function checkRunCommand(msg, denoter, command_obj, 
    verification = () => {}) {
    if (msg.content.startsWith(denoter)) {
        let argv = msg.content.substring(denoter.length).split(' ')
        let sender = msg.author
        let guild = msg.guild
        let channel = msg.channel
        
        // Runs the verification function
        try {
            verification(sender, guild, channel)
        } catch (fail) {
            msg.reply(fail)
            return
        }

        // Reply with the command's return value.
        try {
            output = command_obj[argv[0]](argv, sender, guild, channel)
        } catch (err) {
            msg.reply("Sorry, I don't understand that command.")
            return
        }

        msg.reply(output)
    }
}

// Parses sudo commands entered through console
var stdin = process.openStdin()
stdin.addListener('data', function(command) {
    let argv = command.toString().trim().split(' ')
    try {
        console.log(commands.sudo[argv[0]](argv, '[console]', null, null))
    } catch (err) {
        console.log(err)
    }
})
