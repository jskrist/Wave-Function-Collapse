function reverseString(s) {
  return s.split('').reverse().join('');
}

class Tile {
  constructor(img, edges) {
    this.img = img;
    this.edges = edges;
    this.up = [];
    this.right = [];
    this.down = [];
    this.left = [];
  }

  analyze(tiles) {
    for (let i = 0; i < tiles.length; i++) {
      // console.log("tile: " + i)
      let tile = tiles[i];
      // UP
      if (ImEdges.edgesEqual(tile.edges.Bottom, this.edges.Top)) {
        this.up.push(i);
      }
      // RIGHT
      if (ImEdges.edgesEqual(tile.edges.Left, this.edges.Right)) {
        this.right.push(i);
      }
      // DOWN
      if (ImEdges.edgesEqual(tile.edges.Top, this.edges.Bottom)) {
        this.down.push(i);
      }
      // LEFT
      if (ImEdges.edgesEqual(tile.edges.Right, this.edges.Left)) {
        this.left.push(i);
      }
    }
  }

  rotate(num) {
    const w = this.img.width;
    const h = this.img.height;
    const newImg = createGraphics(w, h);
    newImg.imageMode(CENTER);
    newImg.translate(w / 2, h / 2);
    newImg.rotate(HALF_PI * num);
    newImg.image(this.img, 0, 0);

    const newEdges = new ImEdges();
    const len = ImEdges.sides.length;
    for (let i = 0; i < len; i++) {
      let new_edge_ind = (i+num) % len;
      newEdges[ImEdges.sides[new_edge_ind]] = this.edges[ImEdges.sides[i]];
    }
    return new Tile(newImg, newEdges);
  }
}
