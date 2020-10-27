/**
 * The commands that can only be executed through Discord as the super 
 * user or through the server console. Indicated with a ##.
 */
module.exports = {
    stop: function() {
        process.exit(0)
    },

    // The testing function
    ping: async function() {
        return 'pong'
    }
}
