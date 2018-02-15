/**
 * Created by w1 on 6/4/2015.
 */


/**
 * Common utility
 */
Util = {};
Util.initOptions = function(options, def, keys) {
    /**
     * Copy options, with default def.
     * not recursive, 1 level only, the rest is referenced
     * @param {Dictionary} keys - keys to which do a deeper copy
     */
    var out = {};
    if (options === undefined) {
        options = {};
    }
    if (keys === undefined) {
        keys = {};
    }
    for(var prop in def) {
        if (def.hasOwnProperty(prop)) {
            if (keys[prop] && options && options[prop]) {
                out[prop] = Util.initOptions(options[prop], def[prop]);
            } else {
                out[prop] = options[prop] !== undefined ? options[prop] : def[prop];
            }
        }
    }
    return out;
};


Line = function (group, vbIndex)
{
    /**
     * Description of a single line
     * @param {Lines} group - group that this line belong to
     */
    this.lines = group;
    this.vbIndex = vbIndex;
};
Line.prototype = Object.create(Object.prototype);
Line.prototype.set = function(start, end, options)
{
    /**
     * Set this line parameter
     * @param {VG.Math.Vector3} start - start of line
     * @param {VG.Math.Vector3} end - end of line
     * @param {{thickness:Number, color:VG.Core.Color, endColor:VG.Core.Color}} options - options
     */
    options = options || {};
    options.thickness = options.thickness || {};
    options.color = options.color || VG.Core.Color(255, 0, 0);
    options.endColor = options.endColor || options.color;
    var index = this.vbIndex;
    // start
    this.lines.linesBuffer.setBuffer(index++, start.x);
    this.lines.linesBuffer.setBuffer(index++, start.y);
    this.lines.linesBuffer.setBuffer(index++, start.z);
    index ++;
    this.lines.linesBuffer.setBuffer(index++, options.color.r);
    this.lines.linesBuffer.setBuffer(index++, options.color.g);
    this.lines.linesBuffer.setBuffer(index++, options.color.b);
    this.lines.linesBuffer.setBuffer(index++, options.color.a);
    // end
    this.lines.linesBuffer.setBuffer(index++, end.x);
    this.lines.linesBuffer.setBuffer(index++, end.y);
    this.lines.linesBuffer.setBuffer(index++, end.z);
    index ++;
    this.lines.linesBuffer.setBuffer(index++, options.endColor.r);
    this.lines.linesBuffer.setBuffer(index++, options.endColor.g);
    this.lines.linesBuffer.setBuffer(index++, options.endColor.b);
    this.lines.linesBuffer.setBuffer(index++, options.endColor.a);
};

Lines = function (parent, maxCount)
{
    /**
     * Group of lines as single draw call
     * @constructor
     */
    VG.Render.SceneNode.call(this);
    this.parent = parent;
    this.linesMaxCount = maxCount;
    this.linesBufferSingleSize = 8 * 2;
    this.linesBuffer = new VG.GPUBuffer(VG.Type.Float, this.linesBufferSingleSize * this.linesMaxCount);
    this.linesBuffer.create();
    this.linesCount = 0;
    this.shader = new VG.Shader(Lines.source.vertex, Lines.source.fragment);
    this.shader.depthTest = true;
    this.shader.depthWrite = true;
    this.shader.create();
    var that = this;
    this.onDraw = function (pipeline, context, delta) {
        that.draw(context);
    }
};
Lines.prototype = Object.create(VG.Render.SceneNode.prototype);

Lines.prototype.addLine = function(start, end, options)
{
    /**
     * Add a line, silently fail when full
     * @param {VG.Math.Vector3} start - start of line
     * @param {VG.Math.Vector3} end - end of line
     * @param {{thickness:Number, color:VG.Core.Color, endColor:VG.Core.Color}} options - options
     * @return {Line} - a line or null if full
     */
    if (this.linesCount >= this.linesMaxCount) {
        return null;
    }
    var index = this.linesCount * this.linesBufferSingleSize;
    var line = new Line(this, index);
    line.set(start, end, options);
    this.linesCount ++;
    return line;
};

Lines.prototype.draw = function (context)
{
    /**
     * Draw the lines
     * @important: since webgl does not support gl.lineWidth, use TLine for thickness
     * @param {VG.Render.Context} context
     */
    this.shader.bind();
	
	var projM = new VG.Math.Matrix4(context ? context.camera.projM : null);
	this.shader.setMatrix('projM', projM.elements);

	var mvM = new VG.Math.Matrix4(context ? context.camera.getTransform().invert() : null);
	mvM.multiply(this.getTransform());
    
	this.shader.setMatrix('mvM', mvM.elements);

    var stride = this.linesBuffer.getStride();
    // update include bind
    this.linesBuffer.update(0, this.linesCount * this.linesBufferSingleSize);
    this.linesBuffer.vertexAttrib(this.shader.getAttrib('position'), 3, false, stride * 8, 0);
    this.linesBuffer.vertexAttrib(this.shader.getAttrib('iColor'), 4, false, stride * 8, stride * 4);

    this.linesBuffer.drawBuffer(VG.Renderer.Primitive.Lines, 0, this.linesCount * 2);

	this.linesBuffer.purgeAttribs();
};

Lines.source = {
    vertex: [
        '#version 100',
        'attribute vec4 position;',
        'attribute vec4 iColor;',
        'uniform mat4 mvM;',
        'uniform mat4 projM;',
        'varying vec4 vColor;',
        'void main() {',
        '   vec4 pos = mvM * position;',
        '   vColor = iColor;',
        //'   vec4 tmp = projM * pos;',
        //'   if(tmp.x>1.0){',
        //'       vColor = vec4(1.0, 0.0, 0.0, 1.0);',
        //'   }else{',
        //'       vColor = vec4(0.0, 1.0, 0.0, 1.0);',
        //'   }',
        '   gl_Position = projM * pos;',
        '}'
    ].join('\n'),
    fragment: [
        '#version 100',
        "precision mediump float;",
        "varying vec4 vColor;",
        "void main() {",
        "gl_FragColor = vColor;",
        "}"
    ].join('\n')
};


CPolys = function (parent, polys, options)
{
    /**
     * CPolys describe one or more Convex Planar Polygon
     * Designed for drawing only without editing
     * It also responsible to do triangulation
     * @precondition each element of polys must contains at least three points
     * todo: no texture supported yet
     * @constructor
     */
    VG.Render.Mesh.call(this);
    var def = {
        color: new VG.Core.Color(255, 0, 0)
    };
    this.options = Util.initOptions(options, def);

    this.parent = parent;
    // options.textureUV = 'xy', 'yz', 'xz'
    var triCount = 0;
    for(var i = 0; i < polys.length; i++) {
        triCount += (polys[i].length-2);
    }
    
	// create geometry
	this.vertexCount = triCount * 3;
	this.addVertexBuffer(VG.Type.Float,
		[
			{ name: "position", offset: 0, stride: 4 },
			{ name: "normal", offset: 4, stride: 4 }
		]
	);
	this.layout = this.generateStaticLayout();

    var triArrays = {
        position: [],
        normal: []
    };
    var normal = new VG.Math.Vector3();
    normal.computeNormal(polys[0][0], polys[0][1], polys[0][2]);
    var index = 0;
    for(var i = 0; i < polys.length; i++) {
        var p = [polys[i][0],0,0];
        for(var j = 0; j<polys[i].length-2; j++) {
            p[1] = polys[i][j + 1];
            p[2] = polys[i][j + 2];
            for(var k = 0; k < 3; k++) {
                triArrays.position[index * 4    ] = p[k].x;
                triArrays.position[index * 4 + 1] = p[k].y;
                triArrays.position[index * 4 + 2] = p[k].z;
                triArrays.position[index * 4 + 3] = 1.0;
                triArrays.normal[index * 4    ] = normal.x;
                triArrays.normal[index * 4 + 1] = normal.y;
                triArrays.normal[index * 4 + 2] = normal.z;
                triArrays.normal[index * 4 + 3] = 0;
                index ++;
            }
        }
    }
    this.setTriangleArray(triArrays);
    this.update();
    this.onDraw = undefined;
};
CPolys.prototype = Object.create(VG.Render.Mesh.prototype);

TLines = function (parent, parts, options)
{
    /**
     * Construct triangle based front facing 3D line
     * @param {} options - options, format follow `def`
     * @constructor
     */
    VG.Render.SceneNode.call(this);
    var def = {
        thickness: 0.01,
        color: new VG.Core.Color(255, 0, 0),
        aspect: 1.2
    };
    this.options = Util.initOptions(options, def);

    this.parts = parts;

    this._cache = {};
    this._cache.mvp = new VG.Math.Matrix4();

    /**
     * Attributes needed:
     * position
     *
     */
    this.shader = new VG.Shader(TLines.source.vertex, TLines.source.fragment);
    this.shader.depthTest = true;
    this.shader.depthWrite = true;
    this.shader.create();

    // uniform: thickness, color
    // attribute: side: 0.5, -0.5
    this.lineDataSize = 8*3*2; // 3*(posA, posB, delta)
    this.linesBufferSingleSize = 8;
    this.lineCount = 0;
    for(var i = 0; i < parts.length; i++) {
        this.lineCount += parts[i].length - 1;
    }
    this.buffer = new VG.GPUBuffer(VG.Type.Float, this.lineDataSize * this.lineCount);
    this.buffer.create();

    this.update();

    this.onDraw = function (pipeline, context, delta) {
        this.drawWithTransform(context.camera.getTransform().invert(), context.camera.projM);
    };
};

TLines.prototype = Object.create(VG.Render.SceneNode.prototype);

TLines.source = {
    vertex: [
        "precision mediump float;",
        "attribute vec3 position;",
        "attribute vec3 next;",
        "attribute float side;",
        "uniform float thickness;",
        "uniform float aspect;",
        "uniform vec3 eye;",
        "uniform mat4 mvp;",
        //"varying vec3 v_color;",
        "void main(){",
        "   vec3 arrow = next-position;",
        //"   vec3 delta = side * thickness * normalize(cross(arrow,eye));",
        //"   gl_Position = mvp * vec4(position + delta * 0.01,1);",

        //"   vec3 delta = (mvp*vec4(cross(arrow,eye),0.0)).xyz;",
        //"   vec3 deltaMVP = side * thickness * normalize(delta);",
        //"   vec4 mvpPos = mvp * vec4(position,1.0);",
        //"   gl_Position = mvpPos + vec4(deltaMVP * 0.001 * mvpPos.w, 0.0);",

        "   vec4 arrowMVP = mvp * vec4(arrow, 0.0);",
        "   vec3 delta = normalize(vec3(arrowMVP.y, -arrowMVP.x * aspect * aspect, 0.0));",
        "   vec4 posMVP = mvp * vec4(position, 1.0);",
        "   posMVP /= posMVP.w;",
        "   float factor = side * thickness /length(vec2(delta.x * aspect, delta.y));",
        "   gl_Position = posMVP + vec4(delta * factor, 0.0);",

        //"   vec4 pos = mvp * vec4(position, 1.0);",
        //"   vec4 nextMVP = mvp * vec4(next, 1.0);",
        //"   vec4 arrowMVP = nextMVP-pos;",
        //"   vec3 delta = side * 0.1 * normalize(vec3(arrowMVP.y, -arrowMVP.x, 0.0));",
        //"   v_color = delta.xyz * 100.0;",
        //"   gl_Position = pos + vec4(side*0.1, side*0.1, 0.0, 0.0);",
        "}"
    ].join("\n"),
    fragment: [
        "precision mediump float;",
        "uniform vec3 color;",
        //"varying vec3 v_color;",
        "void main(){",
        "    gl_FragColor = vec4(color,1.0);",
        "}"
    ].join("\n")
};


TLines.prototype.update = function ()
{
    /**
     * Update GPU buffer from this.parts
     * Assume size of parts and size of each part does not change
     */
    var index = 0;
    for(var i = 0; i < this.parts.length; i++) {
        for(var j = 0; j < this.parts[i].length-1; j++) {
            var A = this.parts[i][j];
            var B = this.parts[i][j+1];
            this.buffer.setBuffer(index++, A.x);
            this.buffer.setBuffer(index++, A.y);
            this.buffer.setBuffer(index++, A.z);
            this.buffer.setBuffer(index++, 1);
            this.buffer.setBuffer(index++, B.x);
            this.buffer.setBuffer(index++, B.y);
            this.buffer.setBuffer(index++, B.z);
            this.buffer.setBuffer(index++, 0.5);

            this.buffer.setBuffer(index++, B.x);
            this.buffer.setBuffer(index++, B.y);
            this.buffer.setBuffer(index++, B.z);
            this.buffer.setBuffer(index++, 1);
            this.buffer.setBuffer(index++, A.x);
            this.buffer.setBuffer(index++, A.y);
            this.buffer.setBuffer(index++, A.z);
            this.buffer.setBuffer(index++, 0.5);

            this.buffer.setBuffer(index++, B.x);
            this.buffer.setBuffer(index++, B.y);
            this.buffer.setBuffer(index++, B.z);
            this.buffer.setBuffer(index++, 1);
            this.buffer.setBuffer(index++, A.x);
            this.buffer.setBuffer(index++, A.y);
            this.buffer.setBuffer(index++, A.z);
            this.buffer.setBuffer(index++, -0.5);


            this.buffer.setBuffer(index++, A.x);
            this.buffer.setBuffer(index++, A.y);
            this.buffer.setBuffer(index++, A.z);
            this.buffer.setBuffer(index++, 1);
            this.buffer.setBuffer(index++, B.x);
            this.buffer.setBuffer(index++, B.y);
            this.buffer.setBuffer(index++, B.z);
            this.buffer.setBuffer(index++, 0.5);

            this.buffer.setBuffer(index++, A.x);
            this.buffer.setBuffer(index++, A.y);
            this.buffer.setBuffer(index++, A.z);
            this.buffer.setBuffer(index++, 1);
            this.buffer.setBuffer(index++, B.x);
            this.buffer.setBuffer(index++, B.y);
            this.buffer.setBuffer(index++, B.z);
            this.buffer.setBuffer(index++, -0.5);

            this.buffer.setBuffer(index++, B.x);
            this.buffer.setBuffer(index++, B.y);
            this.buffer.setBuffer(index++, B.z);
            this.buffer.setBuffer(index++, 1);
            this.buffer.setBuffer(index++, A.x);
            this.buffer.setBuffer(index++, A.y);
            this.buffer.setBuffer(index++, A.z);
            this.buffer.setBuffer(index++, 0.5);

        }
    }
};

TLines.prototype.drawWithTransform = function(view, proj)
{
    /**
     * Draw triangle based front facing 3D line
     */
    this.shader.bind();
    var M = new VG.Math.Matrix4();
    if (proj !== undefined) {
        M.set(proj);
        M.mul(view);
    } else {
        M.set(view);
    }
    M.mul(this.getTransform());

    //var viewDirection = [0, 0, 0];
    //// assume camera of type EyeView
    //var viewVector = context.camera.center.clone();
    //viewVector.sub(context.camera.eye);
    //viewDirection[0] = viewVector.x;
    //viewDirection[1] = viewVector.y;
    //viewDirection[2] = viewVector.z;
    //viewDirection = [0, 0, 1, 0];
    this.shader.setMatrix('mvp', M.elements);
    //this.shader.setFloat('eye', viewDirection);
    this.shader.setColor3('color', this.options.color);
    this.shader.setFloat('thickness', this.options.thickness);
    this.shader.setFloat('aspect', this.options.aspect);

    var stride = this.buffer.getStride();

    this.buffer.update(0, this.lineCount * this.lineDataSize); // bind
    this.buffer.vertexAttrib(this.shader.getAttrib('position'), 3, false, stride * this.linesBufferSingleSize, 0);
    this.buffer.vertexAttrib(this.shader.getAttrib('next'), 3, false, stride * this.linesBufferSingleSize, stride * 4);
    this.buffer.vertexAttrib(this.shader.getAttrib('side'), 1, false, stride * this.linesBufferSingleSize, stride * 7);

    this.buffer.drawBuffer(VG.Renderer.Primitive.Triangles, 0, this.lineCount * 2 * 3);

	this.buffer.purgeAttribs();
};



Cone = function (parent, options)
{
    /**
     * Create cone with options.
     * See `def` for valid options
     * @constructor
     */
    VG.Render.Mesh.call(this, parent);
    var def = {
        position: new VG.Math.Vector3(0, 0, 0),
        up: new VG.Math.Vector3(0, 0, 1),
        radius: 0.2,
        segment: 8,
        color: new VG.Core.Color(255, 0, 0),
        length: 0.4
    };
    this.options = Util.initOptions(options, def);
    this.options.up.normalize();
    this.material = new ColorMaterial();
    var that = this;
    this.onDraw = function (pipeline, context, delta) {
        var material = that.material;

        //render the model
        material.bind();
        var shader = material.shader;

		var mvM = context.camera.getTransform().invert();
		mvM.multiply(that.mesh.getTransform());
        shader.setMatrix("mvM", mvM.elements);
        shader.setMatrix("projM", context.camera.projM.elements);
        shader.setColor3("u_color", that.options.color);
        
		//hardcoded to draw all elements at once
        VG.Renderer().drawMesh(that.mesh, -1, shader);
    };
};

Cone.prototype = Object.create(VG.Render.Mesh.prototype);

Cone.prototype.init = function ()
{

    this.mesh = new VG.Render.Mesh();
	// create geometry
	this.mesh.vertexCount = this.options.segment*6;
	this.mesh.addVertexBuffer(VG.Type.Float,
		[
			{ name: "position", offset: 0, stride: 4 },
			{ name: "normal", offset: 4, stride: 4 }
		]
	);
	this.mesh.layout = this.mesh.generateStaticLayout();

    var array = {
        position: new Array(this.options.segment * 4 * 3 * 2),
        normal: new Array(this.options.segment * 4 * 3 * 2)
    };
    var position = array.position;
    var normal = array.normal;
    // assume position = (0,0,0), up = (0,0,1)
    var index = 0;
    var step = Math.PI*2/this.options.segment;
    var q = new VG.Math.Quat(0, 0, -step/2);
    var zAxis = new VG.Math.Vector3(0, 0, 1);
    for(var i = 0; i < this.options.segment; i++) {
        var cA = Math.cos(step*i) * this.options.radius;
        var sA = Math.sin(step*i) * this.options.radius;
        var cB = Math.cos(step*(i+1)) * this.options.radius;
        var sB = Math.sin(step*(i+1)) * this.options.radius;
        position[index * 4    ] = cA;
        position[index * 4 + 1] = sA;
        position[index * 4 + 2] = 0;
        position[index * 4 + 3] = 1.0;
        normal[index * 4    ] = 0;
        normal[index * 4 + 1] = 0;
        normal[index * 4 + 2] = -1;
        normal[index * 4 + 3] = 0;
        index ++;
        position[index * 4    ] = cB;
        position[index * 4 + 1] = sB;
        position[index * 4 + 2] = 0;
        position[index * 4 + 3] = 1.0;
        normal[index * 4    ] = 0;
        normal[index * 4 + 1] = 0;
        normal[index * 4 + 2] = -1;
        normal[index * 4 + 3] = 0;
        index ++;
        position[index * 4    ] = 0;
        position[index * 4 + 1] = 0;
        position[index * 4 + 2] = 0;
        position[index * 4 + 3] = 1.0;
        normal[index * 4    ] = 0;
        normal[index * 4 + 1] = 0;
        normal[index * 4 + 2] = -1;
        normal[index * 4 + 3] = 0;
        index ++;

        var n = new VG.Math.Vector3(this.options.length, 0, this.options.radius);
        q.setAxis(step*i, zAxis);
        q.rotateVector(n);
        n.normalize();
        position[index * 4    ] = cA;
        position[index * 4 + 1] = sA;
        position[index * 4 + 2] = 0;
        position[index * 4 + 3] = 1.0;
        normal[index * 4    ] = n.x;
        normal[index * 4 + 1] = n.y;
        normal[index * 4 + 2] = n.z;
        normal[index * 4 + 3] = 0;
        index ++;
        q.setAxis(step, zAxis);
        q.rotateVector(n);
        n.normalize();
        position[index * 4    ] = cB;
        position[index * 4 + 1] = sB;
        position[index * 4 + 2] = 0;
        position[index * 4 + 3] = 1.0;
        normal[index * 4    ] = n.x;
        normal[index * 4 + 1] = n.y;
        normal[index * 4 + 2] = n.z;
        normal[index * 4 + 3] = 0;
        index ++;
        q.setAxis(-step/2, zAxis);
        q.rotateVector(n);
        position[index * 4    ] = 0;
        position[index * 4 + 1] = 0;
        position[index * 4 + 2] = this.options.length;
        position[index * 4 + 3] = 1.0;
        normal[index * 4    ] = n.x;
        normal[index * 4 + 1] = n.y;
        normal[index * 4 + 2] = n.z;
        normal[index * 4 + 3] = 0;
        index ++;
    }

    this.mesh.setTriangleArray(array);

    // transform position & up
    var m = new VG.Math.Matrix4();
    m.setTranslate(this.options.position.x, this.options.position.y, this.options.position.z);
    var epsilon = 1e-3;
    var zUnit = new VG.Math.Vector3(0, 0, 1);
    var axis = zUnit.cross(this.options.up);
    if (axis.length() < epsilon) {
        if (this.options.position.dot(this.options.up) < 0) {
            m.rotate(Math.PI, 0, 1, 0);
        } else {
            // already aligned
        }
    } else {
        var cosAngle = zUnit.dot(this.options.up)
            /this.options.up.length();
        m.rotate(180.0/Math.PI*Math.acos(cosAngle), axis.x, axis.y, axis.z);
    }
    this.mesh.applyTransform(m);
    this.mesh.update();
    return this;
};

Box = function (parent, options)
{
    /**
     * Make box
     */
    VG.Render.Mesh.call(this, parent);
    var def = {
        width: 1.0,
        height: 1.0,
        depth: 1.0
    };
    this.options = Util.initOptions(options, def);
    VG.Render.Mesh.makeBox.call(this, this.options.width, this.options.height, this.options.depth);
};

Box.prototype = Object.create(VG.Render.Mesh.prototype);


ColorMaterial = function()
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
        'uniform vec3 u_color;',
        'varying vec3 vN;',

        'void main() {',
        '   vec3 L = normalize(vec3(-0.5, 0.5, 0.5));',
        '   vec3 N = normalize(vN);',

        '   vec3 color = u_color + vec3(0.5, 0.5, 1.0) * clamp(dot(L, N), 0.0, 1.0);',

        '   gl_FragColor = vec4(color, 1.0);',
        '}'
    ].join("\n");

    this.shader = new VG.Shader(vSrc, fSrc);
    this.shader.depthTest = true;
    this.shader.depthWrite = true;

    this.shader.create();
}

ColorMaterial.prototype = Object.create(VG.Render.Material.prototype);