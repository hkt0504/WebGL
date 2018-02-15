PreviewWidget=function()
{
    VG.UI.RenderWidget.call(this);

    var context = new VG.Render.Context();
    // camera
    var camera = context.camera;
    camera.setProjection(60, this.rect.width / this.rect.height);
    camera.setRotation(0, 0, 0);
    camera.position.z = 5.0;
    camera.position.y = 0.0;
    this.camera=camera;

    //enable tracing
    context.trace = false;

    var pipeline = new VG.Render.Pipeline();
    var scene = new VG.Render.SceneManager();
     
    //this.setupScene(context, scene);
    this.object=new VG.Render.Mesh( scene );


    var mouseDown = false;

    var x = 0;
    var y = 0;

    var storedDelta = 0.001;

    this.mouseMove = function(e)
    {
        var dx = VG.Math.clamp(x - e.pos.x, -1, 1);
        var dy = VG.Math.clamp(y - e.pos.y, -1, 1);

        x = e.pos.x;
        y = e.pos.y;

        if (mouseDown)
        {
            camera.incRotation(90 * dx * storedDelta, 0, 0);

            //make sure we have a trace context
            if (context.traceContext)
            {
                /* whenever we move either the camera or geometry we have to set this to true 
                 * so the tracing starts from zero again. */
                context.traceContext.resetAccumulation = true;
            }
        }
    }

    this.keyDown = function(e)
    {
        var scaleRatio = context.traceContext.scaleRatio;

        if (e == VG.Events.KeyCodes.One) context.traceContext.scaleRatio = 0.25;
        if (e == VG.Events.KeyCodes.Two) context.traceContext.scaleRatio = 0.50;
        if (e == VG.Events.KeyCodes.Three) context.traceContext.scaleRatio = 1.0;

        if (context.traceContext.scaleRatio != scaleRatio)
        {
            context.traceContext.resetAccumulation = true;
        }
    }

    this.mouseDown = function(e) { mouseDown = true; VG.context.workspace.autoRedrawInterval=0; }
    this.mouseUp = function(e) { mouseDown = false; VG.context.workspace.autoRedrawInterval=2000; }

    this.render = function(delta)
    {
        storedDelta = delta;
        //TODO update aspect ratio on a resize callback not here / everyframe
        camera.aspect = this.rect.width / this.rect.height;
        camera.updateProjection();

        context.size2D.set(this.rect.width, this.rect.height);
        
        /* Draws the scene with the pipeline and the given render context */
        pipeline.drawScene(context, scene, delta);
    }
}

PreviewWidget.prototype = Object.create(VG.UI.RenderWidget.prototype);
