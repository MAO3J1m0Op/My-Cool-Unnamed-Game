const random = require('./random')

class Biome {
    /**
     * @param {string} name the name of the biome.
     * @param {string} emoji the emoji that represents a tile of this biome.
     */
    constructor(name, emoji) {
        this.name = name
        this.emoji = emoji
    }
    toString() {
        return this.name
    }
}
module.exports.Biome = Biome

module.exports.biomes = {
    forest: new Biome('forest', ':green_square:'),
    desert: new Biome('desert', ':yellow_square:')
}

class GridSquare {
    /**
     * @param {Biome} biome the biome of this square.
     * @param {string | null} capital the player whose capital is this square
     * (or null if there is no capital).
     */
    constructor(biome, capital = null) {
        this.biome = biome
        this.capital = capital
    }
}
module.exports.GridSquare = GridSquare

/**
 * Generates a new biome map and returns it.
 * @param {number} sizeX 
 * @param {number} sizeY
 * @returns {Promise<GridSquare[][]>} a promise to the completed biome map.
 */
module.exports.generateMap = function(sizeX, sizeY) {
    let val = []
    for (let x = 0; x < Math.floor(sizeX); ++x) {
        let row = []
        for (let y = 0; y < Math.floor(sizeY); ++y) {
            row.push(new GridSquare(
                module.exports.biomes[random.attribute(module.exports.biomes)]
            ))
        }
        val.push(row)
    }
    return val
}

/**
 * Converts a map into a string of emojis to render the map for Discord.
 * @param {GridSquare[][]} map the map to render.
 */
module.exports.render = function(map) {
    return map.reduce((x0, x) => {
        return x0 + x.reduce((y0, y) => {
            return y0 + '\\' + y.biome.emoji
        }, '') + '\n'
    }, '')
}

/**
 * Sets a position on a map as a player's capital if the position is valid.
 * @param {GridSquare[][]} map the map to assign capitals to.
 * @param {string} player the players to assign a capital for.
 * @param {number} x the x position of the new capital.
 * @param {number} y the y position of the new capital.
 * @returns {boolean} true if the capital is in a valid position and was
 * placed, false if the capital's position is invalid.
 */
module.exports.assignCapital = function(map, player, x, y) {
    
    const distance = 2 // King move limit for capitals

    // Gets the length of the y
    const lenY = map.map(arr => arr.length).reduce((a, b) => Math.min(a, b))
    
    // Bounds checks
    const lowX = Math.max(x - distance, 0)
    const hiX = Math.min(x + distance + 1, map.length)
    const lowY = Math.max(y - distance, 0)
    const hiY = Math.min(y + distance + 1, lenY)

    // Checks the squares at and surrounding the potential capital
    if (map.slice(lowX, hiX).every(arr => {
        return arr.slice(lowY, hiY).every(sq => {
            return sq.capital === null
        })
    })) {
        map[x][y].capital = player
        return true
    } else return false
}
