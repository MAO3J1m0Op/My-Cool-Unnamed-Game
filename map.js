const random = require('./random')

class GridSquare {
    /**
     * @param {string} biome the name of the biome of this square.
     * @param {string} capital the player whose capital is this square
     * (or undefined if there is no capital).
     */
    constructor(biome, capital) {
        this._biome = biome
        this.capital = capital
    }

    /**
     * @returns {Biome} the biome of this square.
     */
    get biome() {
        return module.exports.biomes[this._biome]
    }

    /**
     * @returns an object representing this object in a JSON-friendly format.
     */
    toJSON() {
        return {
            biome: this._biome,
            capital: this.capital
        }
    }
}

/**
 * Converts an object with GridSquare-like data into a GridSquare.
 */
GridSquare.fromObj = function(obj) {
    return new GridSquare(obj._biome, obj.capital)
}

/**
 * Represents a map and contains some helper functions.
 */
class GameMap {
    /**
     * @param {GridSquare[][]} arr the array containing the map's data
     */
    constructor(arr) {
        this.arr = arr
    }

    /**
     * Returns the length of the map on the X axis.
     */
    lengthX() {
        return this.arr.length
    }
    
    /**
     * Returns the length of the map on the Y axis.
     */
    lengthY() {
        return this.arr.map(arr => arr.length).reduce((a, b) => Math.min(a, b))
    }

    /**
     * Converts a map into a string of emojis to render the map for Discord.
     * @returns {string}
     */
    render() {
        return this.arr.reduce((x0, x) => {
            return x0 + x.reduce((y0, y) => {
                return y0 + ':' + y.biome.emoji + ':'
            }, '') + '\n'
        }, '')
    }

    /**
     * Sets a position on a map as a player's capital if the position is valid.
     * @param {string} player the players to assign a capital for.
     * @param {number} x the x position of the new capital.
     * @param {number} y the y position of the new capital.
     * @returns {boolean} true if the capital is in a valid position and was
     * placed, false if the capital's position is invalid.
     */
    assignCapital(player, x, y) {
        
        const distance = 2 // King move limit for capitals

        // Gets the length of the y
        
        // Bounds checks
        if (this.arr[x] === undefined ||
            this.arr[x][y] === undefined) return false
        const lowX = Math.max(x - distance, 0)
        const hiX = Math.min(x + distance + 1, this.lengthX())
        const lowY = Math.max(y - distance, 0)
        const hiY = Math.min(y + distance + 1, this.lengthY())

        // Checks the squares at and surrounding the potential capital
        if (this.arr.slice(lowX, hiX).every(arr => {
            return arr.slice(lowY, hiY).every(sq => {
                return sq.capital === null
            })
        })) {
            this.arr[x][y].capital = player
            return true
        } else return false
    }

    /**
     * @returns an object representing this object in a JSON-friendly format.
     */
    toJSON() {
        return this.arr.map(subArr => subArr.map(e => e.toJSON()))
    }
}

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

module.exports = GameMap
module.exports.GridSquare = GridSquare
module.exports.Biome = Biome

module.exports.biomes = {
    forest: new Biome('forest', 'green_square'),
    desert: new Biome('desert', 'yellow_square')
}

/**
 * Generates a new biome map and returns it.
 * @param {number} sizeX 
 * @param {number} sizeY
 * @returns {Promise<GameMap>} a promise to the completed biome map.
 */
module.exports.generateMap = async function(sizeX, sizeY) {
    let val = []
    for (let x = 0; x < Math.floor(sizeX); ++x) {
        let row = []
        for (let y = 0; y < Math.floor(sizeY); ++y) {
            row.push(new GridSquare(
                random.attribute(module.exports.biomes)
            ))
        }
        val.push(row)
    }
    return new GameMap(val)
}
