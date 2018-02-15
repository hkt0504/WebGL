/**
 * This module responsible for View port navigation.
 * Created by w1 on 6/1/2015.
 */


/**
 * todo:  Camera Position, yes, but the lookAt x, y, z is not that easy. Also for camera position callback would be
 * good when changes, together with a boolean if the change is still going on or if finished (user released mouse / keyboard) for in this case an undo point would be appropriate.
 * todo: Also grid should be able to be turned on / off.
 * todo: Tie up to Z.
 * todo: merge EyeView to VG.Camera
 */



EyeView = function (eye, aspect, options)
{
    /**
     * EyeView is a camera with getTransform overloaded with LookAt
     * @param {VG.Math.Vector3} eye - eye location
     * @param {Number} aspect - width/height
     * @param {{fov:Number, near:Number, far:Number,
     *      up:VG.Math.Vector3, center:VG.Math.Vector3,
     *      }} options
     * @constructor
     */
    VG.Render.SceneNode.call(this);

    options = options || {};
    options.fov = options.fov || 60;
    options.near = options.near || 1;
    options.far = options.far || 100;
    options.up = options.up || new VG.Math.Vector3(0, 0, 1);
    options.center = options.center || new VG.Math.Vector3(0, 0, 0);

    /**
     * Projection configuration
     */
    this.fov = options.fov;
    this.aspect = aspect;
    this.nearZ = options.near;
    this.farZ = options.far;

    /** Projection matrix
     *  @member {VG.Math.Matrix4()} */
    this.projM = new VG.Math.Matrix4();

    /**
     * Eye configuration
     */
    this.eye = eye.clone();
    this.up = options.up.clone();
    this.center = options.center.clone();

    this.updateProjection();

};
EyeView.prototype = Object.create(VG.Render.SceneNode.prototype);

EyeView.prototype.updateProjection = function()
{
    this.projM.setPerspective(this.fov, this.aspect, this.nearZ, this.farZ);
};

EyeView.prototype.getTransform = function ()
{
    /**
     * Returns the world transform of this node
     * @return {VG.Math.Matrix4}
     */

    var m = this.__cacheM1;

    // there seems to be bug on the original setLookAt
//    m.setLookAt(
//        this.eye.x, this.eye.y, this.eye.z,
//        this.center.x, this.center.y, this.center.z,
//        this.up.x, this.up.y, this.up.z
//    );

    function makeLookAt(eye, center, up) {
        /**
         * A new look at matrix
         */
        var z = eye.clone();
        z.sub(center).normalize();
        var x = up.cross(z);
        var y = z.cross(x);
        m.elements[0] = x.x;
        m.elements[1] = x.y;
        m.elements[2] = x.z;
        m.elements[3] = 0;
        m.elements[4] = y.x;
        m.elements[5] = y.y;
        m.elements[6] = y.z;
        m.elements[7] = 0;
        m.elements[8] = z.x;
        m.elements[9] = z.y;
        m.elements[10] = z.z;
        m.elements[11] = 0;
        m.elements[12] = eye.x;
        m.elements[13] = eye.y;
        m.elements[14] = eye.z;
        m.elements[15] = 1;
        return m;
    }

    m = makeLookAt(this.eye, this.center, this.up);
    //console.log(m);

    if (this.parent) {
        var t = this.__cacheM2;
        t.set(this.parent.getTransform());
        t.mul(m);
        return t;
    }
    return m;
};

EyeView.prototype.rotateToAPoint = function(p, o, v, alpha)
{
    /**
     * Rotate a vector p, around a vector v originating from o amount of alpha
     * @param {VG.Math.Vector3} p - point to rotate
     * @param {VG.Math.Vector3} o - center of rotation
     * @param {VG.Math.Vector3} v - vector to rotate around
     * @param {Number} alpha - angle to rotate (in radian)
     * @return {VG.Math.Vector3} - the rotated point
     */
    var c = Math.cos(alpha);
    var s = Math.sin(alpha);
    var C = 1-c;
    var m = new VG.Math.Matrix4();

    m.elements[0] = v.x* v.x*C + c;
    m.elements[1] = v.y* v.x*C + v.z*s;
    m.elements[2] = v.z* v.x*C - v.y*s;
    m.elements[3] = 0;

    m.elements[4] = v.x* v.y*C - v.z*s;
    m.elements[5] = v.y* v.y*C + c;
    m.elements[6] = v.z* v.y*C + v.x*s;
    m.elements[7] = 0;

    m.elements[8] = v.x* v.z*C + v.y*s;
    m.elements[9] = v.y* v.z*C - v.x*s;
    m.elements[10] = v.z* v.z*C + c;
    m.elements[11] = 0;

    m.elements[12] = 0;
    m.elements[13] = 0;
    m.elements[14] = 0;
    m.elements[15] = 1;

    var P = p.clone();
    P.sub(o);
    var out = o.clone();
    out.add(m.multiplyVector3(P));
    return out;
};

EyeView.prototype.calculateDirXY = function()
{
    /**
     * Calculate dir{x:VG.Math.Vector3, y:VG.Math.Vector3}
     * @return dir{x:VG.Math.Vector3, y:VG.Math.Vector3}
     * @private
     */
    var dir = {};
    var c_eye = this.center.clone();
    c_eye.sub(this.eye);
    dir.x = this.up.clone();
    dir.y = this.up.cross(c_eye);
    dir.y.normalize();
    return dir;
};
EyeView.prototype.rotate = function(dx, dy)
{
    /**
     * Rotate as responds to mouse fractional change dx and dy
     * @param {Number} dx - mouse dx / width
     * @param {Number} dy - mouse dy / height
     */
    var dir = this.calculateDirXY();
    var c_up = this.center.clone();
    c_up.add(this.up);
    this.eye = this.rotateToAPoint(this.eye, this.center, dir.x, -dx * Math.PI);
    this.eye = this.rotateToAPoint(this.eye, this.center, dir.y, dy * Math.PI);
    this.up = this.rotateToAPoint(c_up, this.center, dir.y, dy * Math.PI);
    this.up.sub(this.center);
    this.up.normalize();
};

EyeView.prototype.zoom = function(dx, dy)
{
    /**
     * Zoom
     * @param {Number} dx - mouse dx / width
     * @param {Number} dy - mouse dy / height
     */
    this.eye.sub(this.center);
    this.eye.mul(dy + 1);
    this.eye.add(this.center);
};

EyeView.prototype.pan = function(dx, dy)
{
    /**
     * Pan
     * @param {Number} dx - mouse dx / width
     * @param {Number} dy - mouse dy / height
     */
    var dir = this.calculateDirXY();
    var e = this.eye.clone();
    e.sub(this.center);
    var t = Math.tan(this.fov/2 * Math.PI/180);
    var len = 2 * e.length() * t;
    var pc = this.center.clone();
    this.center.add(dir.y.mul(dx * len * this.aspect));
    this.center.add(dir.x.mul(dy * len));
};



Axes = function (parent, options)
{
    /**
     * Create axis x, y, z
     * @constructor
     */
    VG.Render.SceneNode.call(this);
    this.parent = parent;

    var def = {
        colors: {
            x: new VG.Core.Color(255, 0, 0, 255),
            y: new VG.Core.Color(255, 255, 0, 255),
            z: new VG.Core.Color(0, 0, 255, 255)
        }
    };

    options = options || {};
    options.length = options.length || 1000;
    options.colors = options.colors || def.colors;
    options.colors.x = options.colors.x || def.colors.x;
    options.colors.y = options.colors.y || def.colors.y;
    options.colors.z = options.colors.z || def.colors.z;
    var center = new VG.Math.Vector3(0, 0, 0);
    this.lines = new Lines(this, 3);
    this.lines.addLine(
        center,
        new VG.Math.Vector3(options.length, 0, 0),
        {
            color: options.colors.x
        }
    );
    this.lines.addLine(
        center,
        new VG.Math.Vector3(0, options.length, 0),
        {
            color: options.colors.y
        }
    );
    this.lines.addLine(
        center,
        new VG.Math.Vector3(0, 0, options.length),
        {
            color: options.colors.z
        }
    );
    this.onDraw = function (pipeline, context, delta) {
        // do nothing
    }
};

Axes.prototype = Object.create(VG.Render.SceneNode.prototype);

Grid = function (parent, options)
{
    /**
     * Grid to help user view
     * note: This methods seems to be better than render to texture first.
     * @param {VG.Render.SceneNode} parent - parent of this Grid
     * @param {{spacing: Number, count: Number, color: VG.Core.Color}} options - count should be odd
     * @constructor
     */
    VG.Render.SceneNode.call(this);
    this.parent = parent;

    var def = {
        spacing: 2.0,
        count: 301,
        color: new VG.Core.Color(100, 100, 100, 100),
        textureSize: 2048
    };
    this.options = Util.initOptions(this.options, def);
    this.lines = new Lines(this, 3 * this.options.count);

    this.lineHalfLength = (this.options.count-1)/2 * this.options.spacing;
    for(var index = -Math.floor(this.options.count/2); index <= Math.floor(this.options.count/2); index++) {
        var end = this.lineHalfLength;
        if (index === 0) {
            end = 0;
        }
        this.lines.addLine(
            new VG.Math.Vector3(-this.lineHalfLength, index * this.options.spacing, 0),
            new VG.Math.Vector3( end, index * this.options.spacing, 0),
            {
                color: this.options.color
            }
        );
        this.lines.addLine(
            new VG.Math.Vector3(index * this.options.spacing, -this.lineHalfLength, 0),
            new VG.Math.Vector3(index * this.options.spacing,  end, 0),
            {
                color: this.options.color
            }
        );
    }

    this.onDraw = function(pipeline, context, delta) {
        // empty
    }
};
Grid.prototype = Object.create(VG.Render.SceneNode.prototype);


InputHandler = function ()
{
    /**
     * Superclass of all input handler
     * @constructor
     */
};

ViewPortInputHandler = function (editor)
{
    /**
     * Input handler for view port
     * 1. Alt+left-mouse -> rotate
     * 2. Alt+right-mouse (up-down) -> forward/back
     * 3. Ctrl+left-mouse -> panning
     * todo: bug, on Alt pressed, widget lost focus
     */
    InputHandler.call(this);
    var that = this;
    this.editor = editor;
    this.keyCode = null;
    this.state = null;
    this.saved = {
        start: {
            mouse: {} // saved mouse position
        },
        angle:{}
    };
    this.mouseDown = function (event) {
        var ctrl = VG.Events.KeyCodes.Ctrl;
        if ( VG.context.workspace.operatingSystem === VG.HostProperty.OSMac ) {
            ctrl = VG.Events.KeyCodes.AppleLeft;
        }

        if (that.keyCode === VG.Events.KeyCodes.Alt) {
            if (event.button === 0) {
                that.state = 'rotate';
            } else if (event.button === 1) {
                that.state = 'move';
            }
        } else if (that.keyCode === ctrl) {
            if (event.button === 0) {
                that.state = 'pan';
            }
        }
        that.saved.start.mouse.x = event.pos.x;
        that.saved.start.mouse.y = event.pos.y;
    };
    this.mouseUp = function (event) {
        that.state = null;
    };
    this.mouseMove = function (event) {
        var delta = {
            x: event.pos.x - that.saved.start.mouse.x,
            y: event.pos.y - that.saved.start.mouse.y
        };
        delta.x /= that.editor.rect.width;
        delta.y /= that.editor.rect.height;
        if (that.state === 'rotate') {
            that.editor.viewPort.rotate(delta.x, delta.y);
        } else if (that.state === 'move') {
            // move back-for-ward according to active camera view
            that.editor.viewPort.zoom(delta.x, delta.y);
        } else if (that.state === 'pan') {
            // use VP matrix
            that.editor.viewPort.pan(delta.x, delta.y);
        }
        that.saved.start.mouse.x = event.pos.x;
        that.saved.start.mouse.y = event.pos.y;
    };
    this.keyUp = function (code) {
        that.keyCode = null;
    };
    this.keyDown = function (code) {
        that.keyCode = code;
    };
};
ViewPortInputHandler.prototype = Object.create(InputHandler.prototype);


OrthographicCamera = function (eye, options)
{
    /**
     * Orthographic camera
     */
    VG.Render.SceneNode.call(this);
    var def = {
        left: 0,
        right: 100,
        top: 100,
        bottom: 0,
        near: -1000,
        far: 10000,
        up: new VG.Math.Vector3(0, 0, 1),
        center: new VG.Math.Vector3(0, 0, 0)
    };
    this.options = Util.initOptions(options, def);

    /** Projection matrix
     *  @member {VG.Math.Matrix4()} */
    this.projM = new VG.Math.Matrix4();

    /**
     * Eye configuration
     */
    this.eye = eye.clone();
    this.up = this.options.up.clone();
    this.center = this.options.center.clone();

    this.updateProjection();
    //VG.Render.SceneNode.call(this);
    //
    //options = options || {};
    //options.fov = options.fov || 60;
    //options.near = options.near || 1;
    //options.far = options.far || 100;
    //options.up = options.up || new VG.Math.Vector3(0, 0, 1);
    //options.center = options.center || new VG.Math.Vector3(0, 0, 0);
    //
    ///**
    // * Projection configuration
    // */
    //this.fov = options.fov;
    //this.aspect = 1.5;//aspect;
    //this.nearZ = options.near;
    //this.farZ = options.far;
    //
    ///** Projection matrix
    // *  @member {VG.Math.Matrix4()} */
    //this.projM = new VG.Math.Matrix4();
    //
    ///**
    // * Eye configuration
    // */
    //this.eye = eye.clone();
    //this.up = options.up.clone();
    //this.center = options.center.clone();
    //
    //this.updateProjection();
    //EyeView.call(this, eye, 1.5);
};

OrthographicCamera.prototype = Object.create(EyeView.prototype);

OrthographicCamera.prototype.updateProjection = function()
{
    /**
     * Update projection matrix
     */
    this.projM.setOrtho(this.options.left, this.options.right, this.options.bottom, this.options.top, this.options.near, this.options.far);
    //this.projM.setOrtho(-10, 10, -10, 10, -10, 1000);

    //this.projM.setPerspective(70, 1.0, 0.1, 1000);
};