
VG.Render.Material = function()
{
    /** Material interface, derived classes must create a shader and 
     *  optionally override the bind method
     *  @constructor */

    /** The shader object 
     *  @member {VG.Shader} */
    this.shader = null;
}

VG.Render.Material.prototype.isValid = function()
{
    /** Checks if the material has a valid shader, otherwise returns false 
     *  @return {Bool} */
    return (this.shader);
}

VG.Render.Material.prototype.bind = function()
{
    /** Binds the shader, override for more complex binding */

    if (this.shader) this.shader.bind();
}

VG.Render.Material.prototype.dispose = function()
{
	if (this.shader)
	{
		this.shader.dispose();
		this.shader = null;
	}
}

VG.Render.Material.prototype.setModelViewMatrix = function(matrix, transpose)
{
    /** Sets a model-view matrix from a float array, the matrial(i.e. shader) must be binded before.
     *  @param {array} value - A float array (2x2, 3x3 or 4x4) : column major
     *  @param {bool} [false] transpose - If true transposes the matrix
     *  */
	if (this.shader)
		// the uniform {string} may be different according to material implementation.
		this.shader.setMatrix("mvM", matrix, transpose);
}

VG.Render.Material.prototype.setProjectionMatrix = function(matrix, transpose)
{
    /** Sets a projection matrix from a float array, the matrial(i.e. shader) must be binded before.
     *  @param {array} value - A float array (2x2, 3x3 or 4x4) : column major
     *  @param {bool} [false] transpose - If true transposes the matrix
     *  */
	if (this.shader)
		// the uniform {string} may be different according to material implementation.
		this.shader.setMatrix("projM", matrix, transpose);
}

VG.Render.Material.prototype.getAttrib = function(name)
{
    /** Queries the attribute location/index
     *  @param {string} name - The attribute name as set in the source
     *  @returns {number}
     *  */
	var attrib = -1;
	if (this.shader)
		attrib = this.shader.getAttrib(name);
	return attrib;
}

VG.Render.Material.prototype.applySubMaterial = function(subIndex)
{
    /** Applies sub material.
     *  @param {int} subIndex - The sub material(index) for facet
     *  */
}

VG.Render.Material.prototype.applyLights = function(lights)
{
    /** Applies global lights.
     *  @param {Array[VG.Render.Light]} lights
     *  */
}

// barebone material
VG.Render.SimpleMaterial = function()
{
    /** Barebone mostly used as fail-over */
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
        '}',
    ].join("\n");

    var fSrc = [
        '#version 100',
        'precision mediump float;',

        'varying vec3 vN;',

        'void main() {',
        '   vec3 L = normalize(vec3(-0.5, 0.5, 0.5));',
        '   vec3 N = normalize(vN);',

        '   vec3 color = vec3(0.2, 0.2, 0.3) + vec3(0.5, 0.5, 1.0) * clamp(dot(L, N), 0.0, 1.0);',

        '   gl_FragColor = vec4(color, 1.0);',
        '}'
    ].join("\n");

    this.shader = new VG.Shader(vSrc, fSrc);
    this.shader.depthTest = true;
    this.shader.depthWrite = true;

    this.shader.create();
}

VG.Render.SimpleMaterial.prototype = Object.create(VG.Render.Material.prototype);

// Normal Material for Phong Shading Model
VG.Render.NormalMaterial = function(defMat, subMats)
{
	/** Normal Material for Phong Shading Model
	* @constructor
	* @param {VG.Render.NormalMaterial.MaterialInfo} defMat - default material
	* @param {Array[VG.Render.NormalMaterial.MaterialInfo]} subMats - sub materials
	*/
	VG.Render.Material.call(this);
	// initialize
	this.onCreate();
	
	// default material info
	if (defMat && defMat instanceof VG.Render.NormalMaterial.MaterialInfo)
		this.defaultMaterial = defMat;
	else
		this.defaultMaterial = new VG.Render.NormalMaterial.MaterialInfo();
	// sub material infos
	if (subMats && subMats instanceof Array)
		this.subMaterials = subMats;
}

VG.Render.NormalMaterial.prototype = Object.create(VG.Render.Material.prototype);

VG.Render.NormalMaterial.prototype.onCreate = function()
{
    /** Identifies normal material in native layer.
     * @member {bool}
     */
    this.identifyNormalMaterial = true;

	/** default material to apply when any facet's sub-material is not set.
	* @member {VG.Render.NormalMaterial.MaterialInfo} defaultMaterial
	*/
	this.defaultMaterial = null;

	/** sub materials to apply for every facet.
	* @member {Array[VG.Render.NormalMaterial.MaterialInfo]}
	*/
	this.subMaterials = [];

	/** Maximum light count : constant
	* @member {int} MaxLightN - constant
	*/
	this.MaxLightN = 32;

	// Shader
    var vSrc = [
        '#version 100',

		// vertex attributes
        'attribute vec4 position;',
        'attribute vec3 normal;',

		// transform
        'uniform mat4 mvM;',
        'uniform mat4 projM;',
		
		// to fragment
        'varying vec3 vP;',
        'varying vec3 vN;',
		
		// function
        'void main() {',
        '	vN = (mvM * vec4(normal, 0.0)).xyz;',
        '	vec4 pos = mvM * position;',
        '	vP = pos.xyz;',
		'	gl_Position = projM * pos;',
        '}',
    ].join("\n");

    var fSrc = [
        '#version 100',
        'precision highp float;',

		// material
		'struct Material {',
		'	vec4 emissionColor;',
		'	vec4 ambientColor;',
		'	vec4 diffuseColor;',
		'	vec4 specularColor;',
		'	float specularShininess;',
		'};',
		'uniform Material material;',

		// lights
		'#define NLIGHT ' + this.MaxLightN,

		'struct Light {',
		'	vec4 ambientColor;',
		'	vec4 diffuseColor;',
		'	vec4 specularColor;',

		'	vec4 position;', // in ecs : (position of, or direction to) light

		'	vec3 spotDirection;', // in ecs		
		'	float spotExponent;',
		'	float spotCutOff;', // cos(cutOff)
		'	float attenuation0;',
		'	float attenuation1;',
		'	float attenuation2;',
		'};',
		'uniform Light light[NLIGHT];', // multiple lights
		'uniform int nLight;', // current light count (<= NLIGHT)
		'uniform bool localViewer;', // view direction GL_LIGHT_MODEL_LOCAL_VIEWER, i.e, (0, 0, 1)
		'uniform vec4 globalAmbient;', // global ambient light

		// from vertex shader
        'varying vec3 vP;',
        'varying vec3 vN;',

		// function
        'void main() {',
		// accumulated color of all contributions.
        '   vec4 sigma = material.emissionColor;', // start with the material emission.
		// global ambient
        '   sigma += globalAmbient * material.ambientColor;',
		// contributions from light sources
        '   for (int i = 0; i < NLIGHT; i++) {',
        '		if (nLight <= i)',
        '			break;',
        '		Light iLight = light[i];',

		'		float atten = 1.0;', // attenuation factor
        '		float spot = 1.0;', // spotlight effect

		'		if (iLight.position.w != 0.0) {', // only when point-light
        '			if (iLight.attenuation1 != 0.0 || iLight.attenuation2 != 0.0) {',
						// attenuation factor
        '				float d = distance(iLight.position.xyz, vP);',
        '				float _atten = iLight.attenuation0 + iLight.attenuation1 * d + iLight.attenuation2 * d * d;',
        '				if (_atten > 0.0)',
        '					atten = 1.0 / _atten;',
        '			}',
        
		'			if (iLight.spotCutOff > 0.0) {',
						// spotlight effect
        '				vec3 v = normalize(vP - iLight.position.xyz);',
        '				vec3 d = normalize(iLight.spotDirection);',
        '				float _spot = max(0.0, dot(v, d));',
        '				if (_spot < iLight.spotCutOff)',
							// outside of spot-cone.
        '					spot = 0.0;',
							// inside of spot-cone
        '				else if (iLight.spotExponent != 0.0)',
        '					spot = pow(_spot, iLight.spotExponent);',
        '				else',
        '					spot = _spot;',
        '			}',
        '		}',
				// ads = ambient + diffuse + specular
        '		vec4 ads = iLight.ambientColor * material.ambientColor;',
        '		vec3 nL = normalize(iLight.position.w==0.0 ? iLight.position.xyz : (iLight.position.xyz - vP));',
        '		vec3 nN = normalize(vN);',
        '		float fln = dot(nL, nN);',
        '		if (0.0 < fln) {',
					// diffuse
        '			ads += (fln * iLight.diffuseColor * material.diffuseColor);',
					// specular
        '			vec3 nR = 2.0*fln*nN - nL;', // reflection of incident light
        '			vec3 nV = localViewer ? vec3(0.0, 0.0, 1.0) : normalize(-vP);', // view direction
        '			float spec = dot(nR, nV);',
		'			if (0.0 < spec) {',
        '				if (material.specularShininess != 0.0)',
        '					spec = pow(spec, material.specularShininess);',
        '				ads += (spec * iLight.specularColor * material.specularColor);',
		'			}',
		'		}',
				// all contribution
		'		sigma += atten * spot * ads;',
		'   }',
        '   gl_FragColor = vec4(sigma.rgb, material.ambientColor.a);',
        '}'
    ].join("\n");

    this.shader = new VG.Shader(vSrc, fSrc);
    this.shader.depthTest = true;
    this.shader.depthWrite = true;

    this.shader.create();
}

VG.Render.NormalMaterial.prototype.applySubMaterial = function(subIndex)
{
    /** Applies sub material.
     *  @param {int} subIndex - The sub material(index) for facet, if subIndex < 0, then defaultMaterial.
     *  */
	var material = this.subMaterials[subIndex];
	if (!material)
		material = this.defaultMaterial;
	var shader = this.shader;
	shader.setColor("material.emissionColor", material.emissionColor);
	shader.setColor("material.ambientColor", material.ambientColor);
	shader.setColor("material.diffuseColor", material.diffuseColor);
	shader.setColor("material.specularColor", material.specularColor);
	shader.setFloat("material.specularShininess", material.specularShininess);
}

VG.Render.NormalMaterial.prototype.applyLights = function(lights, viewM)
{
    /** Applies global lights.
     *  @param {Array[VG.Render.Light]} lights
	 *  @param {VG.Math.Matrix4} viewM - view matrix
     *  */
	var shader = this.shader;
	var applyN = 0;

	if (lights.length < 1) {
		shader.setInt('nLight', applyN);
		return;
	}

	var mvM = new VG.Math.Matrix4();
	var lightPosition = [0, 0, 0, 0];
	var spotDirection = [0, 0, 0];

	for (var i = 0; i < lights.length; i++)
	{
		var light = lights[i];
		if (light.identifyAmbientLight)
		{
			shader.setColor('globalAmbient', light.color);
		}
		else if (light.identifyNormalLight && applyN < this.MaxLightN)
		{
			var iLight = 'light' + '[' + applyN + '].';

			shader.setColor(iLight + 'ambientColor', light.ambientColor);
			shader.setColor(iLight + 'diffuseColor', light.diffuseColor);
			shader.setColor(iLight + 'specularColor', light.specularColor);

			mvM.set(viewM);
			mvM.multiply(light.getTransform());

			light.lightPosition.getArray(lightPosition);
			mvM.transformVectorArray(lightPosition);
			shader.setFloat(iLight + 'position', lightPosition);

			light.spotDirection.getArray(spotDirection);
			mvM.transformVectorArray(spotDirection, true);
			shader.setFloat(iLight + 'spotDirection', spotDirection);

			shader.setFloat(iLight + 'spotExponent', light.spotExponent);
			shader.setFloat(iLight + 'spotCutOff', light.spotCutOff);
			shader.setFloat(iLight + 'attenuation0', light.attenuation0);
			shader.setFloat(iLight + 'attenuation1', light.attenuation1);
			shader.setFloat(iLight + 'attenuation2', light.attenuation2);

			applyN++;
		}
	}
	
	shader.setInt('nLight', applyN);
}

VG.Render.NormalMaterial.prototype.makeLampMaterial = function(lampColor)
{
    /** make the material as lamp.
     *  @param {VG.Core.Color} lampColor - The lamp color
     *  */
	var material = this.defaultMaterial;

	material.emissionColor.set(lampColor);
	material.ambientColor.set(lampColor);
	material.diffuseColor.setValue(0, 0, 0, 1);
	material.specularColor.setValue(0, 0, 0, 1);
	material.specularShininess = 0;

	this.subMaterials = [];
}

VG.Render.NormalMaterial.MaterialInfo = function(parm)
{
	/** Material Parameters for Normal Material
	* @constructor
	* param {Object} parm : {default:[r,g,b,a], diffuse:[r,g,b,a], specular:[r,g,b,a], factor:shininess, ambient:[r,g,b,a], emission:[r,g,b,a]} <br />
	* default is ambient and specular.
	* color-array is size-dynamic.
	*/
	this.onCreate();
	if (!parm)
		return;

	if (parm.default)
	{
		this.diffuseColor.setValueArray(parm.default);
		this.specularColor.setValueArray(parm.default);
	}

	if (parm.factor !== undefined)
		this.specularShininess = parm.factor;

	if (parm.diffuse)
		this.diffuseColor.setValueArray(parm.diffuse);
	if (parm.specular)
		this.specularColor.setValueArray(parm.specular);
	if (parm.ambient)
		this.ambientColor.setValueArray(parm.ambient);
	if (parm.emission)
		this.emissionColor.setValueArray(parm.emission);
}

VG.Render.NormalMaterial.MaterialInfo.prototype.onCreate = function()
{
	/** Emission Color
	* @member {VG.Core.Color}
	*/
	this.emissionColor = VG.Core.NormalizedColor(0.0, 0.0, 0.0);

	/** Ambient Color
	* @member {VG.Core.Color}
	*/
	this.ambientColor = VG.Core.NormalizedColor(0.2, 0.2, 0.2);

	/** Diffuse Color
	* @member {VG.Core.Color}
	*/
	this.diffuseColor = VG.Core.NormalizedColor(0.8, 0.8, 0.8);

	/** Specular Color
	* @member {VG.Core.Color}
	*/
	this.specularColor = VG.Core.NormalizedColor(0.0, 0.0, 0.0);

	/** Specular Shininess
	* @member {Number}
	*/
	this.specularShininess = 0.0;
}