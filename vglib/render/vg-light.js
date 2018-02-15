// Light Scene Node
VG.Render.Light = function(parent)
{
    /** Light as an scene node 
     *  @constructor
     *  @param {VG.SceneNode} parent - The parent, can be null
	 */
	VG.Render.SceneNode.call(this, parent);
}

VG.Render.Light.prototype = Object.create(VG.Render.SceneNode.prototype);

VG.Render.AmbientLight = function(ambientColor)
{
	/** identifier to use instead of instanceof
	* @member {bool} AmbientLight
	*/
	this.identifyAmbientLight = true;

	/** Sets global ambient light color.
	* param {Array} ambientColor : [r, g, b, a]
	*/
	this.color = VG.Core.NormalizedColor(0.2, 0.2, 0.2, 1);
	if (ambientColor)
		this.color.setValueArray(ambientColor);
}

// Light Scene Node for Phong Shading Model
VG.Render.NormalLight = function(parent)
{
	/** Normal light scene node for Phong Shading Model
     *  @constructor
     *  @param {VG.SceneNode} parent - The parent, can be null
	 */
	VG.Render.Light.call(this, parent);

	/** identifier to use instead of instanceof
	* @member {bool} normalLight
	*/
	this.identifyNormalLight = true;

	// light parameters
	/** Ambient Intensity
	* @member {VG.Core.Color}
	*/
	this.ambientColor = VG.Core.NormalizedColor(0.0, 0.0, 0.0);

	/** Diffuse Intensity
	* @member {VG.Core.Color}
	*/
	this.diffuseColor = VG.Core.NormalizedColor(1.0, 1.0, 1.0);

	/** Specular Intensity
	* @member {VG.Core.Color}
	*/
	this.specularColor = VG.Core.NormalizedColor(1.0, 1.0, 1.0);

	/** Postion(w=1) or Direction(w=0) of light(x,y,z,w)
	* @member {VG.Math.Vector4} - default is the direction to local viewer.
	*/
	this.lightPosition = new VG.Math.Vector4(0.0, 0.0, 1.0, 0.0);

	/** Spot Direction
	* @member {VG.Math.Vector3}
	*/
	this.spotDirection = new VG.Math.Vector3();

	/** Spot Exponent
	* @member {Number}
	*/
	this.spotExponent = 0.0;

	/** Spot CutOff : cos(angle)
	* @member {Number}
	*/
	this.setSpotCutOffDegree(180);

	/** Constant Attenuation
	* @member {Number}
	*/
	this.attenuation0 = 1.0;

	/** Linear Attenuation
	* @member {Number}
	*/
	this.attenuation1 = 0.0;

	/** Quadratic Attenuation
	* @member {Number}
	*/
	this.attenuation2 = 0.0;
}

VG.Render.NormalLight.prototype = Object.create(VG.Render.Light.prototype);

VG.Render.NormalLight.prototype.setLightColor = function(parm)
{
	/** Sets light's colors.
	* param {Object} parm : {default:[r,g,b,a], diffuse:[r,g,b,a], specular:[r,g,b,a], ambient:[r,g,b,a]} <br />
	* default is to set all colors.
	* color-array is size-dynamic.	* @return {VG.Core.Color}
	*/
	if (parm.default)
	{
		this.diffuseColor.setValueArray(parm.default);
		this.specularColor.setValueArray(parm.default);
		this.ambientColor.setValueArray(parm.default);
	}

	if (parm.diffuse)
		this.diffuseColor.setValueArray(parm.diffuse);
	if (parm.specular)
		this.specularColor.setValueArray(parm.specular);
	if (parm.ambient)
		this.ambientColor.setValueArray(parm.ambient);
}

VG.Render.NormalLight.prototype.getLightColor = function()
{
	/** Gets light's color as representative.
	* @return {VG.Core.Color}
	*/
	return this.diffuseColor;
}

VG.Render.NormalLight.prototype.setSpotCutOffDegree = function(degree)
{
	/** Sets light's spot cut off from degree.
	*/
	this.spotCutOff = Math.cos(VG.Math.rad(degree));
}