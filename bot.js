const discord = require('discord.js')
const auth = require('./auth.json')

const bot = new discord.Client();
bot.login(auth.token)

bot.on('ready', () => {
    console.log("The bot is now active.")
})
