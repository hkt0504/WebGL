/**
 *
 * Todo: user able to put image as background -> https://www.youtube.com/watch?v=CaAWWuuSTys
 * Todo: user can select camera, use SRM tools to move/rotate it
 */

MeshEditor = function ()
{
    /**
     * Mesh Editor includes:
     * 1. View-port navigation
     *      view switchable from: front, back, right, top, left, bottom, camera
     * 2. Object scale/move/rotate, callback based
     * 3. Object editing via Point, Face, Edge.
     * 4. Modular mesh tool interface
     *      integrate existing extrude/bevel tools
     * todo: status (1) done, 2-4 remains
     */
    VG.UI.RenderWidget.call(this);

    var M = 5;
    //this.viewPort = new EyeView(
    //    new VG.Math.Vector3(0.1*M, -M, 0.1*M), // eye
    //    this.rect.width/this.rect.height,
    //    {
    //        fov: 60,
    //        up: new VG.Math.Vector3(0, 0, 1),
    //        center: new VG.Math.Vector3(0, 0, 0),
    //        far: 1000
    //    }
    //);
    this.viewPort = new VG.Render.Camera(60, this.rect.width/this.rect.height,0.1, 1000);
    this.viewPort.position = new VG.Math.Vector3(0.1*M, -M, 0.1*M);
    this.viewPort.setLookAt(new VG.Math.Vector3(0, 0, 0), new VG.Math.Vector3(0, 0, 1));


    this.context = new VG.Render.Context();
    this.context.camera = this.viewPort;

    this.overlayContext = new VG.Render.Context();
    //this.overlayContext.camera = new EyeView(
    //    new VG.Math.Vector3(-5, -10, 5), // eye
    //    this.rect.width/this.rect.height,
    //    {
    //        up: new VG.Math.Vector3(0, 0, 1),
    //        center: new VG.Math.Vector3(0, 0, 0),
    //        far: 1000
    //    }
    //);
    //this.overlayContext.camera = new OrthographicCamera(
    //    new VG.Math.Vector3(-5, -10, 5), // eye
    //    {
    //        left: -100,
    //        right: 100,
    //        bottom: -100,
    //        top: 100
    //    }
    //); // use this overlay to render resize tools
    this.overlayContext.camera = this.viewPort;

    this.pipeline = new VG.Render.Pipeline();
    this.scene = new VG.Render.SceneManager();

    this.helper = {};

    this.helper.grid = new Grid(this.scene, {
        spacing: 0.5, //1.0,
        count: 81 // must be odd
    }); // grid first then axes
    this.helper.axes = new Axes(this.scene, {
        length: this.helper.grid.lineHalfLength,
        colors: {
            x: new VG.Core.Color(255, 0, 0, 255),
            y: new VG.Core.Color(255, 255, 0, 255),
            z: new VG.Core.Color(0, 0, 255, 255)
        }
    });
    var bricks = this.addBricks(this.scene, 2);
    var tris = bricks[0].extractTrisFromBuffer(bricks[0].vBuffers[0]);
    console.log(tris);
    this.srmOp = new SRMOp(bricks[0], "SRM");
    this.srmOp.setMode('M');
    this.srmOp.camera = this.overlayContext.camera;
    var that = this;
    this.render = function(delta) {
        that.viewPort.aspect = that.rect.width / that.rect.height;
        that.viewPort.updateProjection();
        that.pipeline.drawScene(that.context, that.scene, delta);

        that.srmOp.draw(that.context.camera, that.rect);
    };

    this.setupEventHandlerProxy();
    this.registerInputHandler(new ViewPortInputHandler(this));

};

MeshEditor.prototype = Object.create(VG.UI.RenderWidget.prototype);

MeshEditor.prototype.registerInputHandler = function (handler)
{
    /**
     * Register `handler` as input handler
     * This also check if parts of handler already registered
     * @param handler {InputHandler} input handler
     */
    if (handler.mouseDown) {
        if(this.mouseDownHandler.indexOf(handler.mouseDown) < 0) {
            this.mouseDownHandler.push(handler.mouseDown);
        }
    }
    if (handler.mouseMove) {
        if(this.mouseMoveHandler.indexOf(handler.mouseMove) < 0) {
            this.mouseMoveHandler.push(handler.mouseMove);
        }
    }
    if (handler.mouseUp) {
        if(this.mouseUpHandler.indexOf(handler.mouseUp) < 0) {
            this.mouseUpHandler.push(handler.mouseUp);
        }
    }
    if (handler.keyUp) {
        if(this.keyUpHandler.indexOf(handler.keyUp) < 0) {
            this.keyUpHandler.push(handler.keyUp);
        }
    }
    if (handler.keyDown) {
        if(this.keyDownHandler.indexOf(handler.keyDown) < 0) {
            this.keyDownHandler.push(handler.keyDown);
        }
    }
};

MeshEditor.prototype.setupEventHandlerProxy = function ()
{
    /**
     * Setup basic event handler proxy
     */
    var that = this;
    this.mouseDownHandler = [];
    this.mouseDown = function (event) {
        for(var i = 0; i< that.mouseDownHandler.length; i++) {
            if(that.mouseDownHandler[i]) {
                that.mouseDownHandler[i](event);
            }
        }
    };
    this.mouseUpHandler = [];
    this.mouseUp = function (event) {
        for(var i = 0; i< that.mouseUpHandler.length; i++) {
            if(that.mouseUpHandler[i]) {
                that.mouseUpHandler[i](event);
            }
        }
    };
    this.mouseMoveHandler = [];
    this.mouseMove = function (event) {
        for(var i = 0; i< that.mouseMoveHandler.length; i++) {
            if(that.mouseMoveHandler[i]) {
                that.mouseMoveHandler[i](event);
            }
        }
    };
    this.keyUpHandler = [];
    this.keyUp = function (event) {
        for(var i = 0; i< that.keyUpHandler.length; i++) {
            if(that.keyUpHandler[i]) {
                that.keyUpHandler[i](event);
            }
        }
    };
    this.keyDownHandler = [];
    this.keyDown = function (event) {
        for(var i = 0; i< that.keyDownHandler.length; i++) {
            if(that.keyDownHandler[i]) {
                that.keyDownHandler[i](event);
            }
        }
    };
};



MeshEditor.prototype.addBricks = function (node, count) {
    /**
     * Add bricks to node.
     * Just demo utility
     * @type {MeshEditor}
     */
    var that = this;
    var bricks = [];
    function addBrickAt(x, y, vertical)
    {
        var brick = VG.Render.Mesh.makeBox(vertical ? 0.08 : 0.5, vertical ? 0.5 : 0.08, 0.2);

        brick.position.set(x, y, 0.0);

        brick.parent = node;

        /* Some meta data */
        brick.vertical = true;

        bricks.push(brick);
    }

    for(var i=0;i<count;i++) {
        for(var j=0;j<3;j++) {
            addBrickAt((i - count / 2)*0.5, j*1 -1, true);
        }
    }
    return bricks;
};





function vgMain(workspace)
{
    /**
     * boot function
     */
    var widget = new MeshEditor();
    workspace.layout = VG.UI.Layout(widget);
}

