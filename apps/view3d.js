Material=function()
{
    VG.Render.Material.call(this);

    this.diffuse = VG.Core.Color(55, 55, 128);

    this.ambient = VG.Core.Color(5, 5, 25);
    this.specular = VG.Core.Color(110, 110, 200);
    this.reflectness = 0.0;
    this.fresnelPower = 1.0;
    this.shineness = 80.0;

    var vSrc = [
        '#version 100',
        'attribute vec4 position;',
        'attribute vec3 normal;',
        'attribute vec2 vUV;',

        'uniform mat4 mvM;',
        'uniform mat4 projM;',

        'varying vec2 texCoord;',
        'varying vec3 vN;',
        'varying vec3 viewDir;',

        'void main() {',
        '   texCoord = vUV;',
        '   vN = (mvM * vec4(normal, 0.0)).xyz;',
        '   vec4 pos = mvM * position;',
        '   viewDir = -pos.xyz;',
        '   gl_Position = projM * pos;',
        '}',
    ].join("\n");

    var fSrc = [
        '#version 100',
        'precision mediump float;',

        'uniform samplerCube cubeMap;',

        'varying vec2 texCoord;',
        'varying vec3 vN;',
        'varying vec3 viewDir;',

        'uniform vec3 diff;',
        'uniform vec3 ambient;',
        'uniform vec3 specular;',
        'uniform float reflectness;',
        'uniform float fresnelPower;',
        'uniform float shineness;',

        'void main() {',
        '   vec3 L = normalize(vec3(-0.5, 0.5, 0.5));',
        '   vec3 N = normalize(vN);',
        '   vec3 V = normalize(viewDir);',

        '   vec3 H = normalize(L + V);',
        '   float fZero = pow(1.0 - (1.0 / 1.31), 2.0) / pow(1.0 + (1.0 / 1.31), 2.0);',

        '   float base = max(0.0, dot(N, L));',
        '   float exp = pow(base, 5.0);',
        '   float fresnel = fZero + (1.0 - fZero) * exp;',

        '   vec3 R = diff * clamp(dot(L, N), 0.0, 1.0);',
        '   vec3 S = specular * max(0.0, pow(dot(N, H), shineness));',

        '   vec3 E = textureCube(cubeMap, reflect(V, N)).xyz;', 

        '   vec3 color = ambient + R + (specular * (fresnel * fresnelPower)) + S + (E * reflectness);',

        '   gl_FragColor = vec4(color, 1.0);',
        '}'
    ].join("\n");

    this.shader = new VG.Shader(vSrc, fSrc);
    this.shader.depthTest = true;
    this.shader.depthWrite = true;
    this.shader.culling = false;

    this.shader.create();

    this.cubeMap=null;

    this.loadCubeMap();
}

Material.prototype = Object.create(VG.Render.Material.prototype);

Material.prototype.loadCubeMap=function()
{    
    var images = ["cube_nx.jpg", "cube_px.jpg", "cube_py.jpg", "cube_ny.jpg", "cube_nz.jpg", "cube_pz.jpg"];

    var obj = this;

    //TODO replace this with app images
    var i = -1;

    var loadNext = function()
    {
        i++;

        if (i >= images.length)
        {
            obj.cubeMap = new VG.Texture(images, true);
            obj.cubeMap.flipY = false;
            obj.cubeMap.create();

            return;
        }

        
        VG.loadStyleImage("visualgraphics", images[i], function(im){ 
            images[i] = im;

            loadNext();
        });
    };

    //async load
    loadNext();
}

Material.prototype.bind=function()
{
    this.shader.bind();

    this.shader.setColor3("diff", this.diffuse);
    this.shader.setColor3("ambient", this.ambient);
    this.shader.setColor3("specular", this.specular);

    this.shader.setFloat('reflectness', this.reflectness);
    this.shader.setFloat('fresnelPower', this.fresnelPower);
    this.shader.setFloat('shineness', this.shineness);

    if (this.cubeMap)
    {
        this.shader.setTexture("cubeMap", this.cubeMap, 0);
    }
}





var VisualOption=function(p)
{
    this.p = p;

    this.name = "Visual Option";

    this.layout = new VG.UI.Layout();
 
    this.onDeactivate = function(){};
    this.onActivate = function(){};
}

VisualOption.prototype.activate=function()
{
    this.onActivate();
}

VisualOption.prototype.deactivate=function()
{
    this.onDeactivate();
}



View3D=function()
{
    var workspace = VG.context.workspace;

    var obj = this;

    this.renderWidget = new View3D.RenderWidget();

    this.options = [];
 
    this.editLayout = VG.UI.LabelLayout();
    this.editLayout.labelSpacing = 20;

    this.colorPick = VG.UI.ColorWheel();
    this.colorPick.changed = function()
    {
        obj.renderWidget.mat.diffuse.copy(obj.colorPick.color);

        obj.renderWidget.mat.ambient.copy(obj.colorPick.color);
        obj.renderWidget.mat.ambient.mul(0.4);

        obj.renderWidget.mat.specular.copy(obj.colorPick.color);
        obj.renderWidget.mat.specular.mul(1.1);
    }
    

    this.shineSlider = VG.UI.Slider(10, 100, 1); 
    this.shineSlider.changed = function() { obj.onSliderChange("shineness", obj.shineSlider.value); };  
    this.editLayout.addChild("Glossiness", this.shineSlider);


    this.reflectSlider = VG.UI.Slider(0, 100, 1); 
    this.reflectSlider.changed = function() { obj.onSliderChange("reflectness", obj.reflectSlider.value / 100); };  
    this.editLayout.addChild("Reflect", this.reflectSlider); 


    this.fresnelSlider = VG.UI.Slider(0, 20, 1); 
    this.fresnelSlider.changed = function() { obj.onSliderChange("fresnelPower", obj.fresnelSlider.value / 10); };  
    this.editLayout.addChild("Fresnel", this.fresnelSlider); 


    this.rotTableSlider = VG.UI.Slider(-50, 50, 1); 
    this.rotTableSlider.changed = function() { obj.renderWidget.rotTableSpeed = obj.rotTableSlider.value; };  
    this.rotTableSlider.valueFromModel(10);
    this.editLayout.addChild("Rotation", this.rotTableSlider); 

    
    this.fresnelSlider.valueFromModel(10);
    this.reflectSlider.valueFromModel(30);
    this.shineSlider.valueFromModel(80);

    this.colorPick.color = this.renderWidget.mat.diffuse;

 
    this.initVisualOptions();


    this.menuLayout = VG.UI.Layout(this.createMenu(), this.colorPick, this.editLayout);
    this.menuLayout.vertical = true;
 
    this.renderLayout = VG.UI.Layout(this.renderWidget);
    this.renderLayout.vertical = true;

    
    var mainLayout=VG.UI.SplitLayout(this.menuLayout, 25, this.renderLayout, 75 );


    workspace.layout = mainLayout;

    this.curOption = -1;
    
    this.switchVisualOption(0);
}

View3D.prototype.initVisualOptions=function()
{
    this.options.push(new TextVOption(this));
    this.options.push(new PrimitiveVOption(this));
    this.options.push(new MeshOBJVOption(this));
    this.options.push(new MeshSTLVOption(this));
}

View3D.prototype.createMenu=function()
{
    var obj = this;

    this.modelEdit = VG.UI.PopupButton(""); 

    this.modelEdit.applyNewIndex = function(index)
    {
        VG.UI.PopupButton.prototype.applyNewIndex.call(this, index);

        obj.switchVisualOption(index); 
    }

    var layout = new VG.UI.Layout(this.modelEdit);
    layout.horizontal = true;

    this.optionLayout = new VG.UI.StackedLayout();


    layout.margin.set(10, 0, 0, 0);
    layout.addChild(this.optionLayout);


    for (var i = 0; i < this.options.length; i++)
    {
        var option = this.options[i]; 

        this.modelEdit.addItem(option.name);

        this.optionLayout.addChild(option.layout);

        option.deactivate();
    }

    return layout;
}

View3D.prototype.switchVisualOption=function(index)
{

    if (index >= this.options.length || index < 0) throw "invalid index";

    var option = this.options[this.curIndex];

    if (option) option.deactivate();

    option = this.options[index];
    option.activate();

    this.optionLayout.current = option.layout;
}

View3D.prototype.onSliderChange=function(key, value)
{
    this.renderWidget.mat[key] = value;
}








var PrimitiveVOption = function(p)
{
    VisualOption.call(this, p);

    this.name = "Primitive";


    var cubeModel = new VG.Render.Mesh();

    cubeModel.loadFromOBJ(View3D.cubeOBJ);



    var pyraModel = new VG.Render.Mesh();

    pyraModel.loadFromOBJ(View3D.pyramOBJ);


    var activeModel = cubeModel;



    var cubeCB = new VG.UI.Checkbox();
    var pyraCB = new VG.UI.Checkbox();




    this.layout.addChild(new VG.UI.Label("Cube"));
    this.layout.addChild(cubeCB);

    this.layout.addChild(new VG.UI.Label("Pyramid"));
    this.layout.addChild(pyraCB);
 


    this.layout.spacing = 8;

    var obj = this;

    function setModel()
    {
        obj.p.renderWidget.model = activeModel;
    }

    this.onActivate = function()
    {
        setModel();
    }


    cubeCB.checked = true;


    cubeCB.changed = function()
    {
        if (!cubeCB.checked) return;

        pyraCB.checked = false;
        cubeCB.checked = true;

        activeModel = cubeModel;
        setModel();
    }

    pyraCB.changed = function()
    {
        if (!pyraCB.checked) return;

        pyraCB.checked = true;
        cubeCB.checked = false;

        activeModel = pyraModel;
        setModel();
    }
}

PrimitiveVOption.prototype = Object.create(VisualOption.prototype);







var MeshOBJVOption = function(p)
{
    VisualOption.call(this, p);

    this.name = "Mesh .obj";

    var obj = this;

    var browseBtn = new VG.UI.Button("Load");

    browseBtn.clicked = function()
    {
        var fileDialog=VG.OpenFileDialog( VG.UI.FileDialog.Text, function( filename, text ) {
              
            var model = new VG.Render.Mesh();
            var box = model.loadFromOBJ(text);
            var width = box.x.max - box.x.min;
            var scale = 1.0/width;
            VG.log("Auto scaling model: " + scale + " x");
            model = new VG.Render.Mesh();
            var box = model.loadFromOBJ(text, scale);
            model.t = new VG.Math.Matrix4();

            obj.p.renderWidget.model = model; 

        }.bind( obj.p.workspace ));
    }




    this.layout.addChild(browseBtn);
    this.layout.addChild(new VG.UI.Label(" .obj file"));


    this.onActivate = function()
    {
        obj.p.renderWidget.model = null;
    }
}

MeshOBJVOption.prototype = Object.create(VisualOption.prototype);



var MeshSTLVOption = function(p)
{
    VisualOption.call(this, p);

    this.name = "Mesh .stl";

    var obj = this;

    var browseBtn = new VG.UI.Button("Load");

    browseBtn.clicked = function()
    {
        var fileDialog=VG.OpenFileDialog( VG.UI.FileDialog.Text, function( filename, text ) {

            var model = new VG.Render.Mesh();
            model.loadFromSTL(text);
            model.t = new VG.Math.Matrix4();

            obj.p.renderWidget.model = model;

        }.bind( obj.p.workspace ));
    }




    this.layout.addChild(browseBtn);
    this.layout.addChild(new VG.UI.Label(" .stl file"));


    this.onActivate = function()
    {
        obj.p.renderWidget.model = null;
    }
}

MeshSTLVOption.prototype = Object.create(VisualOption.prototype);






var TextVOption = function(p)
{
    VisualOption.call(this, p);

    this.name = "3D Text";
    var obj = this;
    var font = VG.fontManager.getFont("Roboto Regular");
    var text = "Petter's WebGL Demo";

    var model = null;
    function UpdateModel(force)
    {
        if (force)
        {
            model.dispose();
            model = null;
        }
        if (!model)
        {
            var t3D = VG.Font.Triangulator.create3DText(font, text, 3, 0.25, 1, 0.015);

            model = new VG.Render.Mesh();
			// create geometry
			model.vertexCount = t3D.v.length;
			model.addVertexBuffer(VG.Type.Float,
				[
					{ name: "position", offset: 0, stride: 4 },
					{ name: "normal", offset: 4, stride: 4 }
				]
			);
			model.layout = model.generateStaticLayout();

            var j = 0;

            var vx, vy, vz, nx, ny, nz;

            var xW = 0.0;
            var yH = 0.0;

            for (var i = 0; i < t3D.v.length; i++)
            {
                vx = t3D.v[i].x;
                vy = t3D.v[i].z;
                vz = t3D.v[i].y;
                
                nx = t3D.n[i].x;
                ny = t3D.n[i].z;
                nz = t3D.n[i].y;

                xW = Math.max(xW, vx);
                yH = Math.max(yH, vy);

                model.setVertex(i, { position: [vx, vy, vz, 1.0], normal: [nx, ny, nz] });
            }

            var t = new VG.Math.Matrix4();

            var scale = (3.0 / xW);

            t.setIdentity();
            t.rotate(90, 1, 0, 0);
            t.scale(scale, scale, scale);
            t.translate( -(xW / 2), 0.0, -0.5);

            model.applyTransform(t);
            model.update();
        }
    }

    var textLineEdit=new VG.UI.TextLineEdit("Petter's WebGL Demo")
    textLineEdit.textChanged=function ( newText ) {

        //make sure only updates when needed
        if (newText == text) return;

        text=newText;
        //force to update
        UpdateModel(true);
        p.renderWidget.model = model;

    }
    this.layout.addChild( textLineEdit );


    this.onActivate = function()
    {
        UpdateModel();

        p.renderWidget.model = model;
    }
}

TextVOption.prototype = Object.create(VisualOption.prototype);









View3D.RenderWidget=function()
{   
    VG.UI.RenderWidget.call(this);

    var obj = this;

    var camera = new VG.Render.Camera(60, this.rect.width / this.rect.height);
    //camera.parent = boom;

    var orbit = new VG.Render.OrbitCamera();
    orbit.camera = camera;

    this.rotTableSpeed = 10.0;

    var mX = 0;
    var mY = 0;

    mouseDown = false;

    var resetMouse = true;

    this.mouseEnter = function(event)
    {
        resetMouse = true;
    }

    this.mouseLeave = function(event)
    {
        resetMouse = true;
    }

    this.mouseMove = function(event)
    {
        if (resetMouse)
        {
            mX = event.pos.x;
            mY = event.pos.y;
            resetMouse = false;
        }


        var dX = mX - event.pos.x;
        var dY = mY - event.pos.y;

        mX = event.pos.x;
        mY = event.pos.y;

        if (mouseDown)
        {
            orbit.incRotation(dX * 0.3, dY * 0.3, 0.0);
        }
    }

    this.mouseUp = function() { mouseDown = false; }
    this.mouseDown = function() { mouseDown = true; }

    this.mouseWheel = function(dt)
    {
        orbit.incZoom(-dt * 0.5);
    }
    

    //initialize the scene
    this.mat = new Material();

    //initial rotation and zoom
    orbit.incRotation(25, -15, 0);
    orbit.zoom = 0.2;


    //context and pipeline
    var context = new VG.Render.Context();
    context.camera = camera;

    var pipeline = new VG.Render.Pipeline();    


    //finally the render function
    this.render = function(delta)
    { 

        //TODO update aspect ratio on a resize callback not here / everyframe
        camera.aspect = this.rect.width / this.rect.height;
        camera.updateProjection();
        
        //tick the orbit camera to update it
        orbit.tick(delta);

		if (!this.model)
			return;        
        if (!this.model.material)
			this.model.material = this.mat;

        //rotate table
        this.model.incRotation(-this.rotTableSpeed * delta, 0, 0);
        pipeline.drawMesh(context, this.model);
    }
}

View3D.RenderWidget.prototype = Object.create(VG.UI.RenderWidget.prototype);





function vgMain( workspace )
{
    var v3d = new View3D();
}



View3D.cubeOBJ = "# Blender v2.72 (sub 0) OBJ File: \'cube.blend\'\n# www.blender.org\no Cube\nv 0.909683 -0.909683 -1.000000\nv 1.000000 -0.909683 -0.909683\nv 0.909683 -1.000000 -0.909683\nv 0.973547 -0.909683 -0.973547\nv 0.961827 -0.961827 -0.961827\nv 0.973547 -0.973547 -0.909683\nv 0.909683 -0.973547 -0.973547\nv 0.909683 -1.000000 0.909683\nv 1.000000 -0.909683 0.909683\nv 0.909683 -0.909683 1.000000\nv 0.973547 -0.973547 0.909683\nv 0.961827 -0.961827 0.961827\nv 0.973547 -0.909683 0.973547\nv 0.909683 -0.973547 0.973547\nv -0.909683 -1.000000 0.909683\nv -0.909683 -0.909683 1.000000\nv -1.000000 -0.909683 0.909683\nv -0.909683 -0.973547 0.973547\nv -0.961828 -0.961827 0.961827\nv -0.973547 -0.909683 0.973547\nv -0.973547 -0.973547 0.909683\nv -1.000000 -0.909683 -0.909683\nv -0.909682 -0.909683 -1.000000\nv -0.909682 -1.000000 -0.909683\nv -0.973546 -0.909683 -0.973547\nv -0.961827 -0.961827 -0.961828\nv -0.909682 -0.973547 -0.973547\nv -0.973546 -0.973547 -0.909683\nv 1.000000 0.909683 -0.909682\nv 0.909683 0.909683 -0.999999\nv 0.909683 1.000000 -0.909682\nv 0.973547 0.909683 -0.973546\nv 0.961828 0.961827 -0.961827\nv 0.909683 0.973547 -0.973546\nv 0.973547 0.973547 -0.909682\nv 0.909682 1.000000 0.909683\nv 0.909682 0.909683 1.000001\nv 0.999999 0.909683 0.909683\nv 0.909682 0.973547 0.973547\nv 0.961827 0.961827 0.961828\nv 0.973546 0.909683 0.973547\nv 0.973546 0.973547 0.909683\nv -0.909683 1.000000 0.909682\nv -1.000000 0.909683 0.909682\nv -0.909683 0.909683 1.000000\nv -0.973547 0.973547 0.909682\nv -0.961828 0.961827 0.961827\nv -0.973547 0.909683 0.973546\nv -0.909683 0.973547 0.973546\nv -0.909683 0.909683 -1.000000\nv -1.000000 0.909683 -0.909683\nv -0.909683 1.000000 -0.909683\nv -0.973547 0.909683 -0.973547\nv -0.961827 0.961827 -0.961827\nv -0.973547 0.973547 -0.909683\nv -0.909683 0.973547 -0.973547\nvt 0.000000 0.000000\nvt 1.000000 0.000000\nvt 1.000000 1.000000\nvt 0.000000 1.000000\nvn 0.187700 0.187700 -0.964100\nvn 0.187700 -0.187700 -0.964100\nvn -0.187700 -0.187700 -0.964100\nvn 0.187700 -0.187700 0.964100\nvn 0.187700 0.187700 0.964100\nvn -0.187700 0.187700 0.964100\nvn -0.964100 0.187700 0.187700\nvn -0.964100 0.187700 -0.187700\nvn -0.964100 -0.187700 -0.187700\nvn -0.187700 0.964100 -0.187700\nvn -0.187700 0.964100 0.187700\nvn 0.187700 0.964100 0.187700\nvn 0.964100 -0.187700 -0.187700\nvn 0.964100 0.187700 -0.187700\nvn 0.964100 0.187700 0.187700\nvn 0.696700 -0.170800 -0.696700\nvn 0.577300 -0.577300 -0.577300\nvn 0.170800 -0.696700 -0.696700\nvn 0.696700 -0.696700 -0.170800\nvn 0.696700 -0.696700 0.170800\nvn 0.577300 -0.577300 0.577300\nvn 0.170800 -0.696700 0.696700\nvn 0.696700 -0.170800 0.696700\nvn -0.170800 -0.696700 0.696700\nvn -0.577300 -0.577300 0.577300\nvn -0.696700 -0.696700 0.170800\nvn -0.696700 -0.170800 0.696700\nvn -0.696700 -0.170800 -0.696700\nvn -0.577300 -0.577300 -0.577300\nvn -0.696700 -0.696700 -0.170800\nvn -0.170800 -0.696700 -0.696700\nvn 0.696700 0.170800 -0.696700\nvn 0.577300 0.577300 -0.577300\nvn 0.696700 0.696700 -0.170800\nvn 0.170800 0.696700 -0.696700\nvn 0.170800 0.696700 0.696700\nvn 0.577300 0.577300 0.577300\nvn 0.696700 0.696700 0.170800\nvn 0.696700 0.170800 0.696700\nvn -0.696700 0.696700 0.170800\nvn -0.577300 0.577300 0.577300\nvn -0.170800 0.696700 0.696700\nvn -0.696700 0.170800 0.696700\nvn -0.696700 0.170800 -0.696700\nvn -0.577300 0.577300 -0.577300\nvn -0.170800 0.696700 -0.696700\nvn -0.696700 0.696700 -0.170800\nvn 0.964100 -0.187700 0.187700\nvn 0.187700 -0.964100 0.187700\nvn 0.187700 -0.964100 -0.187700\nvn -0.187700 -0.964100 -0.187700\nvn -0.187700 -0.187700 0.964100\nvn -0.187700 -0.964100 0.187700\nvn -0.964100 -0.187700 0.187700\nvn -0.187700 0.187700 -0.964100\nvn 0.187700 0.964100 -0.187700\ns 1\nf 30\/1\/1 1\/2\/2 23\/3\/3\nf 10\/1\/4 37\/2\/5 45\/3\/6\nf 44\/2\/7 51\/3\/8 22\/4\/9\nf 52\/2\/10 43\/3\/11 36\/4\/12\nf 2\/1\/13 29\/2\/14 38\/3\/15\nf 4\/2\/16 5\/3\/17 7\/4\/18\nf 6\/2\/19 5\/3\/17 4\/4\/16\nf 7\/2\/18 5\/3\/17 6\/4\/19\nf 11\/2\/20 12\/3\/21 14\/4\/22\nf 13\/2\/23 12\/3\/21 11\/4\/20\nf 14\/2\/22 12\/3\/21 13\/4\/23\nf 18\/2\/24 19\/3\/25 21\/4\/26\nf 20\/2\/27 19\/3\/25 18\/4\/24\nf 21\/2\/26 19\/3\/25 20\/4\/27\nf 25\/2\/28 26\/3\/29 28\/4\/30\nf 27\/2\/31 26\/3\/29 25\/4\/28\nf 28\/2\/30 26\/3\/29 27\/4\/31\nf 32\/2\/32 33\/3\/33 35\/4\/34\nf 34\/2\/35 33\/3\/33 32\/4\/32\nf 35\/2\/34 33\/3\/33 34\/4\/35\nf 39\/2\/36 40\/3\/37 42\/4\/38\nf 41\/2\/39 40\/3\/37 39\/4\/36\nf 42\/2\/38 40\/3\/37 41\/4\/39\nf 46\/2\/40 47\/3\/41 49\/4\/42\nf 48\/2\/43 47\/3\/41 46\/4\/40\nf 49\/2\/42 47\/3\/41 48\/4\/43\nf 53\/2\/44 54\/3\/45 56\/4\/46\nf 55\/2\/47 54\/3\/45 53\/4\/44\nf 56\/2\/46 54\/3\/45 55\/4\/47\nf 9\/2\/48 11\/3\/20 6\/4\/19\nf 11\/2\/20 8\/3\/49 3\/4\/50\nf 3\/1\/50 24\/2\/51 27\/3\/31\nf 27\/2\/31 23\/3\/3 1\/4\/2\nf 1\/1\/2 30\/2\/1 32\/3\/32\nf 32\/2\/32 29\/3\/14 2\/4\/13\nf 16\/2\/52 18\/3\/24 14\/4\/22\nf 18\/2\/24 15\/3\/53 8\/4\/49\nf 9\/1\/48 38\/2\/15 41\/3\/39\nf 13\/1\/23 41\/2\/39 37\/3\/5\nf 22\/2\/9 28\/3\/30 21\/4\/26\nf 21\/1\/26 28\/2\/30 24\/3\/51\nf 45\/2\/6 48\/3\/43 20\/4\/27\nf 48\/2\/43 44\/3\/7 17\/4\/54\nf 51\/2\/8 53\/3\/44 25\/4\/28\nf 53\/2\/44 50\/3\/55 23\/4\/3\nf 36\/2\/12 42\/3\/38 35\/4\/34\nf 42\/2\/38 38\/3\/15 29\/4\/14\nf 50\/2\/55 56\/3\/46 34\/4\/35\nf 34\/1\/35 56\/2\/46 52\/3\/10\nf 43\/2\/11 49\/3\/42 39\/4\/36\nf 49\/2\/42 45\/3\/6 37\/4\/5\nf 43\/1\/11 52\/2\/10 55\/3\/47\nf 55\/2\/47 51\/3\/8 44\/4\/7\nf 8\/2\/49 15\/3\/53 24\/4\/51\nf 50\/4\/55 30\/1\/1 23\/3\/3\nf 16\/4\/52 10\/1\/4 45\/3\/6\nf 17\/1\/54 44\/2\/7 22\/4\/9\nf 31\/1\/56 52\/2\/10 36\/4\/12\nf 9\/4\/48 2\/1\/13 38\/3\/15\nf 1\/1\/2 4\/2\/16 7\/4\/18\nf 2\/1\/13 6\/2\/19 4\/4\/16\nf 3\/1\/50 7\/2\/18 6\/4\/19\nf 8\/1\/49 11\/2\/20 14\/4\/22\nf 9\/1\/48 13\/2\/23 11\/4\/20\nf 10\/1\/4 14\/2\/22 13\/4\/23\nf 15\/1\/53 18\/2\/24 21\/4\/26\nf 16\/1\/52 20\/2\/27 18\/4\/24\nf 17\/1\/54 21\/2\/26 20\/4\/27\nf 22\/1\/9 25\/2\/28 28\/4\/30\nf 23\/1\/3 27\/2\/31 25\/4\/28\nf 24\/1\/51 28\/2\/30 27\/4\/31\nf 29\/1\/14 32\/2\/32 35\/4\/34\nf 30\/1\/1 34\/2\/35 32\/4\/32\nf 31\/1\/56 35\/2\/34 34\/4\/35\nf 36\/1\/12 39\/2\/36 42\/4\/38\nf 37\/1\/5 41\/2\/39 39\/4\/36\nf 38\/1\/15 42\/2\/38 41\/4\/39\nf 43\/1\/11 46\/2\/40 49\/4\/42\nf 44\/1\/7 48\/2\/43 46\/4\/40\nf 45\/1\/6 49\/2\/42 48\/4\/43\nf 50\/1\/55 53\/2\/44 56\/4\/46\nf 51\/1\/8 55\/2\/47 53\/4\/44\nf 52\/1\/10 56\/2\/46 55\/4\/47\nf 2\/1\/13 9\/2\/48 6\/4\/19\nf 6\/1\/19 11\/2\/20 3\/4\/50\nf 7\/4\/18 3\/1\/50 27\/3\/31\nf 7\/1\/18 27\/2\/31 1\/4\/2\nf 4\/4\/16 1\/1\/2 32\/3\/32\nf 4\/1\/16 32\/2\/32 2\/4\/13\nf 10\/1\/4 16\/2\/52 14\/4\/22\nf 14\/1\/22 18\/2\/24 8\/4\/49\nf 13\/4\/23 9\/1\/48 41\/3\/39\nf 10\/4\/4 13\/1\/23 37\/3\/5\nf 17\/1\/54 22\/2\/9 21\/4\/26\nf 15\/4\/53 21\/1\/26 24\/3\/51\nf 16\/1\/52 45\/2\/6 20\/4\/27\nf 20\/1\/27 48\/2\/43 17\/4\/54\nf 22\/1\/9 51\/2\/8 25\/4\/28\nf 25\/1\/28 53\/2\/44 23\/4\/3\nf 31\/1\/56 36\/2\/12 35\/4\/34\nf 35\/1\/34 42\/2\/38 29\/4\/14\nf 30\/1\/1 50\/2\/55 34\/4\/35\nf 31\/4\/56 34\/1\/35 52\/3\/10\nf 36\/1\/12 43\/2\/11 39\/4\/36\nf 39\/1\/36 49\/2\/42 37\/4\/5\nf 46\/4\/40 43\/1\/11 55\/3\/47\nf 46\/1\/40 55\/2\/47 44\/4\/7\nf 3\/1\/50 8\/2\/49 24\/4\/51";

View3D.pyramOBJ = "# Blender v2.72 (sub 0) OBJ File: \'cube.blend\'\n# www.blender.org\no Cone\nv 0.067231 -0.536997 -1.890248\nv 0.000000 -0.579518 -1.872438\nv -0.067231 -0.536997 -1.890248\nv 0.047540 -0.567064 -1.904073\nv 0.000000 -0.561546 -1.926656\nv -0.047540 -0.567064 -1.904073\nv 0.000000 -0.536997 -1.916667\nv 0.067231 1.286020 -0.067231\nv -0.067231 1.286020 -0.067231\nv -0.067231 1.286020 0.067231\nv 0.067231 1.286020 0.067231\nv 0.000000 1.291589 -0.089510\nv -0.000000 1.345531 -0.000000\nv -0.089510 1.291589 0.000000\nv -0.000000 1.291589 0.089510\nv 0.089510 1.291589 0.000000\nv 1.872438 -0.579518 0.000000\nv 1.890248 -0.536997 -0.067231\nv 1.890248 -0.536997 0.067231\nv 1.904073 -0.567064 -0.047540\nv 1.926656 -0.561546 0.000000\nv 1.916667 -0.536997 0.000000\nv 1.904073 -0.567064 0.047540\nv 0.067231 -0.536997 1.890248\nv -0.067231 -0.536997 1.890248\nv -0.000000 -0.579518 1.872438\nv -0.000000 -0.536997 1.916667\nv -0.000000 -0.561546 1.926656\nv -0.047540 -0.567064 1.904073\nv 0.047539 -0.567064 1.904073\nv -1.890248 -0.536997 0.067231\nv -1.890248 -0.536997 -0.067231\nv -1.872438 -0.579518 -0.000000\nv -1.916667 -0.536997 -0.000000\nv -1.926656 -0.561546 -0.000000\nv -1.904073 -0.567064 -0.047540\nv -1.904073 -0.567064 0.047540\nvn 0.771200 0.316600 0.552300\nvn 0.394200 0.830100 0.394200\nvn 0.552300 0.316600 0.771200\nvn -0.771200 0.316600 -0.552300\nvn -0.394200 0.830100 -0.394200\nvn -0.552300 0.316600 -0.771200\nvn -0.552300 0.316600 0.771200\nvn -0.394200 0.830100 0.394200\nvn -0.771200 0.316600 0.552300\nvn 0.552300 0.316600 -0.771200\nvn 0.394200 0.830100 -0.394200\nvn 0.771200 0.316600 -0.552300\nvn 0.411000 -0.581800 -0.701800\nvn 0.000000 -0.374100 -0.927400\nvn -0.411000 -0.581800 -0.701800\nvn 0.000000 0.532500 -0.846400\nvn 0.000000 0.816100 -0.577800\nvn 0.000000 1.000000 0.000000\nvn 0.577800 0.816100 0.000000\nvn -0.577800 0.816100 0.000000\nvn 0.000000 0.816100 0.577800\nvn 0.701800 -0.581900 -0.411000\nvn 0.927400 -0.374100 0.000000\nvn 0.701800 -0.581800 0.411000\nvn 0.846400 0.532500 0.000000\nvn 0.000000 0.532500 0.846400\nvn 0.000000 -0.374100 0.927400\nvn -0.411000 -0.581800 0.701800\nvn 0.411000 -0.581800 0.701800\nvn -0.846400 0.532500 0.000000\nvn -0.927400 -0.374100 0.000000\nvn -0.701800 -0.581800 -0.411000\nvn -0.701800 -0.581800 0.411000\nvn 0.182500 -0.983200 0.000000\nvn 0.000000 -0.983200 0.182500\nvn -0.182500 -0.983200 0.000000\nvn 0.000000 -0.983200 -0.182500\ns 1\nf 19\/\/1 11\/\/2 24\/\/3\nf 32\/\/4 9\/\/5 3\/\/6\nf 25\/\/7 10\/\/8 31\/\/9\nf 1\/\/10 8\/\/11 18\/\/12\nf 1\/\/10 4\/\/13 5\/\/14\nf 6\/\/15 5\/\/14 4\/\/13\nf 3\/\/6 7\/\/16 5\/\/14\nf 12\/\/17 13\/\/18 16\/\/19\nf 14\/\/20 13\/\/18 12\/\/17\nf 15\/\/21 13\/\/18 14\/\/20\nf 16\/\/19 13\/\/18 15\/\/21\nf 20\/\/22 21\/\/23 23\/\/24\nf 18\/\/12 22\/\/25 21\/\/23\nf 19\/\/1 23\/\/24 21\/\/23\nf 24\/\/3 27\/\/26 28\/\/27\nf 25\/\/7 29\/\/28 28\/\/27\nf 30\/\/29 28\/\/27 29\/\/28\nf 31\/\/9 34\/\/30 35\/\/31\nf 32\/\/4 36\/\/32 35\/\/31\nf 37\/\/33 35\/\/31 36\/\/32\nf 1\/\/10 18\/\/12 20\/\/22\nf 4\/\/13 20\/\/22 17\/\/34\nf 9\/\/5 32\/\/4 34\/\/30\nf 34\/\/30 31\/\/9 10\/\/8\nf 10\/\/8 25\/\/7 27\/\/26\nf 27\/\/26 24\/\/3 11\/\/2\nf 9\/\/5 12\/\/17 7\/\/16\nf 7\/\/16 12\/\/17 8\/\/11\nf 19\/\/1 24\/\/3 30\/\/29\nf 30\/\/29 26\/\/35 17\/\/34\nf 11\/\/2 19\/\/1 22\/\/25\nf 22\/\/25 18\/\/12 8\/\/11\nf 31\/\/9 37\/\/33 29\/\/28\nf 29\/\/28 37\/\/33 33\/\/36\nf 3\/\/6 6\/\/15 36\/\/32\nf 6\/\/15 2\/\/37 33\/\/36\nf 17\/\/34 26\/\/35 33\/\/36\nf 7\/\/16 1\/\/10 5\/\/14\nf 2\/\/37 6\/\/15 4\/\/13\nf 6\/\/15 3\/\/6 5\/\/14\nf 8\/\/11 12\/\/17 16\/\/19\nf 9\/\/5 14\/\/20 12\/\/17\nf 10\/\/8 15\/\/21 14\/\/20\nf 11\/\/2 16\/\/19 15\/\/21\nf 17\/\/34 20\/\/22 23\/\/24\nf 20\/\/22 18\/\/12 21\/\/23\nf 22\/\/25 19\/\/1 21\/\/23\nf 30\/\/29 24\/\/3 28\/\/27\nf 27\/\/26 25\/\/7 28\/\/27\nf 26\/\/35 30\/\/29 29\/\/28\nf 37\/\/33 31\/\/9 35\/\/31\nf 34\/\/30 32\/\/4 35\/\/31\nf 33\/\/36 37\/\/33 36\/\/32\nf 4\/\/13 1\/\/10 20\/\/22\nf 2\/\/37 4\/\/13 17\/\/34\nf 14\/\/20 9\/\/5 34\/\/30\nf 14\/\/20 34\/\/30 10\/\/8\nf 15\/\/21 10\/\/8 27\/\/26\nf 15\/\/21 27\/\/26 11\/\/2\nf 3\/\/6 9\/\/5 7\/\/16\nf 1\/\/10 7\/\/16 8\/\/11\nf 23\/\/24 19\/\/1 30\/\/29\nf 23\/\/24 30\/\/29 17\/\/34\nf 16\/\/19 11\/\/2 22\/\/25\nf 16\/\/19 22\/\/25 8\/\/11\nf 25\/\/7 31\/\/9 29\/\/28\nf 26\/\/35 29\/\/28 33\/\/36\nf 32\/\/4 3\/\/6 36\/\/32\nf 36\/\/32 6\/\/15 33\/\/36\nf 2\/\/37 17\/\/34 33\/\/36";
