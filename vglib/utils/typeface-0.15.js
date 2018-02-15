
_typeface_js = {

	faces: {},

	loadFace: function(typefaceData) {

		//var familyName = typefaceData.familyName.toLowerCase();
		var familyName = typefaceData.original_font_information.full_font_name;//familyName.toLowerCase();
		
		if (!this.faces[familyName]) {
			this.faces[familyName] = {};
		}
		if (!this.faces[familyName][typefaceData.cssFontWeight]) {
			this.faces[familyName][typefaceData.cssFontWeight] = {};
		}

		var face = this.faces[familyName][typefaceData.cssFontWeight][typefaceData.cssFontStyle] = typefaceData;

		face.loaded = true;
	},
};
