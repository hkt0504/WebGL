// ----------------------------------------------------------------- ShapeBuilder

ShapeBuilder=function( dc )
{
    this.dc=dc;
};

ShapeBuilder.prototype.getBBox=function()
{
    var box={ x : 0, y : 0, z : 0 };

    for ( var i=0; i < this.dc.segments.length; ++i )
    {
        var segment=this.dc.segments[i];
        box.z+=segment.size;
        //if ( i < this.dc.segments.length - 1 ) depth+=this.dc.segments[i].transSize;
        if ( segment.statistics.maxValues.x > box.x ) box.x=segment.statistics.maxValues.x;
    }
    return box;
};

ShapeBuilder.prototype.calcFacesForSide=function( pushVertex, pushQuad, pushTriangle, mirror )
{
    var bBox=this.getBBox();
    var backZ=-bBox.z/2;

    var step=0.1;

    for ( var si=0; si < this.dc.segments.length; ++si )
    {
        var segment=this.dc.segments[si];
        var segmentBackZ=segment.size - segment.transSize;

        // --- Close the back if the first segment from the back
        
        //if ( si === 0 )
            //this.closeSegment( segment, segment.hullSeams, false, backZ, pushVertex, pushQuad );

        // --- Segment Itself

        // --- Hull

        if ( !segment.round )
        {
            var offset=0; var finished=false;
            while ( !finished )
            {
                var nextOffset=offset + step;
                if ( nextOffset >= segmentBackZ ) {
                    finished=true;
                    nextOffset=segmentBackZ;
                }

                var z=backZ + offset;
                var nz=backZ + nextOffset;

                var seams=this.calcSegmentSeams( segment, step, offset );
                var nextSeams=this.calcSegmentSeams( segment, step, nextOffset );

                for ( var pi=0; pi < seams.length-1; ++pi )
                {
                    var s=seams[pi];
                    var ns=seams[pi+1];

                    // --- Just normal cubic form for this seam
                    var vIndex=pushVertex( s.x, s.y + nextSeams[pi].yMod, nz + nextSeams[pi].zMod );
                    pushVertex( s.x, s.y + s.yMod, z + s.zMod );
                    pushVertex( ns.x, ns.y + ns.yMod, z + ns.zMod );
                    pushVertex( ns.x, ns.y + nextSeams[pi+1].yMod, nz + nextSeams[pi+1].zMod );

                    pushQuad( vIndex, vIndex+1, vIndex+2, vIndex+3 );
                }

                offset+=step;
            }
        } else
        {
            var seams=this.calcSegmentSeams( segment, step, 0 );

            for ( var pi=0; pi < seams.length-1; ++pi )
            {
                var s=seams[pi];
                var ns=seams[pi+1];

                // --- Perform lathe for this seam

                var r=s.x;
                var nr=ns.x;
                var caZ=backZ + segmentBackZ/2;

                var caOffset=0; var caStep=step;
                while ( caOffset < 2*Math.PI )
                {
                    var cos=Math.cos( caOffset );
                    var sin=Math.sin( caOffset );
                    var ncos=Math.cos( caOffset + caStep );
                    var nsin=Math.sin( caOffset + caStep );

                    var x=r * cos;
                    var y=caZ + r * sin;

                    var lx=r * ncos;
                    var ly=caZ + r * nsin;

                    var nx=nr * cos;
                    var ny=caZ + nr * sin;

                    var lnx=nr * ncos;
                    var lny=caZ + nr * nsin;

                    var vIndex=pushVertex( lx, s.y, ly );
                    pushVertex( x, s.y, y );
                    pushVertex( nx, ns.y, ny );
                    pushVertex( lnx, ns.y, lny );
                    pushQuad( vIndex, vIndex+1, vIndex+2, vIndex+3 );

                    caOffset+=caStep;
                }
            }            
        }

        // --- Extension

        offset=0; finished=false;
        if ( !segment.extensionSeams.length ) finished=true;
        else {
            // --- Close It on the back
            //this.closeSegment( segment, segment.extensionSeams, false, backZ, pushVertex, pushQuad );
        }
        
        while ( !finished )
        {
            var nextOffset=offset + step;
            if ( nextOffset >= segmentBackZ ) {
                finished=true;
                nextOffset=segmentBackZ;
            }

            var z=backZ + offset;
            var nz=backZ + nextOffset;

            var seams=this.calcSegmentSeams( segment, step, offset, true );
            var nextSeams=this.calcSegmentSeams( segment, step, nextOffset, true );

            for ( var pi=0; pi < seams.length-1; ++pi )
            {
                var s=seams[pi];
                var ns=seams[pi+1];

                var vIndex=pushVertex( s.x, s.y + nextSeams[pi].yMod, nz + nextSeams[pi].zMod );
                pushVertex( s.x, s.y + s.yMod, z + s.zMod );
                pushVertex( ns.x, ns.y + ns.yMod, z + ns.zMod );
                pushVertex( ns.x, ns.y + nextSeams[pi+1].yMod, nz + nextSeams[pi+1].zMod );

                pushQuad( vIndex, vIndex+1, vIndex+2, vIndex+3 );
            }

            offset+=step;            
        }

        if ( segment.extensionSeams.length ) {
            // --- Close It on the back
            //this.closeSegment( segment, segment.extensionSeams, true, backZ + segmentBackZ, pushVertex, pushQuad );
        }        
/*
        if ( !mirror ) 
        {
            for ( var pi=0; pi < segment.seams.length-1; ++pi )
            {
                var s=segment.seams[pi];
                var ns=segment.seams[pi+1];

                var vIndex=pushVertex( s.x, s.y, backZ + segmentBackZ );
                pushVertex( s.x, s.y, backZ );
                pushVertex( ns.x, ns.y, backZ );
                pushVertex( ns.x, ns.y, backZ + segmentBackZ );

                pushQuad( vIndex, vIndex+1, vIndex+2, vIndex+3 );
            }
        } else
        {
            for ( var pi=0; pi < segment.seams.length-1; ++pi )
            {
                var s=segment.seams[pi];
                var ns=segment.seams[pi+1];

                var vIndex=pushVertex( -s.x, s.y, backZ + segmentBackZ );
                pushVertex( -s.x, s.y, backZ );
                pushVertex( -ns.x, ns.y, backZ );
                pushVertex( -ns.x, ns.y, backZ + segmentBackZ );

                pushQuad( vIndex+3, vIndex+2, vIndex+1, vIndex );
            }            
        }
*/
        // --- Close front of Segment if it has no transition

        //if ( !segment.transSize )
        //    this.closeSegment( segment, segment.hullSeams, true, backZ + segmentBackZ, pushVertex, pushQuad );

        // --- Transition

        if ( si < this.dc.segments.length - 1  && segment.transSize ) {
            var nextSegment=this.dc.segments[si+1];

            var offset=0; var finished=false;
            while ( !finished )
            {
                var z=backZ + segmentBackZ + offset;

                // --- Get the seams of the previous segment and the relating seams on the
                // --- next segment and interpolate them

                var lower_left={}, lower_right={};

                var nextOffset=offset + step;
                if ( nextOffset >= segment.transSize ) { 
                    nextOffset=segment.transSize;
                    finished=true;
                }

                for ( var pi=0; pi < segment.hullSeams.length; ++pi )
                {
                    var s1=segment.hullSeams[pi];

                    var mapi=Math.floor( nextSegment.hullSeams.length / (segment.hullSeams.length / pi) );

                    s2=nextSegment.hullSeams[mapi];
                    var nextZ=z + nextOffset - offset;

                    if ( !s2.np.spline ) 
                    {
                        // --- Linear Interpolation between Seams

                        var mul_right=offset / segment.transSize;
                        var mul_left=nextOffset / segment.transSize;

                        if ( pi === 0 ) {
                            lower_right.x=s1.x * ( 1 - mul_right ) + s2.x * ( mul_right );
                            lower_right.y=s1.y * ( 1 - mul_right ) + s2.y * ( mul_right );
                            lower_left.x=s1.x * ( 1 - mul_left ) + s2.x * ( mul_left );
                            lower_left.y=s1.y * ( 1 - mul_left ) + s2.y * ( mul_left );
                        } else
                        {
                            var upper_right={}, upper_left={};
                            upper_right.x=s1.x * ( 1 - mul_right ) + s2.x * ( mul_right );
                            upper_right.y=s1.y * ( 1 - mul_right ) + s2.y * ( mul_right );
                            upper_left.x=s1.x * ( 1 - mul_left ) + s2.x * ( mul_left );
                            upper_left.y=s1.y * ( 1 - mul_left ) + s2.y * ( mul_left );

                            var vIndex=pushVertex( lower_left.x, lower_left.y, nextZ );
                            pushVertex( lower_right.x, lower_right.y, z );
                            pushVertex( upper_right.x, upper_right.y, z );
                            pushVertex( upper_left.x, upper_left.y, nextZ );

                            pushQuad( vIndex, vIndex+1, vIndex+2, vIndex+3 );  

                            lower_right=upper_right;
                            lower_left=upper_left;
                        }
                    } else
                    {
                        // --- Canonical Spline Interpolation between the two Seams

                        // --- Calculate the distance between the two Segment points

                        //var splinePoints=[ { s1.x, s1.y}, { s1.x, s1.y } ];

                        var prev=s1, p=s1, np=s2, nnp=s2;

                        var numOfSegments=segment.transSize / step;
                        if ( segment.transSize % step  ) ++t;
                        var t=offset / step;
                        var tension=0.5;

                        // calc tension vectors
                        t1x = (np.x - prev.x) * tension;
                        t2x = (nnp.x - p.x) * tension;

                        t1y = (np.y - prev.y) * tension;
                        t2y = (nnp.y - p.y) * tension;

                        // --- 

                        var st = t / numOfSegments;

                        c1 =   2 * Math.pow(st, 3)  - 3 * Math.pow(st, 2) + 1; 
                        c2 = -(2 * Math.pow(st, 3)) + 3 * Math.pow(st, 2); 
                        c3 =       Math.pow(st, 3)  - 2 * Math.pow(st, 2) + st; 
                        c4 =       Math.pow(st, 3)  -     Math.pow(st, 2);

                        x1 = c1 * p.x  + c2 * np.x + c3 * t1x + c4 * t2x;
                        y1 = c1 * p.y  + c2 * np.y + c3 * t1y + c4 * t2y;

                        // ---

                        var st = (t+1) / numOfSegments;

                        c1 =   2 * Math.pow(st, 3)  - 3 * Math.pow(st, 2) + 1; 
                        c2 = -(2 * Math.pow(st, 3)) + 3 * Math.pow(st, 2); 
                        c3 =       Math.pow(st, 3)  - 2 * Math.pow(st, 2) + st; 
                        c4 =       Math.pow(st, 3)  -     Math.pow(st, 2);

                        x2 = c1 * p.x  + c2 * np.x + c3 * t1x + c4 * t2x;
                        y2 = c1 * p.y  + c2 * np.y + c3 * t1y + c4 * t2y;

                        if ( pi === 0 ) 
                        {
                            lower_right.x=x1; lower_right.y=y1;
                            lower_left.x=x2; lower_left.y=y2;
                        } else 
                        {
                            var upper_right={}, upper_left={};

                            upper_right.x=x1; upper_right.y=y1;
                            upper_left.x=x2; upper_left.y=y2;

                            var vIndex=pushVertex( lower_left.x, lower_left.y, nextZ );
                            pushVertex( lower_right.x, lower_right.y, z );
                            pushVertex( upper_right.x, upper_right.y, z );
                            pushVertex( upper_left.x, upper_left.y, nextZ );

                            pushQuad( vIndex, vIndex+1, vIndex+2, vIndex+3 );  

                            lower_right=upper_right;
                            lower_left=upper_left;                            
                        }
                    }
                }

                offset+=step;
            }
        }

        // ---
        
        backZ+=segment.size;
    }
};

ShapeBuilder.prototype.closeSegment=function( segment, seams, front, z, pushVertex, pushQuad )
{
    function getNextYHit( x, seams, index, getLinearIntersection )
    {
        for ( ; index < seams.length-1; ++index ) 
        {
            var s=seams[index];
            var ns=seams[index+1];

            if ( s.x >= x && ns.x <= x ) {
                var rc=getLinearIntersection( s.x, s.y, ns.x, ns.y, x, 1000, x, -1000 );
                return rc.y;
            }
        }

        return undefined;
    }

    for ( var i=0; i < seams.length - 1; ++i ) 
    {
        var s=seams[i];
        var ns=seams[i+1];

        if ( s.x < ns.x ) 
        {
            var y=getNextYHit( s.x, seams, i+2, this.getLinearIntersection );
            var ny=getNextYHit( ns.x, seams, i+2, this.getLinearIntersection );

            var vIndex=pushVertex( s.x, s.y, z );
            pushVertex( ns.x, ns.y, z );
            pushVertex( ns.x, ny, z );
            pushVertex( s.x, y, z );

            if ( front ) pushQuad( vIndex, vIndex+1, vIndex+2, vIndex+3 );    
            else pushQuad( vIndex+3, vIndex+2, vIndex+1, vIndex );    
        }
    }
};

ShapeBuilder.prototype.calcValueForSegmentTrans=function( seg1, seg2, x, y )
{
    //VG.log( "calcValueForSegmentTrans", x, y );

    var x1=this.calcSegmentValueAt( seg1, y, true );
    var x2=this.calcSegmentValueAt( seg2, y, true );

    var factor=x / seg1.transSize;
    var value=x1 * (1-factor) + x2 * factor;

    return value;
};

ShapeBuilder.prototype.calcSegmentSeams=function( segment, stepSize, segmentOffset, extension )
{
    function getSeamsForPointsArray( seams, points, statistics, zOffset )
    {
        function calcSeamMods( seam, zOffset, pOffset, p, np )
        {
            /** Calculates the modifiers of the given seam at the segment offset between two points.
             */

            function zValueForPoint( point, z )
            {
                var size=segment.size - segment.transSize;

                if ( !point.zFrontMod && !point.zBackMod ) return z;

                var frontBorder=size - point.zFrontMod;
                var backBorder=-point.zBackMod;

                if ( z > frontBorder ) return frontBorder;
                else
                if ( z < backBorder ) return backBorder;
                else return z;
            };

            function yValueForPoint( point, z )
            {
                var size=segment.size - segment.transSize;

                if ( !point.yFrontMod && !point.yBackMod ) return 0;

                var frontBorder=size - point.zFrontMod;
                var backBorder=-point.zBackMod;

                if ( z > frontBorder ) return point.yFrontMod;
                else
                if ( z < backBorder ) return point.yBackMod;
                else {
                    var step=z - backBorder;
                    var d=step / (frontBorder - backBorder);

                    return (point.yFrontMod * ( d ) + point.yBackMod * (1-d));
                }
            };

            // --- Calc z Value

            var pz=zValueForPoint( p, zOffset );
            if ( !np ) { 
                seam.zMod=pz - zOffset;
            } else {
                var npz=zValueForPoint( np, zOffset );
                var temp=pz * ( 1 - pOffset ) + npz * ( pOffset );
                seam.zMod=temp - zOffset;
            }

            // --- Calc y Value

            var py=yValueForPoint( p, zOffset );
            if ( !np ) { 
                seam.yMod=py;
            } else {
                var npy=yValueForPoint( np, zOffset );
                var temp=py * ( 1 - pOffset ) + npy * ( pOffset );
                seam.yMod=temp;
            }
        };

        //VG.log( "calcSeams", nrOfSeams, seamsPerLine, seamsInCalc, extraSeams );

        for ( var i=0; i < points.length-1; ++i ) 
        {
            var p=points[i];
            var np=points[i+1];

            // --- Statistics

            if ( statistics ) {
                if ( p.extension ) statistics.hasExtension=true;
                if ( p.x > statistics.maxValues.x ) statistics.maxValues.x=p.x;
                if ( p.y > statistics.maxValues.y ) statistics.maxValues.y=p.y;
            }

            // ---

            var deltaX=np.x - p.x;
            var deltaY=np.y - p.y;

            var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            var step=0.1 / distance;
            var offset=0;

            if ( p.circle )
            {
                var originX, originY;

                // --- Calc Origin
                if ( p.x < np.x ) originX=p.x + (np.x-p.x)/2;
                else originX=p.x - (p.x -np.x)/2;

                if ( p.y < np.y ) originY=p.y + (np.y-p.y)/2;
                else originY=p.y + (np.y -p.y)/2;

                var radius=distance/2;
                var pt=Math.atan2(p.y - originY, p.x - originX );

                while ( offset < Math.PI )
                {
                    var x=originX + radius * Math.cos( pt + offset );
                    var y=originY + radius * Math.sin( pt + offset );

                    var seam={ x: x, y: y, p : p, np : np };
                    if ( zOffset !== undefined ) calcSeamMods( seam, zOffset, offset / Math.PI, p, np );                    
                    seams.push( seam );

                    offset+=step*2;
                }
            } else
            if ( !np.spline )
            {
                // --- Linear
                while ( offset < 1 ) {
                    var x = p.x + deltaX * offset;
                    var y = p.y + deltaY * offset;

                    var seam={ x: x, y: y, p : p, np : np };
                    if ( zOffset !== undefined ) calcSeamMods( seam, zOffset, offset, p, np );
                    seams.push( seam );
                    offset+=step;
                }
            } else
            if ( np.spline )
            {
                // http://stackoverflow.com/questions/7054272/how-to-draw-smooth-curve-through-n-points-using-javascript-html5-canvas

                var numOfSegments=1 / step;
                var tension=0.5;

                var prev, nnp;

                for ( var t=0; t <= numOfSegments; t++) 
                {
                    if ( i === 0 ) prev=p;
                    else prev=points[i-1];

                    if ( i < points.length-2 ) nnp=points[i+2];
                    else nnp=p;

                    // calc tension vectors
                    t1x = (np.x - prev.x) * tension;
                    t2x = (nnp.x - p.x) * tension;

                    t1y = (np.y - prev.y) * tension;
                    t2y = (nnp.y - p.y) * tension;

                    var st = t / numOfSegments;

                    // calc cardinals
                    c1 =   2 * Math.pow(st, 3)  - 3 * Math.pow(st, 2) + 1; 
                    c2 = -(2 * Math.pow(st, 3)) + 3 * Math.pow(st, 2); 
                    c3 =       Math.pow(st, 3)  - 2 * Math.pow(st, 2) + st; 
                    c4 =       Math.pow(st, 3)  -     Math.pow(st, 2);

                    // calc x and y cords with common control vectors
                    x = c1 * p.x  + c2 * np.x + c3 * t1x + c4 * t2x;
                    y = c1 * p.y  + c2 * np.y + c3 * t1y + c4 * t2y;

                    var seam={ x: x, y: y, p : p, np : np };
                    if ( zOffset !== undefined ) calcSeamMods( seam, zOffset, st, p, np );
                    seams.push( seam );
                }
            }

            var seam={ x: np.x, y: np.y, p : p, np : np };
            if ( zOffset !== undefined ) calcSeamMods( seam, zOffset, 1, np );
            seams.push( seam );
        }
    };

    if ( segmentOffset === undefined )
    {
        // ------ Calculate the overall shape and dont take z-mods into account
        // --- All Points
        segment.hullSeams=[];
        segment.statistics={ hasExtension : false, maxValues : { x : 0, y : 0 } };
        getSeamsForPointsArray( segment.hullSeams, segment.getHullPoints( segment.statistics ), segment.statistics );
    
        // --- All Open Points
        segment.extensionSeams=[];
        if ( segment.statistics.hasExtension ) {
            getSeamsForPointsArray( segment.extensionSeams, segment.getExtensionPoints(), segment.statistics );
        }
    } else
    {
        // ------ Calculate the exact segment shape at a given z offset and take z-mods into account

        var seams=[];
        getSeamsForPointsArray( seams, extension ? segment.getExtensionPoints() : segment.getHullPoints(), undefined, segmentOffset );
        return seams;
    }
};

ShapeBuilder.prototype.calcSegmentValueAt=function( segment, offset, transOnly )
{
    var points=segment.points;
    
    if ( transOnly ) {
        var points=[];

        for ( var i=0; i < segment.points.length; ++i ) 
        {
            var p=segment.points[i];
            if ( !p.closed ) points.push( p );
        }
    }

    for ( var i=0; i < points.length-1; ++i ) 
    {
        var p=points[i];
        var np=points[i+1];

        if ( p.y <= offset && np.y >= offset ) {
            var rc=this.getLinearIntersection( p.x, p.y, np.x, np.y, 1000, offset, -1000, offset );
            return rc.x;
        }
    }

    return undefined;
};

ShapeBuilder.prototype.getLinearIntersection=function(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // http://jsfiddle.net/justin_c_rounds/Gd2S2/
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and 
    // booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};

// ----------------------------------------------------------------- Segment

Segment=function()
{
    Object.defineProperty( this, "hullSeams", { enumerable: false, writable: true });
    Object.defineProperty( this, "extensionSeams", { enumerable: false, writable: true });
    Object.defineProperty( this, "hullStatistics", { enumerable: false, writable: true });
    Object.defineProperty( this, "extensionStatistics", { enumerable: false, writable: true });
    Object.defineProperty( this, "selPoints", { enumerable: false, writable: true });

    this.points=[];
    this.selPoints=[];

    this.size=1;
    this.transSize=0;
    this.round=false;
    this.cubic=true;
};

Segment.prototype.getHullPoints=function( statistics )
{
    // --- All Open Points
    
    var hullPoints=[];

    for ( var i=0; i < this.points.length; ++i ) 
    {
        var p=this.points[i];
        if ( !p.extension ) hullPoints.push( p );
        else if ( statistics ) statistics.hasExtension=true;
    }
    return hullPoints;
};

Segment.prototype.getExtensionPoints=function()
{
    // --- All Open Points
    
    var extensionPoints=[];

    for ( var i=0; i < this.points.length; ++i ) 
    {
        var p=this.points[i];
        if ( p.extension ) extensionPoints.push( p );
    }
    return extensionPoints;
};

// ----------------------------------------------------------------- SegmentCPoint

SegmentCPoint=function( x, y )
{
    if ( !(this instanceof SegmentCPoint) ) return new SegmentCPoint( x, y );

    Object.defineProperty( this, "temp", { enumerable: false, writable: true });

    this.x=x ? x : 0;
    this.y=y ? y : 0;

    this.spline=false;
    this.extension=false;
    this.circle=false;

    this.yFrontMod=this.zFrontMod=0;
    this.yBackMod=this.zBackMod=0;

    this.temp={};
};