const Command = require('./Command.js')
const data = require('../data.js')

/**
 * The commands that can only be executed through Discord as the super 
 * user or through the server console. Indicated with a ##.
 */
module.exports = {
    // The testing function
    ping: new Command(async function() {
        return 'pong'
    }),

    /**
     * Calls reload in data.js.
     */
    reload: new Command(async function(argv) {
        let noFiles = argv[1] === 'noFiles'
        await data.reload(noFiles)
        return 'Reload complete.'
    }),

    savenow: new Command(async function() {
        await data.save()
        return 'Saved data.'
    })
}
