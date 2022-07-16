let tiles = [];
let tileImages = [];
let fileList = [];
let grid = [];
let seed = 8;

const DEBUG = false;
const DIM_X = 30;
const DIM_Y = 20;
let w;
let h;

function setup() {
  noLoop();
  const canvas = createCanvas(600, 400);
  canvas.parent('canvas');
  w = width / DIM_X;
  h = height / DIM_Y;
  startOver();
  drawBackground();
  const inputElement = document.getElementById("tileImages");
  inputElement.addEventListener("change", loadSelectedImages, false);
  textAlign(LEFT, TOP);
  textSize(8);
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
  if(!DEBUG) loop();
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
  if(DEBUG) randomSeed(seed);
  grid = [];
  // Create cell for each spot on the grid
  for (let i = 0; i < DIM_X * DIM_Y; i++) {
    grid[i] = new Cell(tiles.length);
  }
  // loop();
}

function draw() {
  if(tiles.length < 1) {
    return;
  }
  drawBackground();
  if(DEBUG) drawNumOptions();

  // Pick cell with least entropy
  // first get a list of only the un-collapsed cells
  let gridCopy = grid.slice();
  gridCopy = gridCopy.filter((a) => !a.collapsed);
  // if there aren't any, then the image is complete, so we can stop now
  if (gridCopy.length == 0) {
    console.log('Image Complete');
    noLoop();
    return;
  }
  // sort the list by the number of options remaining for each cell
  gridCopy.sort((a, b) => {
    return a.options.length - b.options.length;
  });
  // get the number of options in the first cell (which will now contain the
  // lowest nunmber of options), and figure out how many more cells have the
  // same number of options left
  let len = gridCopy[0].options.length;
  let stopIndex = 0;
  for (let i = 0; i < gridCopy.length; i++) {
    if (gridCopy[i].options.length > len) {
      stopIndex = i;
      break;
    }
  }
  // cut off all the cells that have more options than the first cell
  if (stopIndex > 0) gridCopy.splice(stopIndex);

    // select a random cell to collapse
    const cell = random(gridCopy);
    // collapse it by picking a random option from its remaining options
    cell.collapsed = true;
    const pick = random(cell.options);
    cell.options = [pick];

  // update cell valid options
  updateValidNeighbors();
}

function drawBackground() {
  background(0);

  for (let j = 0; j < DIM_Y; j++) {
    for (let i = 0; i < DIM_X; i++) {
      let cell = grid[xy2ind(i, j)];
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

function drawNumOptions() {
  fill(255);
  for(let y = 0; y < DIM_Y; y++) {
    for(let x = 0; x < DIM_X; x++) {
      text(grid[x + y * DIM_X].options.length, x*w, y*h);
    }
  }
}

function combineOptions(optionsToCheck, directionToCheck, validOptions = new Set()) {
  let tmpValidOptions = new Set();
  for (let option of optionsToCheck) {
    let valid = tiles[option][directionToCheck];
    valid.forEach(x => {tmpValidOptions.add(x)})
  }
  return intersection(validOptions, tmpValidOptions);
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

function updateValidNeighbors(tryToReset = true) {
  toUpdate = [];
  for (let y = 0; y < DIM_Y; y++) {
    for (let x = 0; x < DIM_X; x++) {
      let index = xy2ind(x, y);
      let cell = grid[index];
      if (!cell.collapsed) {
        // start out assuming all options are valid
        let validOptions = new Set(Array(tiles.length).fill(0).map((x,i) => i));
        // Look up
        if (y > 0) {
          let up = grid[xy2ind(x, y - 1)];
          validOptions = combineOptions(up.options, 'down', validOptions);
        }
        // Look right
        if (x < DIM_X - 1) {
          let right = grid[xy2ind(x + 1, y)];
          validOptions = combineOptions(right.options, 'left', validOptions);
        }
        // Look down
        if (y < DIM_Y - 1) {
          let down = grid[xy2ind(x, y + 1)];
          validOptions = combineOptions(down.options, 'up', validOptions);
        }
        // Look left
        if (x > 0) {
          let left = grid[xy2ind(x - 1, y)];
          validOptions = combineOptions(left.options, 'right', validOptions);
        }
        // if there are no valid options, then we need to deal with that
        if(validOptions.size == 0) {
          if(DEBUG) console.log('no valid options [' + x + ', ' + y + ']');
          // start over
          startOver();
          return;
        }
        // save the index and options for later
        toUpdate.push([index, validOptions]);
      }
    }
  }
  for (updateData of toUpdate) {
    // delete old cell and replace it with a new one
    delete grid[updateData[0]]
    grid[updateData[0]] = new Cell(Array.from(updateData[1]));
  }
}

function getIndicesFromCell(cell) {
  let x = undefined;
  let y = undefined;
  for(let ind = 0; ind < grid.length; ind++) {
    if(grid[ind] == cell) {
      x = ind % DIM_X;
      y = Math.floor(ind / DIM_X);
      break;
    }
  }
  return {x, y};
}

function xy2ind(x,y) {
  return x + (y * DIM_X);
}

function resetCellAndNeighbors(cell) {
  // originally intended to reset just the cell and its neighbors, it
  // seems that this function may also need to clear a line to an edge
  inds = getIndicesFromCell(cell);
  let x = inds.x;
  let y = inds.y;

  allOptions = Array(tiles.length).fill(0).map((x,i) => i);
  // un-collapse cell;
  cell.collapsed = false;
  cell.options = allOptions.slice();
  // un-collapse neighbors
  // Up Neighbor
  if(y > 0) {
    let up = grid[xy2ind(x, y - 1)];
    up.collapsed = false;
    up.options = allOptions.slice();
  }
  if (y > 0 && x < DIM_X - 1) {
    let upright = grid[xy2ind(x + 1, y - 1)];
    upright.collapsed = false;
    upright.options = allOptions.slice();
  }
  // Right Neighbor
  if (x < DIM_X - 1) {
    let right = grid[xy2ind(x + 1, y)];
    right.collapsed = false;
    right.options = allOptions.slice();
  }
  if (y < DIM_Y - 1 && x < DIM_X - 1) {
    let downright = grid[xy2ind(x + 1, y + 1)];
    downright.collapsed = false;
    downright.options = allOptions.slice();
  }
  // Down Neighbor
  if (y < DIM_Y - 1) {
    let down = grid[xy2ind(x, y + 1)];
    down.collapsed = false;
    down.options = allOptions.slice();
  }
  if (y < DIM_Y - 1 && x > 0) {
    let downleft = grid[xy2ind(x - 1, y + 1)];
    downleft.collapsed = false;
    downleft.options = allOptions.slice();
  }
  // Left Neighbor
  if (x > 0) {
    let left = grid[xy2ind(x - 1, y)];
    left.collapsed = false;
    left.options = allOptions.slice();
  }
  if (y > 0 && x > 0) {
    let upleft = grid[xy2ind(x - 1, y - 1)];
    upleft.collapsed = false;
    upleft.options = allOptions.slice();
  }
  // clear a line to each edge
  let dw = DIM_X - x;
  let dh = DIM_Y - y;
  // clear path to the left edge of the grid
  for(let i = 2; i < x; i++) {
    let tmp_cell = grid[xy2ind(x - i, y)];
    tmp_cell.collapsed = false;
    tmp_cell.options = allOptions.slice();
  }
  // clear path to the top edge of the grid
  for(let j = 2; j < y; j++) {
    let tmp_cell = grid[xy2ind(x, y - j)];
    tmp_cell.collapsed = false;
    tmp_cell.options = allOptions.slice();
  }
  // clear path to the right edge of the grid
  for(let i = 2; i < dw; i++) {
    let tmp_cell = grid[xy2ind(x + i, y)];
    tmp_cell.collapsed = false;
    tmp_cell.options = allOptions.slice();
  }
  // clear path to the bottom edge of the grid
  for(let j = 2; j < dh; j++) {
    let tmp_cell = grid[xy2ind(x, y + j)];
    tmp_cell.collapsed = false;
    tmp_cell.options = allOptions.slice();
  }
}

function showNeighbors(tile) {
  drawBackground();
  thisTile = tiles[tile];
  // show this tile in the center 
  let centerX = floor(DIM_X/2);
  let centerY = floor(DIM_Y/2);

  image(thisTile.img, centerX*w, centerY*h, w, h)
  // top neighbors
  for(let i = 0; i < thisTile.up.length; i++) {
    image(tiles[thisTile.up[i]].img, centerX*w, (centerY - 1 - i) * h, w, h)
  }
  // right neighbors
  for(let i = 0; i < thisTile.right.length; i++) {
    image(tiles[thisTile.right[i]].img, (centerX + 1 + i)*w, centerY * h, w, h)
  }
  // bottom neighbors
  for(let i = 0; i < thisTile.down.length; i++) {
    image(tiles[thisTile.down[i]].img, centerX*w, (centerY + 1 + i) * h, w, h)
  }
  // left neighbors
  for(let i = 0; i < thisTile.left.length; i++) {
    image(tiles[thisTile.left[i]].img, (centerX - 1 - i)*w, centerY * h, w, h)
  }
}

function showAllTiles() {
  for(let i = 0; i < tiles.length; i++) {
    image(tiles[i].img, (i % DIM_X) * w, (i >= DIM_X) * h, w, h)
  }
}

function mousePressed() {
  if(DEBUG) redraw();
}
