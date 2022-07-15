let tiles = [];
let tileImages = [];
let fileList = [];
let grid = [];
let seed = 8;

const DIM = 20;

function setup() {
  const canvas = createCanvas(400, 400);
  canvas.parent('canvas');
  startOver();
  noLoop();
  drawBackground();
  const inputElement = document.getElementById("tileImages");
  inputElement.addEventListener("change", loadSelectedImages, false);
}

function loadSelectedImages() {
  noLoop();
  tiles = [];
  tileImages = [];
  fileList = this.files;
  for (let i = 0; i < fileList.length; i++) {
    imagePath = './tiles/' + fileList[i].webkitRelativePath;
    loadImage(imagePath, addToTileImages);
  }
}

function addToTileImages(im) {
  tileImages.push(im);
  if(tileImages.length == fileList.length) {
    asyncSetup();
  }
}

function asyncSetup() {
  randomSeed(0);

  // Loaded and created the tiles in preload()
  // process the edges of each image now
  for (let im of tileImages) {
    edges = new ImEdges();
    // Top edge of image
    edgeIm = im.get(0, 0, im.width, 1);
    edges.add_edge('Top', edgeIm);
    // Right edge of image
    edgeIm = im.get(im.width-1, 0, 1, im.height);
    edges.add_edge('Right', edgeIm);
    // Bottom edge of image
    edgeIm = im.get(0, im.height-1, im.width, 1);
    edges.add_edge('Bottom', edgeIm);
    edges.Bottom.reverse()
    // Left edge of image
    edgeIm = im.get(0, 0, 1, im.height);
    edges.add_edge('Left', edgeIm);
    edges.Left.reverse()
    tiles.push(new Tile(im, edges));
  }

  const initialTileCount = tiles.length;
  let tempTiles = [];
  for (let i = 0; i < initialTileCount; i++) {
    let tileRotations = [];
    for (let j = 0; j < 4; j++) {
      tileRotations.push(tiles[i].rotate(j));
    }
    tileRotations = removeDuplicatedTiles(tileRotations);
    tempTiles = tempTiles.concat(tileRotations);
  }
  tiles = tempTiles;

  // Generate the adjacency rules based on edges
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    tile.analyze(tiles);
  }

  startOver();
  // noLoop();
}

function removeDuplicatedTiles(tiles) {
  const uniqueTilesMap = {};
  for (const tile of tiles) {
    const key = tile.edges.join(','); // ex: "ABB,BCB,BBA,AAA"
    uniqueTilesMap[key] = tile;
  }
  return Object.values(uniqueTilesMap);
}

function startOver() {
  randomSeed(seed);
  grid = [];
  // Create cell for each spot on the grid
  for (let i = 0; i < DIM * DIM; i++) {
    grid[i] = new Cell(tiles.length);
  }
  loop();
}

function draw() {
  
  drawBackground();

  // Pick cell with least entropy
  let gridCopy = grid.slice();
  gridCopy = gridCopy.filter((a) => !a.collapsed);

  if (gridCopy.length == 0) {
    console.log('Image Complete');
    noLoop();
    return;
  }
  gridCopy.sort((a, b) => {
    return a.options.length - b.options.length;
  });

  let len = gridCopy[0].options.length;
  let stopIndex = 0;
  for (let i = 0; i < gridCopy.length; i++) {
    if (gridCopy[i].options.length > len) {
      stopIndex = i;
      break;
    }
  }

  if (stopIndex > 0) gridCopy.splice(stopIndex);
  const cell = random(gridCopy);
  if(cell === grid[135]) {
    console.log('found it')
  }
  cell.collapsed = true;
  const pick = random(cell.options);
  if (pick === undefined) {
    startOver();
    return;
  }
  cell.options = [pick];

  let nextGrid = [];
  for (let j = 0; j < DIM; j++) {
    for (let i = 0; i < DIM; i++) {
      let index = i + j * DIM;
      if (grid[index].collapsed) {
        nextGrid[index] = grid[index];
      } else {
        let validOptions = new Set();
        // Look up
        if (j > 0) {
          let up = grid[i + (j - 1) * DIM];
          validOptions = combineOptions(up.options, 'down', validOptions);
        }
        // Look right
        if (i < DIM - 1) {
          let right = grid[i + 1 + j * DIM];
          validOptions = combineOptions(right.options, 'left', validOptions);
        }
        // Look down
        if (j < DIM - 1) {
          let down = grid[i + (j + 1) * DIM];
          validOptions = combineOptions(down.options, 'up', validOptions);
        }
        // Look left
        if (i > 0) {
          let left = grid[i - 1 + j * DIM];
          validOptions = combineOptions(left.options, 'right', validOptions);
        }
        if(validOptions.size == 0) {
          validOptions = Array(tiles.length).fill(0).map((x,i) => i);
        }

        // I could immediately collapse if only one option left?
        nextGrid[index] = new Cell(Array.from(validOptions));
      }
    }
  }

  grid = nextGrid;
}

function drawBackground() {
  background(0);

  const w = width / DIM;
  const h = height / DIM;
  for (let j = 0; j < DIM; j++) {
    for (let i = 0; i < DIM; i++) {
      let cell = grid[i + j * DIM];
      if (cell.collapsed) {
        let index = cell.options[0];
        image(tiles[index].img, i * w, j * h, w, h);
      } else {
        noFill();
        stroke(51);
        rect(i * w, j * h, w, h);
      }
    }
  }
}

function combineOptions(optionsToCheck, directionToCheck, validOptions = new Set()) {
  let tmpValidOptions = new Set();
  for (let option of optionsToCheck) {
    let valid = tiles[option][directionToCheck];
    valid.forEach(x => {tmpValidOptions.add(x)})
  }
  if(validOptions.size > 0) {
    return intersection(validOptions, tmpValidOptions);
  }
  else {
    return tmpValidOptions;
  }
}

function intersection(setA, setB) {
  const _intersection = new Set();
  for (const elem of setB) {
    if (setA.has(elem)) {
      _intersection.add(elem);
    }
  }
  return _intersection;
}

function showNeighbors(tile) {
  drawBackground();
  thisTile = tiles[tile];
  w = width / DIM;
  h = height / DIM;
  // show this tile in the center
  image(thisTile.img, 15*w, 15*h, w, h)
  // top neighbors
  for(let i = 0; i < thisTile.up.length; i++) {
    image(tiles[thisTile.up[i]].img, 15*w, (14 - i) * h, w, h)
  }
  // right neighbors
  for(let i = 0; i < thisTile.right.length; i++) {
    image(tiles[thisTile.right[i]].img, (16+i)*w, 15 * h, w, h)
  }
  // bottom neighbors
  for(let i = 0; i < thisTile.down.length; i++) {
    image(tiles[thisTile.down[i]].img, 15*w, (16+i) * h, w, h)
  }
  // left neighbors
  for(let i = 0; i < thisTile.left.length; i++) {
    image(tiles[thisTile.left[i]].img, (14-i)*w, 15 * h, w, h)
  }
}

function showAllTiles() {
  w = width / DIM;
  h = height / DIM;
  for(let i = 0; i < tiles.length; i++) {
    image(tiles[i].img, (i % 25) * w, (20 + (i >= 25)) * h, w, h)
  }
}

// function mousePressed() {
//   redraw();
// }
