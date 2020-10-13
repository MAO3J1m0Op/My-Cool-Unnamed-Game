const random = require('./random')

class Biome {
    /**
     * @param {string} name the name of the biome.
     */
    constructor(name) {
        this.name = name
    }
}
module.exports.Biome = Biome

module.exports.biomes = {
    forest: new Biome('forest'),
    desert: new Biome('desert')
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
module.exports.generateMap = async function(sizeX, sizeY) {
    let val = []
    for (let x = 0; x < Math.floor(sizeX); ++x) {
        let row = []
        for (let y = 0; y < Math.floor(sizeY); ++y) {
            row.push(new GridSquare(random.attribute(module.exports.biomes)))
        }
        val.push(row)
    }
    return val
}

/**
 * Assigns each player a capital on the map. The function may loop indefinitely
 * if there is inadequate space for all of the capitals.
 * @param {GridSquare[][]} map the map to assign capitals to.
 * @param {string[]} players the players to assign capitals for.
 */
module.exports.assignCapitals = async function(map, players) {

    let capitals = []
    
    // Get size of map
    let maxX = map.length
    
    // Smallest of the y array
    let maxY = map.map(arr => arr.length).reduce((a, b) => Math.min(a, b))

    for (let p = 0; p < players.length; ++p) {
        
        // Loops until the capital is in a valid position
        while (true) {

            let x = random.randint(0, maxX)
            let y = random.randint(0, maxY)

            // Validates position based on each capital.
            if (capitals.every(c => {

                // Capitals must be at least 2 king-moves away from each other.
                let distanceX = x - c.x
                let distanceY = y - c.y
                return Math.abs(distanceX) > 2 && Math.abs(distanceY) > 2

            })) {

                // All checks pass! The selected x and y value is a capital!
                capitals.push({ x: x, y: y})
                break
            }
        }
    }

    // Write the capitals to their squares
    for (let c = 0; c < capitals.length; ++c) {
        let coord = capitals[c]
        map[coord.x][coord.y].capital = players[c]
    }
}
