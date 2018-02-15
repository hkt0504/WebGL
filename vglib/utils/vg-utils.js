
VG.Utils.loadAppImage=function( imageName ) 
{
    VG.sendBackendRequest( "/images/" + VG.AppSettings.name + "/" + imageName, {}, function( response ) {

        var data=JSON.parse( response );

        var image=new VG.Core.Image();
        image.name=data.name;

        VG.decompressImageData( data.content, image );
        VG.Core.imagePool.addImage( image );    
        VG.update();

    }.bind( this ), "GET" );    
}

VG.Utils.parseOBJ=function(text, mtlText)
{
    /**
     * Parse Wavefront .obj according to:
     *      http://en.wikipedia.org/wiki/Wavefront_.obj_file
     *      http://www.martinreddy.net/gfx/3d/OBJ.spec
     *      http://www.fileformat.info/format/wavefrontobj/egff.htm
     * About .obj file:
     *      Vertex data:
     *          v,
     *          vt,
     *          vn,
     *          vp [ignored]
     *      Free-form curve/surface attributes:
     *          deg, bmat, step, cstyle [ignored]
     *      Elements:
     *          p, [ignored]
     *          l, [ignored]
     *          f, polygon includes: tri, quads, 5+ sides poly
     *          curv [ignored]
     *          curv2 [ignored]
     *          surf [ignored]
     *      Free-form curve/surface body elements:
     *          parm, trim, hole, scrv, sp, end [ignored]
     *      Connectivity between free-form surface:
     *          con [ignored]
     *      Grouping:
     *          g [todo]
     *          s [ignored]
     *          mg [todo]
     *          o [todo]
     *      Display/render attributes:
     *          bevel, c_interp, d_interp, lod, usemtl, [ignored]
     *          mtlib, shadow_obj, trace_obj, ctech, stech [ignored]
     *
     * @param text input .obj file as string
     * @returns {{v: Array, vn: Array, f: Array, vt: Array}}
     *      where each element of 'f' is a polygon definition contains 3+ elements.
     */
    var mesh = { v: [], vn: [], f: [], vt: [] };

    var lines = text.split("\n").map(function(o){
        return o.trim();
    }).filter(function(o){
        return o !== '' && o[0] !== '#'; // remove empty line & comment
    });

    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].trim().split(" ").filter(function (o) {
            return o.trim() !== ''; // collapse multi-spaces
        });
        var command = parts[0];

        if (command === 'v') {
            /**
             * List of geometric vertices, with (x,y,z[,w]) coordinates, w is optional and defaults to 1.0.
             * v 0.123 0.234 0.345 1.0
             */
            if (parts.length < 4) {
                throw "invalid vertex position.";
            } else if (parts.length === 4) {
                mesh.v.push({x: parts[1], y: parts[2], z: parts[3], w: '1.0'});
            } else {
                mesh.v.push({x: parts[1], y: parts[2], z: parts[3], w: parts[4]})
            }
        } else if (command === 'vt') {
            /**
             * List of texture coordinates, in (u, v [,w]) coordinates, these will vary between 0 and 1, w is optional and defaults to 0.
             * vt 0.500 1 0
             */
            if (parts.length < 3) {
                throw "invalid vertex uv.";
            } else if (parts.length === 3) {
                mesh.vt.push({u: parts[1], v: parts[2], w: '0'});
            } else {
                mesh.vt.push({u: parts[1], v: parts[2], w: parts[3]});
            }
        } else if (command === 'vn') {
            /**
             * # List of vertex normals in (x,y,z) form; normals might not be unit vectors.
             * vn 0.707 0.000 0.707
             */
            if (parts.length < 4) {
                throw "invalid vertex normal.";
            } else {
                mesh.vn.push({x: parts[1], y: parts[2], z: parts[3]});
            }
        } else if (command === 'vp') {
            // ignore
        } else if (command === 'f') {
            /**
             * # Polygonal face element in form:
             * f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 ....
             * f 1 2 3
             * f 3/1 4/2 5/3
             * f 6/4/1 3/5/3 7/6/5
             */
            var poly = [];
            for (var j = 1; j <parts.length; j++ ) {
                var attrs = parts[j].split('/');
                var v = {};
                v.v = attrs[0];
                if (attrs.length > 1 && attrs[1].length>0) {
                    v.vt = attrs[1];
                }
                if (attrs.length > 2 && attrs[2].length>0) {
                    v.vn = attrs[2];
                }
                poly.push(v);
            }
            if (poly.length < 3) {
                throw "expected face to have 3 or more vertices, got " + poly.length;
            }
            mesh.f.push(poly);
        }
    }
//    var lines = text.split("\n");
//    for (var i = 0; i< lines.length; i++)
//    {
//        var line = lines[i].trim().split(" ").filter(function(o){
//            return o.trim() !== '';
//        });
//        var ln = line.length;
//
//        if (ln == 0) continue;
//
//        var id = line[0];
//
//        switch (id)
//        {
//            case "v":
//
//                if (ln < 4) throw "invalid vertex position";
//
//                mesh.v.push({x: line[1], y: line[2], z: line[3]});
//
//                break;
//            case "vn":
//
//                if (ln < 4) throw "invalid normal";
//
//                mesh.vn.push({x: line[1], y: line[2], z: line[3]});
//
//                break;
//            case "vt":
//
//                if (ln < 3) throw "invalid uv";
//
//                mesh.vt.push({u: line[1], v: line[2]});
//
//                break;
//            case "f":
//
//                if (ln != 4) throw "only triangles supported";
//
//                var i0 = line[1].split("/");
//                var i1 = line[2].split("/");
//                var i2 = line[3].split("/");
//
//                mesh.f.push([
//                    {v: i0[0], vt: i0[1], vn: i0[2]},
//                    {v: i1[0], vt: i1[1], vn: i1[2]},
//                    {v: i2[0], vt: i2[1], vn: i2[2]}
//                ]);
//
//                break;
//        }
//    }
//
    return mesh;
};

VG.Utils.parseSTL=function(text)
{
    /**
     * Parse ASCII STL file according to: http://en.wikipedia.org/wiki/STL_%28file_format%29
     * @param text ASCII STL file in string form
     * @returns {{v: Array, vn: Array, f: Array, vt: Array}}
     */
    var mesh = { v: [], vn: [], f: [], vt: [] };

    var lines = text.split("\n").map(function(o){
        return o.trim();
    }).filter(function(o){
        return o !== '';
    });

    var expect = function(mark, got) {
        if (got !== mark) {
            throw "expect: " + mark + ", got: " + got;
        }
        return true;
    };

    /**
     * check if the array got the expected length
     * @param len
     * @param got Array got
     */
    var expectLength = function(len, got) {
        if (len !== got.length) {
            throw "expect length: " + len + ", got: " + got + " of length: " + got.length;
        }
        return true;
    };

    var expecting = '', index = 0, facet, vId = 0;
    /**
     * solid name
     * ...
     * endsolid name
     */
    expect('solid', lines[0].split(' ')[0]);
    expecting = 'facet';
    index = 1;
    while(index < lines.length)
    {
        var line = lines[index], parts;
        /**
         * facet normal ni nj nk
         * outer loop
         * vertex v1x v1y v1z
         * vertex v2x v2y v2z
         * vertex v3x v3y v3z
         * endloop
         * endfacet
         */
        /**
         * Note:
         * each vertex will be a new vertex.
         * Possible improvement: todo
         * Merge neighbooring vertices, but possible to have different normal.
         */
        parts = line.trim().split(" ").filter(function (o) {
            return o.trim() !== '';
        });
        if (expecting === 'facet') {
            if (parts[0] === 'endsolid') { // end condition
                expecting = 'done';
                break;
            } else if (parts.length !== 5) {
                throw 'invalid normal';
            }
            expect('facet', parts[0]);
            expect('normal', parts[1]);
            mesh.vn.push({x: parts[2], y: parts[3], z: parts[4]});
            expecting = 'loop'
        } else if (expecting === 'loop') {
            expectLength(2, parts);
            expect('outer', parts[0]);
            expect('loop', parts[1]);
            expecting = 'vertices';
            vId = 0;
        } else if (expecting === 'vertices') {
            if (parts.length !== 4) {
                throw 'invalid vertices';
            }
            expect('vertex', parts[0]);
            mesh.v.push({x: parts[1], y: parts[2], z: parts[3]});
            if (vId === 0) {
                facet = [{v: mesh.v.length, vn: mesh.vn.length}];
            } else {
                facet.push({v: mesh.v.length, vn: mesh.vn.length});
            }
            vId += 1;
            if (vId === 3) {
                mesh.f.push(facet);
                expecting = 'endloop';
            }
        } else if (expecting === 'endloop') {
            expect('endloop',parts[0]);
            expecting = 'endfacet';
        } else if (expecting === 'endfacet') {
            expect('endfacet',parts[0]);
            expecting = 'facet';
        } else {
            throw 'This should never happen.'
        }
        index ++;
    }
    if (index === lines.length) {
        if (expecting === 'done') {
            // good ending
        } else {
            // possible file corrupt, file end before 'endsolid' found
            VG.log('warning: STL parser: possible file corrupt.');
        }
    } else {
        // 'endsolid' found before end of file, should not be a problem.
        VG.log('warning: STL parser: "endsolid" found before end of file.')
    }
    return mesh;
};


VG.Utils.bytesToSize = function(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Byte';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

VG.Utils.numberWithCommas = function(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

VG.Utils.getImageByName=function( name )
{
    for( var i=0; i < VG.context.imagePool.images.length; ++i ) {
        if ( VG.context.imagePool.images[i].name == name )
            return VG.context.imagePool.images[i];
    }

    name=VG.context.style.iconPrefix + name;
    for( var i=0; i < VG.context.imagePool.images.length; ++i ) {
        if ( VG.context.imagePool.images[i].name == name )
            return VG.context.imagePool.images[i];
    }

    return null;
};

VG.Utils.getTextByName=function( name, split )
{
    if ( VG.App.texts[name] )
    {
        var text=VG.Utils.decompressFromBase64( VG.App.texts[name] );
        if ( !split ) return text;
        else return text.split( ":::" );
    }

    return null;
};

VG.Utils.addDefaultFileMenu=function( menubar )
{
    var fileMenu=menubar.addMenu( "File" );
    VG.context.workspace.addMenuItemRole( fileMenu, VG.UI.ActionItemRole.New );
    fileMenu.addSeparator();
    VG.context.workspace.addMenuItemRole( fileMenu, VG.UI.ActionItemRole.Open );

    if ( VG.getHostProperty( VG.HostProperty.Platform ) === VG.HostProperty.PlatformWeb )
    {
        VG.context.workspace.addMenuItemRole( fileMenu, VG.UI.ActionItemRole.Open_Local );
    }

    fileMenu.addSeparator();
    VG.context.workspace.addMenuItemRole( fileMenu, VG.UI.ActionItemRole.Save );
    VG.context.workspace.addMenuItemRole( fileMenu, VG.UI.ActionItemRole.SaveAs );

    return fileMenu;
};

VG.Utils.addDefaultEditMenu=function( menubar )
{
    var editMenu=menubar.addMenu( "Edit" );
    VG.context.workspace.addMenuItemRole( editMenu, VG.UI.ActionItemRole.Undo );
    VG.context.workspace.addMenuItemRole( editMenu, VG.UI.ActionItemRole.Redo );
    editMenu.addSeparator();
    VG.context.workspace.addMenuItemRole( editMenu, VG.UI.ActionItemRole.Cut );
    VG.context.workspace.addMenuItemRole( editMenu, VG.UI.ActionItemRole.Copy );
    VG.context.workspace.addMenuItemRole( editMenu, VG.UI.ActionItemRole.Paste );
    VG.context.workspace.addMenuItemRole( editMenu, VG.UI.ActionItemRole.Delete );
    editMenu.addSeparator();
    VG.context.workspace.addMenuItemRole( editMenu, VG.UI.ActionItemRole.SelectAll );

    return editMenu;
};

VG.Utils.addDefaultDownloadMenu=function( menubar )
{
    var downloadMenu=menubar.addMenu( "Download" );

    var menuItem=new VG.UI.MenuItem( "Mac OS X Desktop Version", null, function() {
        VG.log( "https://visualgraphics.tv/app/download/" + VG.context.workspace.appId + "/mac" );
        VG.gotoWebLink( "https://visualgraphics.tv/app/download/" + VG.context.workspace.appId + "/mac" );
    }.bind( this ) );
    menuItem.statusTip="Download the native Mac OS X Version of this Application.";


    downloadMenu.addMenuItem( menuItem );
    menuItem=new VG.UI.MenuItem( "Windows: Coming Soon", null, null ); menuItem.disabled=true;
    downloadMenu.addMenuItem( menuItem );
    menuItem=new VG.UI.MenuItem( "Linux : Coming Soon", null, null ); menuItem.disabled=true;
    downloadMenu.addMenuItem( menuItem );

    return downloadMenu;
};

VG.Utils.addDefaultViewMenu=function( menubar )
{
    var viewMenu=menubar.addMenu( "View" );

    for( var i=0; i < VG.Styles.pool.length; ++i ) 
    {
        var style=VG.Styles.pool[i];

        for( var s=0; s < style.skins.length; ++s ) 
        {
            var skin=style.skins[s];

            var menuItem=new VG.UI.MenuItem( style.name + " - " + skin.name, null, function() {

                VG.context.workspace.switchToStyle( this.style, this.skin );
            } );
            menuItem.statusTip="Activates this User Interface Style / Skin.";

            menuItem.style=style;
            menuItem.skin=skin;

            if ( style === VG.context.style && skin === VG.context.style.skin )
                menuItem.checked=menuItem.checkable=true;

            for ( var ex=0; ex < viewMenu.items.length; ++ex )
                menuItem.addExclusions( viewMenu.items[ex] );

            viewMenu.addMenuItem( menuItem );
        }
    }

    return viewMenu;
};

VG.Utils.dumpObject=function( object )
{
    VG.log( JSON.stringify( object, null, 4) );
};

VG.Utils.scheduleRedrawInMs=function( ms )
{
    VG.context.workspace.redrawList.push( Date.now() + ms );
};

VG.Utils.ensureRedrawWithinMs=function( ms )
{
    var redrawList=VG.context.workspace.redrawList;
    var time=Date.now();

    for( var i=0; i < redrawList.length; ++i ) 
    {            
        if ( ( redrawList[i] + 1000.0/60.0 ) >= time && redrawList[i] < ( time + ms ) )
            return;
    }
    redrawList.push( time + ms - 1000.0/60.0 );    
};

VG.Utils.splitPath=function(path) {
  var dirPart, filePart;
  path.replace(/^(.*\/)?([^/]*)$/, function(_, dir, file) {
    dirPart = dir; filePart = file;
  });
  return { path: dirPart, fileName: filePart };
}

VG.Utils.fileNameFromPath=function( path )
{
    return path.replace(/^.*(\\|\/|\:)/, '' );
};

VG.Utils.createMaterial=function()
{
    var graph=VG.Nodes.Graph();
    var materialNode=graph.createNode( "NodeMaterial" );
    return materialNode.getTerminal( "out" );
}

VG.Utils.addSingleShotCallback=function( func )
{
    VG.context.workspace.singleShotCallbacks.push( func );
};

VG.Utils.textureToImage=function( texture, image )
{
    var renderTarget=new VG.RenderTarget();

	var frameW = texture.getRealWidth();
	var frameH = texture.getRealHeight();
    
	renderTarget.resetSize(frameW, frameH);
	renderTarget.setViewportEx(0, 0, frameW, frameH);
    renderTarget.imageWidth=texture.getWidth();
    renderTarget.imageHeight=texture.getHeight();

    renderTarget.bind();
    renderTarget.clear();
    
    VG.Renderer().drawQuad(texture, frameW, frameH, 0, 0, 1.0, VG.Core.Size(frameW, frameH));

	// read to image.
	renderTarget.readPixelBuffer();
	var width = renderTarget.getWidth();
	var height = renderTarget.getHeight();

	if (!image)
		image = VG.Core.Image(width, height);

	var ip = 0;
	for (var y = height-1; y >= 0; y--)
	{
        for (var x = 0; x < width; x++)
		{
            image.setPixelRGBA(x, y,
				renderTarget.getPixelRawByte(ip++), // r
				renderTarget.getPixelRawByte(ip++), // g
				renderTarget.getPixelRawByte(ip++), // b
				renderTarget.getPixelRawByte(ip++) // a
				);
		}
	}
	//
    renderTarget.unbind();
	
	renderTarget.dispose();

    return image;
};