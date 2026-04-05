// Copyright (c) 2024 John Cotterell johnmdcotterell@gmail.com
// As long as the code is forked on Shadertoy, you can do what you like with it, except remove this message.
// Anything else requires my permission.

#define numballs 10
#define black vec3(0.0,0.0,0.0)
#define white vec3(1.0,1.0,1.0)
#define grey vec3(0.5,0.5,0.5)
#define blue vec3(0.0,0.0,1.0)
#define red vec3(1.0,0.0,0.0)
#define lime vec3(0.0,1.0,0.0)
#define green vec3(0.0,0.7,0.0)
#define cyan vec3(0.0,1.0,1.0)
#define purple vec3(1.0,0.0,1.0)
#define yelow vec3(1.0,1.0,0.0)
#define orange vec3(1.0,0.6,0.0)

vec4 Balls[numballs];

bool outputMode = false; vec3 outputColour; // Easy way to throw a value at the output for debugging
void outputValue (in float value){
    outputMode = true;
    if ( value >= 0.0 && value <= 1.0 )
        { outputColour = vec3(value, value, value); }
        else if ( value < 0.0 && value > -1.0 )
        { outputColour = vec3(0.0, 0.0, -value ); }
        else if ( value > 1.0 )
        { outputColour = vec3(1.0-(1.0/value), 1.0, 0.0); }
        else if ( value < -1.0 )
        { outputColour = vec3(1.0-(1.0/-value), 0.0, 1.0); }
} // Call outputValue with a float and that value will override the pixel output
void outputValue (in vec3 value){outputMode = true;outputColour = value;} // or directly with a vec3

float linePointLength( in vec3 P, in vec3 A, in vec3 B ){
    vec3 AB = B-A;
    float lenAB = length(AB);
    vec3 D = AB/lenAB;
    vec3 AP = P-A;
    float d = dot(D, AP);
    vec3 X = A + D * dot(P-A, D);
    if(X.y<0.0){return 10.0;} else {return length(X-P);}
}

vec3 linePoint( in vec3 P, in vec3 A, in vec3 B ){
    vec3 AB = B-A;
    float lenAB = length(AB);
    vec3 D = AB/lenAB;
    vec3 AP = P-A;
    float d = dot(D, AP);
    vec3 X = A + D * dot(P-A, D);
    return X;
}

float sdTriangle( in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2 ){
	vec2 e0 = p1 - p0;
	vec2 e1 = p2 - p1;
	vec2 e2 = p0 - p2;

	vec2 v0 = p - p0;
	vec2 v1 = p - p1;
	vec2 v2 = p - p2;

	vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 );
	vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 );
	vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 );
    
    float s = e0.x*e2.y - e0.y*e2.x;
    vec2 d = min( min( vec2( dot( pq0, pq0 ), s*(v0.x*e0.y-v0.y*e0.x) ),
                       vec2( dot( pq1, pq1 ), s*(v1.x*e1.y-v1.y*e1.x) )),
                       vec2( dot( pq2, pq2 ), s*(v2.x*e2.y-v2.y*e2.x) ));

	return -sqrt(d.x)*sign(d.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.y;
    float ar = iResolution.x/iResolution.y;
    float pixel = 1.0/iResolution.y;
    
    
    float cradius = 0.2*ar;
    float radius = 0.06;
    vec2 centreL = vec2((ar/2.0)-(cradius*0.8),0.5);
    vec2 centreR = vec2((ar/2.0)+(cradius*0.8),0.5);
    vec2 centre = vec2(0.0,0.0);
    float segment = 1.256637; // ( 3.1415926 * 2.0 ) / 5.0;
    float rightAng = 1.5708; // ( 3.1415926 * 2.0 ) / 4.0;
    vec3 Tcolf;
    vec3 Tcolb;
    
    bool flatTop;
    
    float tradius = radius/3.0;
    float theight = sqrt((radius*radius)-(tradius*tradius));
    float speed = iTime;
    float dist = 20.0;
    float angle;
    vec3 bcol,col;
    int currentBall = 10;
    for(int i=0;i<numballs;i++){
        angle = float(i) * segment;
        vec2 rcentre = centreL;
        if(i>4){
            angle += speed;
            rcentre = centreR;} else {
                angle -= speed;
            }
        Balls[i]= vec4( rcentre.x + (cradius * cos(angle)), rcentre.y + (cradius * sin(angle)), 0.0, angle );
        float bdist = distance(uv, Balls[i].xy);
        if(bdist<radius){
            dist=bdist;
            if(bdist<(radius-pixel)){currentBall = i;}
            centre = vec2(Balls[i].x, Balls[i].y);
            vec3 TAbcol = vec3(0.9,1.0,0.9);
            vec3 TAfcol = vec3(0.0,1.0,0.0);
            vec3 TBbcol = vec3(0.1,0.0,0.0);
            vec3 TBfcol = vec3(1.0,0.0,0.0);
            
            if(i<5){Tcolf=TAfcol;Tcolb=TAbcol;}else{Tcolf=TBfcol;Tcolb=TBbcol;}
            float f;
            float ringRadius=0.8;
            float ringWidth = 0.1;
            if(i>4){flatTop=true;ringRadius=0.45;}else{flatTop=false;ringRadius=0.8;}
            if(bdist>radius*(ringRadius+ringWidth)){
                f = smoothstep(radius*(ringRadius+ringWidth), (radius*(ringRadius+ringWidth))+pixel, bdist);
                bcol = mix(Tcolf,Tcolb,  f);
            } else if (bdist<radius*ringRadius){
                
                f = smoothstep(radius*ringRadius, (radius*ringRadius)-pixel, bdist);
                bcol = mix(Tcolf,Tcolb,  f);
            } else {
                bcol = Tcolf;
            }

            
        } else if(bdist<dist){ dist=bdist;}

    }

    vec3 gcol;

    float rotation;

    if(currentBall>4){
        rotation = Balls[currentBall].w + rightAng;
    } else {rotation = Balls[currentBall].w - rightAng;}


    // Spoiler Flap
    float SpFoffset = radius*3.0;// set distance from centre to front
    float SpBoffset = radius/1.8;// set distance from centre to back
    float SpFheight = radius*-1.5;// set front and back heights
    float SpBheight = radius*1.2;
    float SpWidth = radius/1.6;// set width, length, height of triangle
    float SpLength = SpFoffset+SpBoffset;
    float SpHeight = SpBheight-SpFheight;
    vec3 SpFc = vec3(centre.x + SpFoffset * cos(rotation), 0.0, centre.y + SpFoffset * sin(rotation));// get front point F
    vec3 SpFl = SpFc; SpFl.x += (SpWidth * sin(rotation)); SpFl.z -= (SpWidth * cos(rotation));// get front points L and R
    vec3 SpFr = SpFc; SpFr.x -= (SpWidth * sin(rotation)); SpFr.z += (SpWidth * cos(rotation));
    vec3 SpBc = vec3(centre.x - SpBoffset * cos(rotation), 0.0, centre.y - SpBoffset * sin(rotation));// get back point B
    vec3 SpBl = SpBc; SpBl.x += (SpWidth * sin(rotation)); SpBl.z -= (SpWidth * cos(rotation));// get back points L and R
    vec3 SpBr = SpBc; SpBr.x -= (SpWidth * sin(rotation)); SpBr.z += (SpWidth * cos(rotation));
    float SpBD = linePointLength( vec3(uv.x, 0.0, uv.y), vec3(SpBl.x, 0.0, SpBl.z), vec3(SpBr.x, 0.0, SpBr.z) );// get distance from back
    float SpFD = linePointLength( vec3(uv.x, 0.0, uv.y), vec3(SpFl.x, 0.0, SpFl.z), vec3(SpFr.x, 0.0, SpFr.z) );// get distance from front
    float SpH = SpFheight + (SpHeight*(SpFD/SpLength));// get height of current point
    float inTri = sdTriangle(uv, SpFc.xz, SpBr.xz, SpBl.xz);// is point in triangle
    // if(inTri<0.0){outputValue(purple);} // uncomment to test where spoiler triangle is
    
    // is point higher than dome
    float lineDist = linePointLength( vec3(uv.x, 0.0, uv.y) , vec3(SpBc.x, 0.0, SpBc.z)  , vec3(SpFc.x, 0.0, SpFc.z)  );
    if(currentBall<5){
        float gfline = 2.4;
        float gflinew = 0.008;
        if(lineDist>radius/gfline&&lineDist<(radius/gfline)+gflinew&&dist<radius*0.9)
            {
            if(lineDist<(radius/gfline)+(gflinew/2.0)){
                float p = smoothstep(radius/gfline, radius/gfline + (gflinew/10.0), lineDist);
                bcol = mix(Tcolb,Tcolf,  p);} else {
                    float p = smoothstep((radius/gfline)+gflinew, (radius/gfline)+gflinew - (gflinew/10.0), lineDist);
                    bcol = mix(bcol,Tcolf,  p);
                }
            } else if (lineDist<(radius/gfline)+gflinew ){bcol = Tcolb;}
    }

    gcol = vec3(0.5,0.5,0.6);

    float power = 16.0;
    float power2 = 16.0;

    float height = sqrt((radius*radius)-(dist*dist));
    vec2 distv = uv - centre;
    vec3 normal = vec3(distv.x, height, distv.y)/radius;
        
    if(flatTop){
        if(height>theight){
            height=theight;
            normal = vec3(0.0, 1.0, 0.0);
            power = power2;
        }
        float p = smoothstep(theight-0.01, theight, height);
        normal = mix(normal,vec3(0.0, 1.0, 0.0),  p);
        height = mix(height,theight,  p);
    }
    if(SpH>height&&currentBall<10){
        float face = 0.7;  
        if(inTri<0.0){
        power = power2;
        float s = smoothstep(0.0, -0.001, inTri);
        bcol=mix(Tcolb, Tcolf, s);
        if(inTri<-0.005){
            s = smoothstep(-0.01, -0.009, inTri);
            bcol=mix(Tcolb, Tcolf, s);
        }
            s = smoothstep(0.0, pixel*6.0, SpH-height);
            height=mix(height, SpH, s);
            normal=mix(normal,vec3( face * cos(rotation), 0.9 , face * sin(rotation)), s);
        } 
        if (inTri<radius/10.0&&inTri>0.0) {
            power = power2;
            bcol=Tcolb;
            float s = smoothstep(0.0, radius/6.0, inTri);
            height=mix(SpH,height,  s);
            normal=mix(vec3( face * cos(rotation), 0.9 , face * sin(rotation)),normal, s);
        }
    }
    
    normal = normal/length(normal);

    vec3 position = vec3(uv.x, height, uv.y);
        
    vec3 incident = vec3(0.0, -1.0, 0.0);
    vec3 reflection = reflect(incident, normal);

    vec3 lcolA = vec3(0.0,0.4,0.0);
    vec3 lcolB = vec3(0.5,0.0,0.0);
    vec3 lcolC = vec3(0.4,0.4,0.5);

    vec3 lcolAmbient = (lcolA+lcolB+lcolC+lcolC+lcolC)/(7.0);
        
    gcol *= lcolAmbient;

    vec3 lightA = vec3(0.0-0.3, 0.1, 0.5);
    vec3 lightB = vec3(ar+0.3, 0.1, 0.5);
    vec3 lightC = vec3(0.5*ar,0.2, 0.5);
        
        float f;
        
        vec3 goalRT = vec3(ar-0.1, 0.2, 0.65);
        vec3 goalRB = vec3(ar-0.1, 0.2, 0.35);

        float lightBTG = (goalRT.z-lightB.z)/(lightB.x-goalRT.x);
        float lightBTGdist = ( (lightB.x - uv.x) * lightBTG) -  (uv.y-lightB.z);
        float lightBBG = (goalRB.z-lightB.z)/(lightB.x-goalRB.x);
        float lightBBGdist =    (uv.y-lightB.z)-( (lightB.x - uv.x) * lightBBG);
        float lightBdist = lightBBGdist*lightBTGdist;
        
        vec3 goalLT = vec3(0.1, 0.2, 0.65);
        vec3 goalLB = vec3(0.1, 0.2, 0.35);

        float lightATG = (goalLT.z-lightA.z)/(lightA.x-goalLT.x);
        float lightATGdist = ( (lightA.x - uv.x) * lightATG) -  (uv.y-lightA.z);
        float lightABG = (goalLB.z-lightA.z)/(lightA.x-goalLB.x);
        float lightABGdist =    (uv.y-lightA.z)-( (lightA.x - uv.x) * lightABG);
        float lightAdist = lightABGdist*lightATGdist;

        vec3 tolightA = lightA - position;
        vec3 tolightB = lightB - position;
        vec3 tolightC = lightC - position;

        float distlA = length(tolightA);
        float distlB = length(tolightB);
        float distlC = length(tolightC);

        tolightA = tolightA/distlA;
        tolightB = tolightB/distlB;
        tolightC = tolightC/distlC;
        
        float lamntA = max(0.0, dot(tolightA, normal));
        float lamntB = max(0.0, dot(tolightB, normal));
        float lamntC = max(0.0, dot(tolightC, normal));

        float specamntA = pow(max(0.0, dot(tolightA, reflection)), power);
        float specamntB = pow(max(0.0, dot(tolightB, reflection)), power);
        float specamntC = pow(max(0.0, dot(tolightC, reflection)), power);
        if( dist > radius ){ height = 0.0;};
        
        
        vec3 tlightA = (lcolA*specamntA)+(lcolA*lamntA);
        vec3 tlightB = (lcolB*specamntB)+(lcolB*lamntB);
        vec3 tlightC = (lcolC*specamntC)+(lcolC*lamntC);
        
        tlightA*=2.0;
        tlightB*=2.0;
        tlightC*=3.0;
        
        int Btotal;
        int Atotal;
        int Ctotal;
       float Bmost=0.0;
       float Amost=0.0;
        float Cmost=0.0;
        
        bool Bcast = false;
        float BcastDepth;
        bool Acast = false;
        float AcastDepth;
        for(int i=0;i<numballs;i++){
        
            if(i!=currentBall){
                vec3 ballcast = Balls[i].xzy;
                float beamA = linePointLength(ballcast, lightA, vec3(uv.x, height, uv.y));
                float beamB = linePointLength(ballcast, lightB, vec3(uv.x, height, uv.y));
                float beamC = linePointLength(ballcast, lightC, vec3(uv.x, height, uv.y));
                
               
                if (beamC>(radius)){Ctotal+=1;} else if ((radius-beamC) > Cmost) {Cmost = radius-beamC;}

                if (beamA>(radius)){
                    Atotal+=1;
                } else {
                    if ((radius-beamA) > Amost) {Amost = radius-beamA;}
                    if(height>0.0  && (uv.x>Balls[i].x) ){Acast = true;AcastDepth=radius-beamA;}
                }

                if (beamB>(radius)){
                    Btotal+=1;
                } else {
                    if ((radius-beamB) > Bmost) {Bmost = radius-beamB;}
                    if(height>0.0  && (uv.x<Balls[i].x) ){Bcast = true;BcastDepth=radius-beamB;}
                }

            }
        }
        float lcolAinc = lightA.y/(lightA.x-uv.x);
        f = smoothstep(0.0, uv.x/40.0, lightAdist);
        vec3 gacol = mix(gcol,gcol+(lcolA*-lcolAinc*1.2),  f);
        if(Atotal==10){
            tlightA = mix(vec3(0.0,0.0,0.0),tlightA,  f);
            gcol = gacol;
        }  else {
            
           Amost *=100.0;
            f = smoothstep(0.2 + (dist-radius)*10.0, 0.0, Amost);
            gcol = mix(gcol,gacol,  f);
            if(Acast){
                f = smoothstep(0.0, 0.01, AcastDepth);
                tlightA = mix(tlightA,vec3(0.0,0.0,0.0),  f);
            }
        }
        
        float lcolBinc = lightB.y/(lightB.x-uv.x);
        f = smoothstep(0.0, (ar-uv.x)/40.0, lightBdist);
        vec3 gbcol = mix(gcol,gcol+(lcolB*lcolBinc*1.2),  f);
        if(Btotal==10){
            tlightB = mix(vec3(0.0,0.0,0.0),tlightB,  f);
            gcol = gbcol;
        }  else {
            
           Bmost *=100.0;
            f = smoothstep(0.2 + (dist-radius)*10.0, 0.0, Bmost);
            gcol = mix(gcol,gbcol,  f);
            if(Bcast){
                f = smoothstep(0.0, 0.01, BcastDepth);
                tlightB = mix(tlightB,vec3(0.0,0.0,0.0),  f);
            }
        }
        
    vec3 VA = vec3(lightC.x-uv.x, lightC.y, lightC.z-uv.y);
    vec3 VB = vec3(0.0, 1.0, 0.0);
    VA = VA/length(VA);
    float lcolCinc = dot(VB,VA );
    if(Ctotal==10 ||  dist < (radius-pixel)){    
        gcol = gcol+(lcolC*lcolCinc*1.2);
    }  else if(dist > (radius-pixel)) {
        Cmost *=80.0;
        f = smoothstep(0.4 + (dist-radius)*5.0, 0.0, Cmost);
        gcol = mix(gcol, gcol+(lcolC*lcolCinc*1.2), f);
    }

    // Multiplying and then adding light like this is not correct
    bcol*=(1.0+tlightA+tlightB+tlightC+lcolAmbient)/4.0;
    bcol+=(tlightA+tlightB+tlightC+lcolAmbient)/4.0;  
    f = smoothstep(radius-pixel, radius, dist);
    col = mix(bcol, gcol, f);
    if( dist > radius ) { col = gcol; }
    if(outputMode){col = outputColour;}
    fragColor = vec4(col,1.0);
}