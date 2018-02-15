// todo: rotate animation of models

PickSample=function()
{
    VG.UI.RenderWidget.call(this);

    /* Holds a reference of this object */
    var obj = this;


    /* Our 3d camera object */
    var camera = new VG.Render.Camera(60, this.rect.width / this.rect.height);
    camera.setRotation(0, -10, 0);
    camera.position.z = 30.0;
    camera.position.y = 3.0;


    /* A render context can be used to render a single scene multiple times with scpecial
       metadata built into it, ie. a shadowMap context, works toguether with a piepline and
       scene manager */
    var context = new VG.Render.Context();
    context.camera = camera;


    /* The  pipeline dictates how things get rendered and in which order */
    var pipeline = new VG.Render.Pipeline();


    /* The scene manager implements optimizations for realtime rendering, 
       it can also be extended for more complex usages */
    var scene = new VG.Render.SceneManager();


    var bricks = []


    /* Utility function to add a brick to the scene */
    function addBrickAt(x, y, vertical)
    {
        var brick = VG.Render.Mesh.makeBox(vertical ? 1 : 8, vertical ? 8 : 1, 4.0);

        brick.position.set(x, y, 0.0);

        brick.parent = scene;
            
        /* Some meta data */
        brick.vertical = true;

        bricks.push(brick);
    } 

    var count = 100;
    for(var i=0;i<count;i++) {
        for(var j=0;j<4;j++) {
            addBrickAt((i - count / 2)*1.2, j*10 -20, true);
        }
    }
//    addBrickAt(-7, 0, true);
//    addBrickAt(-10, 0, true);
//    addBrickAt(-13, 0, true);
//    addBrickAt(7, 0, true);
//    addBrickAt(10, 0, true);
//    addBrickAt(13, 0, true);



    /* We expand the brick from scene node (mesh is also an scene node) so we
       can have the transform utilities built into our object like
       rotation translation and simple collision. */

    var customMaterial = new CustomMaterial();

    var picked = null;
    var mouseStart = {x:0, y:0};
    var objectStart = {};
    var rotate = {state: null, start: {}, savedAngle: {yaw: 0, pitch: -10}, angle: {}};
    this.mouseDown = function (event) {
        var hitMesh = pipeline.hitTestScene(context, scene, event.pos.x, event.pos.y);
        mouseStart = {x: event.pos.x, y: event.pos.y};
        if (hitMesh) {
            hitMesh.material = customMaterial;
            hitMesh.picking = true;
            if (picked) {
                picked.picking = false;
            }
            picked = hitMesh;
            objectStart = {x: picked.position.x, y: picked.position.y, z: picked.position.z};
        } else {
            rotate.state = 'rotating';
            rotate.start = {x: event.pos.x, y: event.pos.y};
        }
    };
    this.mouseUp = function (event) {
        if(picked) {
            picked.picking = false;
            picked.material = null;
            picked = null;
        }
        if(rotate.state) {
            rotate.state = null;
            rotate.savedAngle.yaw = rotate.angle.yaw;
            rotate.savedAngle.pitch = rotate.angle.pitch;
        }
    };
    this.mouseMove = function (event) {
        if(picked) {
            var VP = new VG.Math.Matrix4(camera.projM);
            VP.multiply(camera.getTransform().invert());
            VP.invert();

            var dx = event.pos.x - mouseStart.x;
            var dy = event.pos.y - mouseStart.y;
            dx /= this.rect.width;
            dy /= this.rect.height;
            var delta = new VG.Math.Vector3(dx, -dy, 0);
            var zero = new VG.Math.Vector3(0, 0, 0);
            delta = VP.multiplyVector3(delta);
            zero = VP.multiplyVector3(zero);
            delta.sub(zero);
            delta.mul(camera.position.z * 2); // times two because opengl range is -1 to 1.
            picked.position.set(delta.x+objectStart.x, delta.y+objectStart.y, delta.z + objectStart.z);
        }
        if(rotate.state) {
            var delta = {
                yaw : (event.pos.x - rotate.start.x) * 180 / this.rect.width,
                pitch: (event.pos.y - rotate.start.y)*180/this.rect.height
            };
            rotate.angle.yaw = rotate.savedAngle.yaw + delta.yaw;
            rotate.angle.pitch = rotate.savedAngle.pitch + delta.pitch;
            camera.setRotation(rotate.angle.yaw, rotate.angle.pitch, 0);
        }
    };


    this.render = function(delta)
    {
        //TODO update aspect ratio on a resize callback not here / everyframe
        camera.aspect = this.rect.width / this.rect.height;
        camera.updateProjection();

        /* Draws the scene with the pipeline and the given render context */
        pipeline.drawScene(context, scene, delta);

    }
}

PickSample.prototype = Object.create(VG.UI.RenderWidget.prototype);



function vgMain(workspace)
{
    /* GameSample expands from a RenderWidget that way we can use it for general 2d/3d
       rendering and also to  get input and resize events */
    var renderWidget = new PickSample();

    var mainLayout = VG.UI.Layout(renderWidget);
    workspace.layout = mainLayout;
}

CustomMaterial = function()
{
    VG.Render.Material.call(this);

    var vSrc = [
        '#version 100',
        'attribute vec4 position;',
        'attribute vec3 normal;',
        'attribute vec2 uv;',

        'uniform mat4 mvM;',
        'uniform mat4 projM;',

        'varying vec3 vN;',

        'void main() {',
        '   vN = (mvM * vec4(normal, 0.0)).xyz;',
        '   vec4 pos = mvM * position;',
        '   gl_Position = projM * pos;',
        '}'
    ].join("\n");

    var fSrc = [
        '#version 100',
        'precision mediump float;',

        'varying vec3 vN;',

        'void main() {',
        '   vec3 L = normalize(vec3(-0.5, 0.5, 0.5));',
        '   vec3 N = normalize(vN);',
        '   vec3 color = vec3(1.0, 0.0, 0.0) + vec3(0.5, 0.5, 1.0) * clamp(dot(L, N), 0.0, 1.0);',
        '   gl_FragColor = vec4(color, 1.0);',
        '}'
    ].join("\n");

    this.shader = new VG.Shader(vSrc, fSrc);
    this.shader.depthTest = true;
    this.shader.depthWrite = true;

    this.shader.create();
};

CustomMaterial.prototype = Object.create(VG.Render.Material.prototype);