/**
 * This module responsible for Scale, Rotate and Move operations on Object
 * There will be a certain amount (probably one) of this object that active (displayed)
 * at screen at one possible time.
 * The way to do it: there will be SRMOps that encapsulate operations.
 * This SRMOps responsible for drawing or creating new Ops.
 * The ops can then attached to any object, by setting it's anchor.
 * Pool will initiate drawing.
 * Drawing will include transformation from parent.
 * Drawing will be done in orthographic view, with screen coordinated coincide with anchor.
 * todo: NOT working yet
 * Created by w1 on 6/1/2015.
 */

SRMOp = function (anchor, types) {
    /**
     * This can be attached to object.
     * This is responsible for attaching to object, so that MoveOps, ScaleOps, & RotateOps
     * does not need to care about it.
     * @param {Object} anchor - 3D object to which this Op anchor to
     * @param {String} types - "SRM" or any parts of it
     * @constructor
     */
    this.types = types;
    if (this.types.indexOf('M') >= 0) {
        this.moveOp = new MoveOp(null, {});
    }
    if (this.types.indexOf('S') >= 0) {
        this.scaleOp = new ScaleOp(null, {});
    }
    if (this.types.indexOf('R') >= 0) {
        this.rotateOp = new RotateOp(null, {})
    }
    this.op = null;
    /**
     * reference to an object
     */
    this.anchor = anchor;
    /**
     * offset is coordinate in object space.
     * @type {VG.Math.Vector3}
     */
    this.offset = new VG.Math.Vector3(0, 0, 0);
    this._cache = {
        view: new VG.Math.Matrix4(),
        mv: new VG.Math.Matrix4(),
        oWorld: new VG.Math.Matrix4(),
        oWorldInv: new VG.Math.Matrix4()
    };
};

//SRMOp.prototype = Object.create();

SRMOp.prototype.setMode = function (mode) {
    if (mode === 'M') {
        this.op = this.moveOp;
    } else if (mode === 'S') {
        this.op = this.scaleOp;
    } else if (mode === 'R') {
        this.op = this.rotateOp;
    } else {
        this.op = null;
    }
};

SRMOp.prototype.draw = function (camera, rect) {
    /**
     * Draw Ops mark using the camera.
     * But need to bring coordinates to screen first, then zet z = 0
     */
    if (this.op) {

        this._cache.view.set(camera.getTransform().invert());
        this._cache.mv.set(this._cache.view);
        this._cache.mv.mul(this.anchor.getTransform());
        /**
         * position in screen [-1, 1]
         */
        var world = this._cache.mv.multiplyPosition(this.offset);
        var screen = camera.projM.multiplyPosition(world);
        // this is needed in order for overlay have the same size
        screen.z = 0;
        /**
         * oWorld = view * proj
         */
        this._cache.oWorld.set(this.camera.projM);
        this._cache.oWorld.mul(this._cache.view);
        this._cache.oWorldInv.set(this._cache.oWorld);
        this._cache.oWorldInv.invert();
        /**
         * position of OPs mark in world coordinate of overlay projection
         */
        var overlayWorld = this._cache.oWorldInv.multiplyPosition(screen);
        // assume this.camera is perspective
        //var pixelSize = -this.camera.nearZ*Math.tan(this.camera.fov/2)/(rect.height/2);
        // other method: transform screen coord [0, 0, 0] & [0, 1, 0] to world space
        // calc difference, divide by height/2
        var w0 = this._cache.oWorldInv.multiplyPosition(VG.Math.Vector3.Zero);
        var w1 = this._cache.oWorldInv.multiplyPosition(VG.Math.Vector3.Up);
        //console.log(w0);
        //console.log(w1);
        var pixelSize = w1.sub(w0).length()/(rect.height/2);
        //console.log(pixelSize);
        this.op.draw(this._cache.oWorld, overlayWorld, rect, pixelSize);
    }
};


RotateOp = function ()
{

};


MoveOp = function (parent, options)
{
    /**
     * Handle move operation GUI on an object
     * This can be attached to an object
     */
    VG.Render.SceneNode.call(this);
    this.parent = parent;
    /**
     * action: '', 'hover', 'active' (click & drag)
     * param: '', 'x', 'y', 'z', 'xy', 'xz', 'yz'
     */
    this.state = {
        action: '',
        param: '',
        axis: {
            x: 0, // 0 -> normal, 1-> green, 2 -> hidden
            y: 0,
            z: 0
        }
    };
    var def = {
        colors: {
            x: new VG.Core.Color(255, 0, 0),
            y: new VG.Core.Color(255, 255, 0),
            z: new VG.Core.Color(0, 0, 255),
            active: new VG.Core.Color(0, 255, 0),
            inactive: new VG.Core.Color(100, 100, 100)
        },
        // all in pixels
        line: {
            start: 21,
            end: 68,
            thickness: 3
        },
        tip: {
            width: 16,
            length: 21
        }
    };
    this.options = Util.initOptions(options, def, {colors: true, line: true, tip: true});

    this.meshes = {
        axis: {
            x: new ScaleMoveAxis('M', new VG.Math.Vector3(1, 0, 0), this.options),
            y: new ScaleMoveAxis('M', new VG.Math.Vector3(0, 1, 0), this.options),
            z: new ScaleMoveAxis('M', new VG.Math.Vector3(0, 0, 1), this.options)
        },
        shade: {
            xy: new ScaleMoveShade('M', 'xy', this.options),
            xz: new ScaleMoveShade('M', 'xz', this.options),
            yz: new ScaleMoveShade('M', 'yz', this.options)
        }
    };
};
MoveOp.prototype = Object.create(VG.Render.SceneNode.prototype);

MoveOp.prototype.draw = function (worldToScreen, position, rect, pixelSize)
{
    /**
     * This should be called last.
     */
        // give a state, it should be able to draw
        // logic layer
    this.state.axis.x = 0;
    this.state.axis.y = 0;
    this.state.axis.z = 0;
    this.meshes.shade.xy.active = false;
    this.meshes.shade.xz.active = false;
    this.meshes.shade.yz.active = false;
    if (this.state.action === '') {
        this.meshes.shade.xy.visible = true;
        this.meshes.shade.xz.visible = true;
        this.meshes.shade.yz.visible = true;
    } else if (this.state.action === 'hover') {
        if (this.state.param.indexOf('x') > -1) {
            this.state.axis.x = 1;
        }
        if (this.state.param.indexOf('y') > -1) {
            this.state.axis.y = 1;
        }
        if (this.state.param.indexOf('z') > -1) {
            this.state.axis.z = 1;
        }
        this.state.shade[this.state.param].active = true;
    } else if (this.state.action === 'active') { // dragging
        if (this.state.param.indexOf('x') === -1) {
            this.state.axis.x = 2;
        }
        if (this.state.param.indexOf('y') === -1) {
            this.state.axis.y = 2;
        }
        if (this.state.param.indexOf('z') === -1) {
            this.state.axis.z = 2;
        }
        this.meshes.shade.xy.visible = false;
        this.meshes.shade.xz.visible = false;
        this.meshes.shade.yz.visible = false;
    }

    // propagate state to visual parameter of meshes
    // visual parameter layer
    this.meshes.axis.x.visible = this.state.axis.x <= 1;
    this.meshes.axis.y.visible = this.state.axis.y <= 1;
    this.meshes.axis.z.visible = this.state.axis.z <= 1;

    this.meshes.axis.x.color = this.state.axis.x === 1 ? this.options.colors.active : this.options.colors.x;
    this.meshes.axis.y.color = this.state.axis.y === 1 ? this.options.colors.active : this.options.colors.y;
    this.meshes.axis.z.color = this.state.axis.z === 1 ? this.options.colors.active : this.options.colors.z;

    // draw the state
    // use orthographic projection with screen width, height, draw at screenPos.
    // draw layer
    this.meshes.axis.x.draw(worldToScreen, position, rect, pixelSize);
    this.meshes.axis.y.draw(worldToScreen, position, rect, pixelSize);
    this.meshes.axis.z.draw(worldToScreen, position, rect, pixelSize);
    //
    //this.meshes.shade.xy.draw(worldToScreen, position);
    //this.meshes.shade.xz.draw(worldToScreen, position);
    //this.meshes.shade.yz.draw(worldToScreen, position);

};



ScaleOp = function (parent, options)
{
    /**
     * Handle scale operation GUI on an object
     * This can be attached to an object
     */
    VG.Render.SceneNode.call(this);
    this.parent = parent;
    /**
     * action: '', 'hover', 'active' (click & drag)
     * param: '', 'x', 'y', 'z', 'xy', 'xz', 'yz', 'xyz'
     */
    this.state = {
        action: '',
        param: '',
        axis: {
            x: 0, // 0 -> normal, 1-> green, 2 -> hidden
            y: 0,
            z: 0
        }
    };
    var def = {
        colors: {
            x: new VG.Core.Color(255, 0, 0),
            y: new VG.Core.Color(255, 255, 0),
            z: new VG.Core.Color(0, 0, 255),
            active: new VG.Core.Color(0, 255, 0),
            inactive: new VG.Core.Color(100, 100, 100)
        }
    };
    this.options = Util.initOptions(options, def, {colors:true});

    this.screenPos = {
        x: 0,
        y: 0
    };

    this.meshes = {
        axis: {
            x: new ScaleMoveAxis('S', new VG.Math.Vector3(400, 0, 0)),
            y: new ScaleMoveAxis('S', new VG.Math.Vector3(0, 400, 0)),
            z: new ScaleMoveAxis('S', new VG.Math.Vector3(0, 0, 400))
        },
        shade: {
            xy: new ScaleMoveShade('S', 'xy', this.options),
            xz: new ScaleMoveShade('S', 'xz', this.options),
            yz: new ScaleMoveShade('S', 'yz', this.options),
            xyz: new ScaleMoveShade('S', 'xyz', this.options)
        }
    };
    var that = this;
    this.onDraw = function (pipeline, context, delta) {
        that.draw(pipeline, context);
    }

};
ScaleOp.prototype = Object.create(VG.Render.SceneNode.prototype);

ScaleOp.prototype.draw = function (pipeline, context)
{
    /**
     * Draw the scale mark at screenPos.
     * This should be called last.
     */

    // give a state, it should be able to draw
    // logic layer
    this.state.axis.x = 0;
    this.state.axis.y = 0;
    this.state.axis.z = 0;
    this.meshes.shade.xy.active = false;
    this.meshes.shade.xz.active = false;
    this.meshes.shade.yz.active = false;
    this.meshes.shade.xyz.active = false;
    if (this.state.action === '') {
        this.meshes.shade.xy.visible = true;
        this.meshes.shade.xz.visible = true;
        this.meshes.shade.yz.visible = true;
        this.meshes.shade.xyz.visible = true;
    } else if (this.state.action === 'hover') {
        if (this.state.param.indexOf('x') > -1) {
            this.state.axis.x = 1;
        }
        if (this.state.param.indexOf('y') > -1) {
            this.state.axis.y = 1;
        }
        if (this.state.param.indexOf('z') > -1) {
            this.state.axis.z = 1;
        }
        this.state.shade[this.state.param].active = true;
    } else if (this.state.action === 'active') { // dragging
        if (this.state.param.indexOf('x') === -1) {
            this.state.axis.x = 2;
        }
        if (this.state.param.indexOf('y') === -1) {
            this.state.axis.y = 2;
        }
        if (this.state.param.indexOf('z') === -1) {
            this.state.axis.z = 2;
        }
        this.meshes.shade.xy.visible = false;
        this.meshes.shade.xz.visible = false;
        this.meshes.shade.yz.visible = false;
        this.meshes.shade.xyz.visible = false;
    }

    // propagate state to visual parameter of meshes
    // visual parameter layer
    this.meshes.axis.x.visible = this.state.axis.x <= 1;
    this.meshes.axis.y.visible = this.state.axis.y <= 1;
    this.meshes.axis.z.visible = this.state.axis.z <= 1;
    
    this.meshes.axis.x.color = this.state.axis.x === 1 ? this.options.colors.active : this.options.color.x;
    this.meshes.axis.y.color = this.state.axis.y === 1 ? this.options.colors.active : this.options.color.y;
    this.meshes.axis.z.color = this.state.axis.z === 1 ? this.options.colors.active : this.options.color.z;

    // draw the state
    // use orthographic projection with screen width, height, draw at screenPos.
    // draw layer
    this.meshes.axis.x.draw(pipeline, context, rect);
    this.meshes.axis.y.draw(pipeline, context);
    this.meshes.axis.z.draw(pipeline, context);

    this.meshes.shade.xy.draw(pipeline, context);
    this.meshes.shade.xz.draw(pipeline, context);
    this.meshes.shade.yz.draw(pipeline, context);
    this.meshes.shade.xyz.draw(pipeline, context);

};

ScaleMoveAxis = function (mode, arrow, options)
{
    /**
     * Axis mesh for Scale/Move operation
     */
    VG.Render.SceneNode.call(this);
    var def = {
        // all in pixels
        line: {
            start: 21,
            end: 68,
            thickness: 4
        },
        tip: {
            width: 16,
            length: 21
        }
    };
    this.options = Util.initOptions(options, def, {line: true, tip: true});
    this.arrow = arrow;
    this.values = {
        line: [
            [this.arrow.clone().mul(this.options.line.start), this.arrow.clone().mul(this.options.line.end)]
        ]
    };
    if (mode == 'M') {
        this.meshes = {
            line: new TLines(this, this.values.line,{
                thickness: this.options.line.thickness
            }),
            tip: new Cone(this, {
                position: arrow,
                up: arrow.clone(),
                length: 10,
                radius: 5
            }).init()
        };
    } else if (mode == 'S') {
        this.meshes = {
            line: new TLines(this, this.values.line,{
                thickness: 2
            }),
            tip: new Cone(this, { // todo: use box
                position: arrow,
                up: arrow.clone(),
                length: 10,
                radius: 5
            }).init()
        };
    }
};
ScaleMoveAxis.prototype = Object.create(VG.Render.SceneNode.prototype);

Object.defineProperty(ScaleMoveAxis.prototype, "color",
    {
        get: function()
        {
            return this.meshes.line.options.color;
        },
        set: function(color)
        {
            this.meshes.line.options.color = color;
            this.meshes.tip.options.color = color;
        }
    }
);


ScaleMoveAxis.prototype.draw = function (worldToScreen, position, rect, pixelSize)
{
    var side = rect.height/2;
    this.meshes.line.options.thickness = this.options.line.thickness*pixelSize;
    this.meshes.line.scale = new VG.Math.Vector3(pixelSize, pixelSize, pixelSize).mul(3);
    this.meshes.line.options.aspect = rect.width/rect.height;
    this.meshes.line.position = position;
    this.meshes.tip.position = position;

    this.meshes.line.drawWithTransform(worldToScreen);
    //this.meshes.tip.drawWithTransform(worldToScreen);
};

ScaleMoveShade = function (mode, axes, options)
{
    /**
     * @constructor
     */
    VG.Render.SceneNode.call(this);
    var def = {
        colors: {
            active: new VG.Core.Color(0, 255, 0),
            inactive: new VG.Core.Color(100, 100, 100)
        }
    };
    this.options = Util.initOptions(options, def, {colors:true});
    this.visible = true;
    this.active = true;
    this.meshes = {
        lines: null,
        polys: null
    };
    if (mode === 'S') {
        if(axes.length === 2) {
            this.meshes.lines = new TLines(this,[
                [new VG.Math.Vector3(2, 0, 0), new VG.Math.Vector3(0, 2, 0)]
            ]);
            this.meshes.polys = new CPolys(this, [
                [
                    new VG.Math.Vector3(1, 0, 0),
                    new VG.Math.Vector3(2, 0, 0),
                    new VG.Math.Vector3(0, 2, 0),
                    new VG.Math.Vector3(0, 1, 0)
                ]
            ]);
            if (axes === 'yz') {
                // rotate accordingly
                this.meshes.lines.setRotation(90, 0, 0);
                this.meshes.polys.setRotation(90, 0, 0);
            } else if (axes === 'xz') {
                // rotate accordingly
                this.meshes.lines.setRotation(0, 90, 0);
                this.meshes.polys.setRotation(0, 90, 0);
            }
        } else {
            // xyz
            this.meshes.lines = new TLines(this,[
                [new VG.Math.Vector3(1, 0, 0), new VG.Math.Vector3(0, 1, 0)],
                [new VG.Math.Vector3(1, 0, 0), new VG.Math.Vector3(0, 0, 1)],
                [new VG.Math.Vector3(0, 1, 0), new VG.Math.Vector3(0, 0, 1)]
            ]);
            this.meshes.polys = new CPolys(this, [
                [
                    new VG.Math.Vector3(1, 0, 0),
                    new VG.Math.Vector3(0, 1, 0),
                    new VG.Math.Vector3(0, 0, 0)
                ],
                [
                    new VG.Math.Vector3(0, 0, 0),
                    new VG.Math.Vector3(0, 1, 0),
                    new VG.Math.Vector3(0, 0, 1)
                ],
                [
                    new VG.Math.Vector3(1, 0, 0),
                    new VG.Math.Vector3(0, 0, 0),
                    new VG.Math.Vector3(0, 0, 1)
                ]
            ]);
        }
    } else if (mode === 'M') {
        // only xy, xz, yz exists, no xyz
        this.meshes.lines = new TLines(this, [
            [new VG.Math.Vector3(2, 0, 0), new VG.Math.Vector3(2, 2, 0)],
            [new VG.Math.Vector3(0, 2, 0), new VG.Math.Vector3(2, 2, 0)],
            [new VG.Math.Vector3(1, 0, 0), new VG.Math.Vector3(1, 1, 0)],
            [new VG.Math.Vector3(1, 0, 0), new VG.Math.Vector3(1, 1, 0)]
        ]);
        this.meshes.polys = new CPolys(this, [
            [
                new VG.Math.Vector3(1, 0, 0),
                new VG.Math.Vector3(2, 0, 0),
                new VG.Math.Vector3(2, 2, 0),
                new VG.Math.Vector3(1, 2, 0)
            ],
            [
                new VG.Math.Vector3(1, 1, 0),
                new VG.Math.Vector3(1, 2, 0),
                new VG.Math.Vector3(0, 2, 0),
                new VG.Math.Vector3(0, 1, 0)
            ]
        ]);
        if (axes === 'yz') {
            // rotate accordingly
            this.meshes.lines.setRotation(90, 0, 0);
            this.meshes.polys.setRotation(90, 0, 0);
        } else if (axes === 'xz') {
            // rotate accordingly
            this.meshes.lines.setRotation(0, 90, 0);
            this.meshes.polys.setRotation(0, 90, 0);
        }
    }
};

ScaleMoveShade.prototype = Object.create(VG.Render.SceneNode.prototype);

ScaleMoveShade.prototype.draw = function (pipeline, context)
{
    if (this.visible) {
        var color = this.active ? this.options.colors.active : this.options.colors.inactive;
        this.meshes.lines.options.color = color;
        this.meshes.polys.options.color = color;
        this.meshes.lines.draw(pipeline, context);
        if (this.active) {
            this.meshes.polys.draw(pipeline, context);
        }
    }
};

