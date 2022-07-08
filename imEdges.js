class ImEdges {
    static sides = ["Top", "Right", "Bottom", "Left"];
    constructor() {
        this.Top = [];
        this.Right = [];
        this.Bottom = [];
        this.Left = [];
    }

    static colorDistance(rgba1, rgba2) {
        rgba1 = rgba1.split(',');
        rgba1.forEach((x, i) => {rgba1[i] = x/255});
        rgba2 = rgba2.split(',');
        rgba2.forEach((x, i) => {rgba2[i] = x/255});

        let rgb1 = rgba1.slice(0, 3);
        let a1 = rgba1[3];
        rgb1.forEach((x, i) => {rgb1[i] = x * a1})
        let rgb2 = rgba2.slice(0, 3);
        let a2 = rgba2[3];
        rgb2.forEach((x, i) => {rgb2[i] = x * a2})

        return max((rgb1[0]-rgb2[0])**2, (rgb1[0]-rgb2[0] - a1+a2)**2) + 
               max((rgb1[1]-rgb2[1])**2, (rgb1[1]-rgb2[1] - a1+a2)**2) + 
               max((rgb1[2]-rgb2[2])**2, (rgb1[2]-rgb2[2] - a1+a2)**2);
    }

    static edgesEqual(edge1, edge2) {
        // determine if two edges are equivalent, meaning they have the same
        // color pattern, with about a 1% positional accurracy

        // first extract the edge color lengths and edge color data
        let edge1Lengths = [];
        let edge1Data = [];
        edge1.forEach(e => {
            let edgeData = e.split(',');
            edge1Lengths.push(int(edgeData[0]));
            edge1Data.push(edgeData.slice(1));
        })
        let edge2Lengths = [];
        let edge2Data = [];
        edge2.forEach(e => {
            let edgeData = e.split(',');
            edge2Lengths.push(int(edgeData[0]));
            edge2Data.push(edgeData.slice(1));
        })
        edge2Data.reverse();
        edge2Lengths.reverse();
        // if the number of colors aren't the same, the edges don't match
        if(edge1Lengths.length != edge2Lengths.length) {
            return false;
        }
        // if the colors themselves don't match, then the edges don't match
        if(edge1Data.toString() != edge2Data.toString()) {
            return false;
        }
        // find the maximum length of each edge
        let totalLength1 = 0;
        for(let l of edge1Lengths) {
            totalLength1 += l;
        }
        let totalLength2 = 0;
        for(let l of edge2Lengths) {
            totalLength2 += l;
        }
        let maxLength = max(totalLength1, totalLength2);
        // if the corresponding lengths are not within ~1% of the
        // maximum total length, the edges don't match
        for(let i = 0; i < edge1Lengths.length; i++) {
            if(abs(edge1Lengths[i] - edge2Lengths[i]) > (maxLength * 0.0093625)) {
                return false;
            }
        }
        // the edges passed all checks and match
        return true;
    }
    
    join(separator=',') {
        return [this.Top.join(separator),
                this.Right.join(separator),
                this.Bottom.join(separator),
                this.Left.join(separator)].join(separator);
    }

    add_edge(edgeStr, edgeIm) {
        edgeIm.loadPixels();
        let edgeData = edgeIm.pixels;
        // round all rgba values to nearest 10s, e.g. 247 -> 250, 14 -> 10
        // edgeData.forEach((x,i) => {edgeData[i] = Math.round(x*0.1)*10});
        let rgba_str = [];
        for(let i = 0; i < edgeData.length; i+=4) {
            rgba_str.push(edgeData.slice(i, i+4).join(','))
        }
        // encoding for edge pixels [number of pixels with the following pixel value, pixel value]
        // ex.
        // rgba_str == ['1,1,1,1', '1,1,1,1', '1,1,1,1', '1,2,2,2', '10,255,0,255', '10,255,0,255']
        // =>
        // ['3,1,1,1,1', '1,1,2,2,2', '2,10,255,0,255']
        let rgba_encoded_str = [];
        let num_current_pattern = 1;
        let current_pattern = rgba_str[0];
        for(let pattern of rgba_str.slice(1)) {
            if(current_pattern == pattern) {
                num_current_pattern++;
            }
            else {
                // find the color distance
                // let colorDist = ImEdges.colorDistance(current_pattern, pattern);
                // console.log(colorDist)
                // ignore one pixel patterns
                if(num_current_pattern != 1) {
                    rgba_encoded_str.push([num_current_pattern, current_pattern].join(','));
                    num_current_pattern = 1;
                }
                current_pattern = pattern;
            }
        }
        rgba_encoded_str.push([num_current_pattern, current_pattern].join(','));
        this[edgeStr] = rgba_encoded_str;
    }
}
