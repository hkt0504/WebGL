// ----------------------------------------------------------------- Generate the Mesh

generateMesh2=function( shape, node )
{
    node.dispose();

    var mesh = { v: [], vn: [], f: [], vt: [] };

    var depth=shape.getDepth();

    //VG.log( "generateMesh" );

    //mesh.v.push({x: parts[1], y: parts[2], z: parts[3], w: '1.0'});

/*
    mesh.v.push({x: -1, y: -1, z: 1, w: '1.0'});
    mesh.v.push({x: 1, y: -1, z: 1, w: '1.0'});
    mesh.v.push({x: 1, y: 1, z: 1, w: '1.0'});
    mesh.v.push({x: -1, y: 1, z: 1, w: '1.0'});

    var poly = [];
    poly.push( { v : 1 }, { v : 2 }, { v : 3 }, { v : 4 } );
    mesh.f.push( poly );

    node._trianglesFromIndexedFaces( mesh, 5.0 );

*/
    var pVOut=1;

/*
    for ( var si=0; si < shape.segments.length; ++si )
    {
        var segment=shape.segments[si];
        var segmentBackZ=segment.size;

        VG.log( backZ, (backZ+segmentBackZ), 0.5-1, backZ );

        for ( var pi=0; pi < segment.points.length - 1; ++pi )
        {
            var p=segment.points[pi];
            var np=segment.points[pi+1];

            mesh.v.push({ x: p.x, y: p.y, z: backZ+segmentBackZ, w: '1.0'});
            mesh.v.push({ x: p.x, y: p.y, z: backZ, w: '1.0'});
            mesh.v.push({x: np.x, y: np.y, z: backZ, w: '1.0'});
            mesh.v.push({x: np.x, y: np.y, z: backZ+segmentBackZ, w: '1.0'});

            var poly = [];
            poly.push( { v : pVOut++ }, { v : pVOut++ }, { v : pVOut++ }, { v : pVOut++ } );
            mesh.f.push( poly );
        }

        backZ+=segment.size + segment.transSize;
    }
*/

    for ( var pi=0; pi < shape.dc.seamsPerSegment - 1; ++pi )
    {
        var backZ=-depth/2;

        for ( var si=0; si < shape.dc.segments.length; ++si )
        {
            var segment=shape.dc.segments[si];
            var segmentBackZ=segment.size - segment.transSize;

            //VG.log( backZ, (backZ+segmentBackZ), 0.5-1, backZ );

            var p=segment.seams[pi];
            var np=segment.seams[pi+1];

            mesh.v.push({ x: p.x, y: p.y, z: backZ+segmentBackZ, w: '1.0'});
            mesh.v.push({ x: p.x, y: p.y, z: backZ, w: '1.0'});
            mesh.v.push({x: np.x, y: np.y, z: backZ, w: '1.0'});
            mesh.v.push({x: np.x, y: np.y, z: backZ+segmentBackZ, w: '1.0'});

            var poly = [];
            poly.push( { v : pVOut++ }, { v : pVOut++ }, { v : pVOut++ }, { v : pVOut++ } );
            mesh.f.push( poly );

            if ( si < shape.dc.segments.length - 1 )
                pVOut=generatePolyConnection( mesh, segment, shape.dc.segments[si+1], pi, backZ+segmentBackZ, pVOut )

//            if ( lastPoly ) {
//                var conPoly=[];

/*
                function getVertexFromIndex( faceIndex )
                {
                    var v=mesh.v[faceIndex-1];
                    return v;
                }

                var y1=getVertexFromIndex( poly[1].v ).y, y2=getVertexFromIndex( poly[2].v ).y;
                VG.log( y1, y2, y1-y2 );
*/

                //conPoly.push( { v : poly[1].v }, { v : lastPoly[0].v }, { v : lastPoly[3].v }, { v : poly[2].v } );
                //mesh.f.push( conPoly );
            //}

            backZ+=segment.size;// + segment.transSize;
        }
    }

    node._trianglesFromIndexedFaces( mesh, 1.0 );
}; 

generatePolyConnection=function( mesh, rS, lS, seamIndex, rZ, pVOut )
{
    //VG.log( "generatePolyConnection", rS.transSize );

    var rp=rS.transSeams[ seamIndex ];
    var rnp=rS.transSeams[ seamIndex + 1 ];

    var lp=lS.transSeams[ seamIndex ];
    var lnp=lS.transSeams[ seamIndex + 1 ];    

    mesh.v.push({ x: lp.x, y: lp.y, z: rZ + rS.transSize, w: '1.0'});
    mesh.v.push({ x: rp.x, y: rp.y, z: rZ, w: '1.0'});
    mesh.v.push({x: rnp.x, y: rnp.y, z: rZ, w: '1.0'});
    mesh.v.push({x: lnp.x, y: lnp.y, z: rZ + rS.transSize, w: '1.0'});

    var poly = [];
    poly.push( { v : pVOut++ }, { v : pVOut++ }, { v : pVOut++ }, { v : pVOut++ } );
    mesh.f.push( poly );

    return pVOut;
}















generateMesh=function( shapeBuilder, node )
{
    node.dispose();

    var mesh = { v: [], vn: [], f: [], vt: [] };
    var vertexOut=0;

    function pushVertex( x, y, z ) {

        mesh.v.push( { x: x, y: y, z: z, w: '1.0' } );
        vertexOut++;

        return vertexOut;
    }

    function pushQuad( v1, v2, v3, v4 ) {
        var poly = [];
        poly.push( { v : v1 }, { v : v2 }, { v : v3 }, { v : v4 } );
        mesh.f.push( poly );   
    }

    function pushTriangle( v1, v2, v3 ) {
        var poly = [];
        poly.push( { v : v1 }, { v : v2 }, { v : v3 } );
        mesh.f.push( poly );   
    }

    shapeBuilder.calcFacesForSide( pushVertex, pushQuad, pushTriangle );
    shapeBuilder.calcFacesForSide( pushVertex, pushQuad, pushTriangle, true );
    node._trianglesFromIndexedFaces( mesh, 1.0 );

    return mesh.f.length;
};