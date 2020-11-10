const Command = require('./Command.js')

/**
 * The commands that can only be executed through Discord as the super 
 * user or through the server console. Indicated with a ##.
 */
module.exports = {
    // The testing function
    ping: new Command(async function() {
        return 'pong'
    })
}
