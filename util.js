/**
 * Chunks a message into pieces that fall under Discord's character limit, then
 * sends each chunk as individual messages.
 * @param {*} content the message content to chunk
 * @param {(content: string) => Promise<*>} sendFunction 
 * the function that sends the message
 */
module.exports.chunkMessage = async function(content, sendFunction) {
    let lines = content.split('\n')

    const MAX_MESSAGE_LENGTH = 2000
    const LINE_OMISSION_MESSAGE = 'Line of text omitted from message '
        + 'due to its length.'

    // Are any lines over the character limit?
    for (let i = 0; i < lines.length; ++i) {
        if (lines[i].length > MAX_MESSAGE_LENGTH) {
            console.log(LINE_OMISSION_MESSAGE)
            console.log(lines[i])
            lines[i] = `[ ${LINE_OMISSION_MESSAGE} ]`
        }
    }

    // Chunk lines to minimize the amount of messages that need to be sent
    let chunks = []
    let chunk = ''
    for (let i = 0; i < lines.length; ++i) {

        // Stop when the combining would result in a too-long message
        if ((chunk + lines[i]).length > MAX_MESSAGE_LENGTH) {
            chunks.push(chunk)
            chunk = lines[i] // Start new chunk

        // Otherwise add this line to the previous message
        } else {
            chunk += '\n' + lines[i]
        }
    }

    // Push the last chunk
    chunks.push(chunk)

    // Send each chunk as a message
    // Reply to each message as a callback to the previous message.
    return chunks.reduce((prevPromise, chunk) => {
        return prevPromise.then(() => sendFunction(chunk))
    }, Promise.resolve())
}
