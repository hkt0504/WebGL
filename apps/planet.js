/**
 * Created by w1 on 6/29/2015.
 * Handle procedural planet creation.
 * Procedural planet can be created using method:
 * 1. http://www.shaneenishry.com/blog/2014/08/02/planet-generation-part-ii/
 *      Height map will be generated using Perlin noise.
 *      https://en.wikipedia.org/wiki/Perlin_noise
 *      The one offer simpler & faster implementation
 *      It has disadvantages:
 *      a. the property of a perlin noise is not really what we want from a planet.
 *      b. the boundary of cube map signify some edge pattern
 * 2. https://experilous.com/1/blog/post/procedural-planet-generation
 *      A planet consist of tiles of penta, hexa, septa -gon.
 *      Elevation created using using simple interaction between tectonic plates.
 * This module use method #2
 */

Planet = function (options) {
    /**
     * Planet construction steps:
     * 1. Icosahedrons
     * 2. subdivision of icosahedron
     * 3. (optional) add irregularities
     * 4. convert to dual polyhedron.
     *      After this step we will have 5,6,7 -gon tiles.
     * 5. Flooded with tectonic plates
     * 6. Simulate plates movements
     * 7. Add whether effects, rotation effects (ellipsoid)
     */

    VG.Render.SceneNode.call(this);
    var def = {

    };
    this.options = Util.initOptions(options, def);

};

Planet.prototype = Object.create(VG.Render.SceneNode.prototype);

Planet.prototype.icosahedrons = function () {
    /**
     * Set this vertices to icosahedrons
     * @private method
     */

    // http://rbwhitaker.wikidot.com/index-and-vertex-buffers
    var phi = (1+Math.sqrt(5))/2; // golden ratio
    this.vertices = {
        position: [
            new VG.Math.Vector3(-1, 0, phi),
            new VG.Math.Vector3(1, 0, phi),
            new VG.Math.Vector3(-1, 0, -phi),
            new VG.Math.Vector3(1, 0, -phi),
            new VG.Math.Vector3(0, phi, 1),
            new VG.Math.Vector3(0, phi, -1),
            new VG.Math.Vector3(0, -phi, 1),
            new VG.Math.Vector3(0, -phi, -1),
            new VG.Math.Vector3(phi, 1, 0),
            new VG.Math.Vector3(-phi, 1, 0),
            new VG.Math.Vector3(phi, -1, 0),
            new VG.Math.Vector3(-phi, -1, 0)
        ]
    };
    this.indices = [
        [0, 6, 1],
        [0, 11, 6],
        [1, 4, 0],
        [1, 8, 4],
        [1, 10, 8],
        [2, 5, 3],
        [2, 9, 5],
        [2, 11, 9],
        [3, 7, 2],
        [3, 10, 7],
        [4, 8, 5],
        [4, 9, 0],
        [5, 8, 3],
        [5, 9, 4],
        [6, 10, 1],
        [6, 11, 7],
        [7, 10, 6],
        [7, 11, 2],
        [8, 10, 3],
        [9, 11, 0]
    ];
    for (var i = 0; i < this.vertices.position.length; i++) {
        this.vertices.position[i].normalize();
    }
};

Planet.prototype.subdivide = function () {
    /**
     * 1 level subdivision of each triangles in indices
     * New vertices will be normalized to have length 1,
     * since we want spherical surface.
     * @precondition:
     *  1. each poly is triangle.
     *  2. each vertices is normalized
     * @postcondition:
     *  1. #vertices = #old_vertices + #old_faces(indices)
     *  2. each vertices normalized
     *  3. each poly is triangle
     *  4. #indices = #old_indices * 4
     */
    var triCount = this.indices.length;
    var vCache = new VG.Math.Vector3();
    for(var i = 0; i < triCount; i++) {
        var tri = this.indices[i];
        var index = [];
        for(var j = 0; j < 3 /* hard code */; j++) {
            var v = this.vertices.position[tri[j]].clone();
            v.add(this.vertices.position[tri[(j+1)%3]]);
            v.normalize();
            index.push(this.vertices.position.length);
            this.vertices.position.push(v);
        }
        this.indices.push([tri[0], index[0], index[2]]);
        this.indices.push([tri[1], index[1], index[0]]);
        this.indices.push([tri[2], index[2], index[1]]);
        for(var j = 0; j < 3; j++) {
            this.indices[i][j] = index[j];
        }
    }
};

Planet.prototype.createDualPolyhedron = function () {
    /**
     * Convert to it's dual polyhedron
     * @precondition
     *  1. each faces is triangle
     * @postcondition
     *  1. center become vertex
     *  2. vertex become center
     *  3. should contains 5,6,7 -gon
     */

    var indexToName = function(index) {
        // index contains indices of a triangle
        var indices = index.slice(0); // clone array
        indices.sort();
        return indices.join(",");
    };
    var idxToCenter = {};

    // calculate center of each faces
    var centers = [];
    for(var i = 0; i < this.indices.length; i++) {
        var center = new VG.Math.Vector3();
        for(var j = 0; j < this.indices[i].length; j++) {
            center.add(this.vertices.position[this.indices[i][j]]);
        }
        center.mul(1.0/this.indices[i].length);
        centers.push(center);
    }
    // got centers

    // collect faces index of each vertices
    var perimeters = new Array(this.vertices.position.length);
    for(var i = 0; i < this.vertices.position.length; i++) {
        perimeters[i] = [];
    }
    for(var i = 0; i < this.indices.length; i++) {
        for (var j = 0; j < this.indices[i].length; j++) {
            perimeters[this.indices[i][j]].push(i);
        }
    }
    // got faces index

    // order faces indices counter clockwise
    for(var i = 0; i < perimeters.length; i++) {
        // methods:
        // 1. sort by angle, O(n log n), but need atan2 each
        // 2. sort by cross, O(n log n), need sqrt each
        // n here is number of surrounding faces (5-7)
        // this method work with assumption that the resulting poly is convex
        // which should be the case.
        var p = perimeters[i].splice(1);
        var o = centers[perimeters[0]];
        var vc = this.vertices.position[i].clone().sub(o);
        vc.normalize();
        p.sort(function(a, b) {
            var va = centers[a].clone().sub(o);
            va.normalize();
            var vb = centers[b].clone().sub(o);
            vb.normalize();
            var ra = va.cross(vc).length();
            var rb = vb.cross(vc).length();
            if (ra>rb) {
                return -1;
            } else if (ra< rb) {
                return 1;
            } else {
                return 0;
            }
        });
        /**
         * Copy target starts from #1, since #0 is already fixed
         */
        for(var j = 1; j < perimeters[i].length; j ++) {
            perimeters[i][j] = p[j-1];
        }
    }
    // ordered

    // construct poly with center of faces as vertices
    this.dual = {
        vertices: {
            position: centers
        },
        indices: perimeters
    };
    // constructed
};


Planet.prototype.tectonicPlatesFlood = function(seeds) {
    /**
     * This function will use seed points to flood planet with tectonic plate.
     * @param {[Number]} seeds - index of each seeds
     * @precondition:
     * 1. seeds contains index to the starting (center) of each plate.
     * 2. index must be in valid range
     *
     * Algo:
     * 1. start from each seeds
     * 2. propagate to neighbor, mark each owned tiles.
     * 3. do until all tiles marked
     */
    /**
     * Neighbor:
     * For each edge, the corresponding vertices will become neighbor faces
     * in the dual polyhedron.
     */
    var that = this;
    this.dual.neighbor = new Array(this.dual.indices.length);
    for(var i = 0; i < this.dual.neighbor.length; i++) {
        this.dual.neighbor[i] = [];
    }
    function addNeighbor(center, neigh) {
        if(that.dual.neighbor[center].indexOf(neigh) === -1) {
            that.dual.neighbor[center].push(neigh);
        }
    }
    for(var i = 0; i < this.indices.length; i++) {
        for(var j = 0; j < 3 /* hard code */; j++) {
            addNeighbor(this.indices[i][j], this.indices[i][(j+1)%3]);
            addNeighbor(this.indices[i][j], this.indices[i][(j+2)%3]);
        }
    }
    // got neigh

    // do flooding
    /**
     * todo: very rough, need testing and benchmark
     * todo: need some optimization on flooding
     */
    var THRESHOLD = 0.2;
    this.dual.plate = new Array(this.dual.indices.length);
    var done = new Array(this.dual.indices.length);
    var remains = this.dual.plate.length;
    for(var i = 0; i < seeds.length; i++) {
        this.dual.plate[seeds[i]] = i;
        remains -= 1;
    }
    var index = 0;
    while(remains > 0) {
        if (this.dual.plate[index] === undefined || done[index]) {
            index ++;
        } else {
            if(Math.random() < THRESHOLD) {
                var i;
                for(i = 0; i < this.dual.neighbor[index].length; i++){
                    var ix = this.dual.neighbor[index][i];
                    if (this.dual.plate[ix] === undefined) {
                        this.dual.plate[ix] = this.dual.plate[index];
                        remains -= 1;
                        break;
                    }
                }
                if(i === this.dual.neighbor[index].length) {
                    done[index] = true;
                }
            }
        }
        index = index % this.dual.plate.length;
    }
    // done flooding

};

Planet.prototype.convertToMesh = function () {
    /**
     * In order to be able to display and do debugging the tiles,
     * we need to convert the tiles into triangles and convert them to mesh.
     * A few alternative here:
     * 1. Plainly render the 5,6,7-gon using triangulation
     * 2. Use dual of this.dual to render. Since dual of this.dual should be
     * triangles. todo: need to make sure (proof) that they will be triangles.
     * @return {VG.Render.Mesh} mesh
     */
    var mesh = new VG.Render.Mesh();
    /**
     * Algo:
     * 1. Do triangulation on each poly
     */
    return mesh;
};

Planet.prototype.singleStepEvolution = function(axis, planetSpin, plateSpins) {
    /**
     * Single time step of tectonic plates evolution
     */

};


Planet.prototype.update = function () {
    /**
     * Call this function after options updated.
     */

};

