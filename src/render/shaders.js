export const VS = `#version 300 es
in vec4 a_position;
void main() { gl_Position = a_position; }
`;

export const FS = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 entities[11];   // xy = shader-space pos, z = rotation
uniform int activerobs;
uniform int player;
uniform int hasball;

out vec4 outColor;

#define numrobs 11
#define numlights 4

#define white vec3(1.)
#define pink vec3(.95,.75,.75)
#define pgreen vec3(.7,.9,.7)
#define pblack vec3(.6,.6,.6)
#define black vec3(.0)
#define pgrey vec3(0.85)
#define pred vec3(1., .5, .5)

float pixel = 0.0;
vec4 courtprox = vec4(0.0);
vec2 uv = vec2(0.0);
float ar = 0.0;
float f = 0.0;
float border = 0.05;
float bar = 1.0;

struct light {
    vec3 colour;
    vec3 position;
    vec3 difference;
    vec3 amount;
    vec2 shadow;
    float dist;
    float intensity;
    bool casts;
    bool ison;
};

struct Rob {
    vec3 position;
    vec3 colourA;
    vec3 colourB;
    float rotation;
    float radius;
    bool ison;
};

vec3 getGroundColour(){
    float linewidth = 0.01;
    float hlinewidth = linewidth/2.0;
    float rhlinewidth = hlinewidth + pixel/2.0;
    vec3 rcol = pgrey;
    if(courtprox.x>-linewidth&&courtprox.x<=0.0||abs(courtprox.y)<linewidth||courtprox.z>-linewidth&&courtprox.z<=0.0||abs(courtprox.w)<linewidth){
        rcol = white;
    }
    float crad = 0.2;
    float dfc = distance(uv, vec2(ar/2.0, 0.5));
    float crdiff = dfc-crad;
    if(crdiff<rhlinewidth ){
        f = smoothstep(rhlinewidth-pixel,rhlinewidth , abs(crdiff));
        rcol = mix(white, pgrey, f);
    }
    if(crdiff>=hlinewidth-pixel&&abs(uv.x - (ar/2.0))<=hlinewidth){
        rcol = white;
    }
    dfc = distance(uv, vec2(border*bar, 0.5));
    crdiff = dfc-crad;
    if(crdiff<rhlinewidth ){
        f = smoothstep(rhlinewidth-pixel,rhlinewidth , abs(crdiff));
        rcol = mix(white, rcol, f);
    }
    dfc = distance(uv, vec2(ar-(border*bar), 0.5));
    crdiff = dfc-crad;
    if(abs(crdiff)<rhlinewidth ){
        f = smoothstep(rhlinewidth-pixel,rhlinewidth , abs(crdiff));
        rcol = mix(white, rcol, f);
    }
    return rcol;
}

vec3 contrast(vec3 color, float value) { return 0.5 + value * (color - 0.5); }
vec3 gammaCorrection (vec3 colour, float gamma) { return pow(colour, vec3(1. / gamma)); }

float linePointLength(in vec3 P, in vec3 A, in vec3 B){
    vec3 AB = B-A;
    float lenAB = length(AB);
    vec3 D = AB/lenAB;
    vec3 X = A + D * dot(P-A, D);
    if(X.z<0.0){return 10.0;} else {return length(X-P);}
}

float sdTriangle(in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2){
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0*clamp(dot(v0,e0)/dot(e0,e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1*clamp(dot(v1,e1)/dot(e1,e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2*clamp(dot(v2,e2)/dot(e2,e2), 0.0, 1.0);
  float s = e0.x*e2.y - e0.y*e2.x;
  vec2 d = min(min(vec2(dot(pq0,pq0), s*(v0.x*e0.y-v0.y*e0.x)),
                   vec2(dot(pq1,pq1), s*(v1.x*e1.y-v1.y*e1.x))),
                   vec2(dot(pq2,pq2), s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y);
}

float dot2(vec2 v){ return dot(v,v); }
float sdBezier(in vec2 pos, in vec2 A, in vec2 B, in vec2 C){
    vec2 a = B - A, b = A - 2.0*B + C, c = a * 2.0, d = A - pos;
    float kk = 1.0/dot(b,b);
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);
    float res = 0.0;
    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx-3.0*ky) + kz;
    float h = q*q + 4.0*p3;
    if(h >= 0.0){
        h = sqrt(h);
        vec2 x = (vec2(h,-h)-q)/2.0;
        vec2 uvb = sign(x)*pow(abs(x), vec2(1.0/3.0));
        float t = clamp(uvb.x+uvb.y-kx, 0.0, 1.0);
        res = dot2(d + (c + b*t)*t);
    } else {
        float z = sqrt(-p);
        float v = acos(q/(p*z*2.0)) / 3.0;
        float m = cos(v);
        float n = sin(v)*1.732050808;
        vec3 t = clamp(vec3(m+m,-n-m,n-m)*z-kx, 0.0, 1.0);
        res = min(dot2(d+(c+b*t.x)*t.x), dot2(d+(c+b*t.y)*t.y));
    }
    return sqrt(res);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    uv = fragCoord/iResolution.y;
    ar = iResolution.x/iResolution.y;
    float height = 0.0;
    pixel = 1./iResolution.y;
    float mTime = mod(iTime, 6.2832);
    bool ZoneRob=false, ZoneGround=false, ZoneWall=false, ZoneGoalWall=false, ZoneInsideWall=false;
    border = 0.05; bar = 1.0;
    vec4 courtyard = vec4(border*bar, border, ar-(border*bar), 1.0-border);
    courtprox = vec4(courtyard.x - uv.x, courtyard.y - uv.y, uv.x - courtyard.z, uv.y - courtyard.w);
    float goalwidth = 0.2;
    float goaltop = 0.5 + (goalwidth/2.0);
    float goalbottom = 0.5 - (goalwidth/2.0);
    float goalprox = max((uv.y-goaltop), (goalbottom-uv.y));
    float wallheightfactor = 1.0;

    Rob Robs[numrobs];
    float dist = ar;
    int rindex = -1;
    vec2 centre = vec2(ar/2.0, 0.5);
    float radius = 0.0;
    float rightAng = 1.5708;
    float dradius = 0.048;
    float bradius = 0.02;
    vec2 distv;
    vec3 normal = vec3(0.0,0.0,1.0);
    vec3 bgnormal = vec3(0.0,0.0,1.0);
    bool flatTop = false;
    float theight = 0.0;

    for(int i=1;i<numrobs;i++){
      Robs[i].ison = false;
      if(i<activerobs){
        Robs[i].ison = true;
        Robs[i].radius = dradius;
        if(i>5){ Robs[i].colourA = pgreen; Robs[i].colourB = pblack; }
        else   { Robs[i].colourA = pink;   Robs[i].colourB = white;  }
        Robs[i].position = vec3(entities[i].xy, 0.0);
        Robs[i].rotation = entities[i].z - rightAng;
      }
    }

    int tracter = hasball;
    int tractee = 0;
    bool tracting = (tracter > 0);

    float sinw = sin(mTime*50.0);
    Robs[0].position = vec3(entities[0].xy, bradius);
    if(tractee==0 && tracting){
      Robs[0].position.x += sinw/400.0;
      Robs[0].position.y -= sinw/400.0;
    }
    Robs[0].radius = bradius;
    Robs[0].ison = true;
    Robs[0].colourA = vec3(1.2);
    Robs[player].colourA = pred;

    vec3 bgcol; vec3 fgcol; vec3 col = white;
    vec2 robambient = vec2(1.0, 1.0);

    light lights[numlights];
    lights[0] = light(vec3(1.0,1.0,1.0),vec3(ar*.5, .5 ,.6),vec3(0.0),vec3(0.0),vec2(0.0),0.0, 0.1, true, true);
    lights[1] = light(vec3(1.0,0.3,0.3),vec3(ar*-0.04, 0.5 ,0.05),vec3(0.0),vec3(0.0),vec2(0.0),0.0, 0.03, true, true);
    lights[3] = light(vec3(0.3,1.0,0.3),vec3(ar*1.04, 0.5 ,0.05),vec3(0.0),vec3(0.0),vec2(0.0),0.0, 0.025, true, false);
    lights[2] = light(vec3(0.2,0.2,0.9),vec3(0.0),vec3(0.0),vec3(0.0),vec2(0.0),0.0, 0.0007, false, false);
    lights[2].position = Robs[tractee].position;
    lights[2].ison = tracting;
    if(uv.x>=ar/2.0){ lights[1] = lights[3]; lights[1].ison = true; }
    vec3 tcol = (tracter<6) ? vec3(0.5,0.2,0.2) : vec3(0.2,0.5,0.2);
    lights[2].colour = tcol;

    if(courtprox.w>0.0 && courtprox.w*bar>courtprox.z && courtprox.w*bar>courtprox.x){
        bgcol = pgrey; bgnormal = vec3(0.0,-1.0,0.0); ZoneWall = true;
        height = courtprox.w * wallheightfactor;
    } else if(courtprox.y>0.0 && courtprox.y*bar>courtprox.z && courtprox.y*bar>courtprox.x){
        bgcol = pgrey; bgnormal = vec3(0.0,1.0,0.0); ZoneWall = true;
        height = courtprox.y * wallheightfactor;
    } else if(goalprox>0.0 && courtprox.x>0.0 || courtprox.x>(border*bar)/2.0){
        bgcol = pgrey; bgnormal = vec3(1.0,0.0,0.0); ZoneWall = true; ZoneGoalWall = true;
        float cph = courtprox.x/2.2;
        if(goalprox<cph && courtprox.x<(border*bar)/2.0){
            ZoneInsideWall = true;
            height = goalprox * wallheightfactor;
            bgnormal = (uv.y<0.5) ? vec3(0.0,1.0,0.0) : vec3(0.0,-1.0,0.0);
        } else { height = courtprox.x * wallheightfactor; }
    } else if(goalprox>0.0 && courtprox.z>0.0 || courtprox.z>(border*bar)/2.0){
        bgcol = pgrey; bgnormal = vec3(-1.0,0.0,0.0); ZoneWall = true; ZoneGoalWall = true;
        if(goalprox<courtprox.z/2.2 && courtprox.z<(border*bar)/2.0){
            ZoneInsideWall = true;
            height = goalprox * wallheightfactor;
            bgnormal = (uv.y<0.5) ? vec3(0.0,1.0,0.0) : vec3(0.0,-1.0,0.0);
        } else { height = courtprox.z * wallheightfactor; }
    } else {
        ZoneGround = true; bgcol = getGroundColour(); bgnormal = vec3(0.0,0.0,1.0);
    }

    float limA = courtyard.x;
    float limB = courtprox.x;
    if(uv.x>ar/2.0){ limA = courtyard.z; limB = courtprox.z; }
    float lightATG = (goaltop-lights[1].position.y)/(lights[1].position.x-limA);
    float lightATGdist = ((lights[1].position.x - uv.x) * lightATG) - (uv.y-lights[1].position.y);
    float lightABG = (goalbottom-lights[1].position.y)/(lights[1].position.x-limA);
    float lightABGdist = (uv.y-lights[1].position.y)-((lights[1].position.x - uv.x) * lightABG);
    float lightAdist = lightABGdist*lightATGdist;
    lights[1].shadow.x = 1.0;
    if(goalprox<0.0||ZoneInsideWall){ lights[1].shadow.x = 0.0; }
    else if(lightAdist>0.0){
        lights[1].shadow.x = 0.0;
        f = smoothstep(0.0, 0.2*-limB, lightAdist);
        lights[1].shadow.x = mix(1.0, 0.0, f);
    }
    lights[1].shadow.y = lights[1].shadow.x;

    for(int i=0;i<numrobs;i++){
        if(Robs[i].ison){
            float bdist = distance(uv, Robs[i].position.xy);
            if(bdist<dist) dist=bdist;
            float edgedist = distance(uv, Robs[i].position.xy) + (Robs[i].position.z);
            if(bdist<Robs[i].radius){
                dist=bdist; radius = Robs[i].radius;
                height = sqrt((radius*radius)-(dist*dist));
                ZoneRob = true; rindex = i;
                if(i>5) flatTop=true;
                if(bdist<Robs[i].radius-pixel) ZoneGround = false;
                robambient.y *= 1.0 - (0.5 * pow(0.8/(edgedist/Robs[i].radius),3.0));
            } else {
                robambient *= 1.0 - (0.5 * pow(0.8/(edgedist/Robs[i].radius),3.0));
            }
        }
    }

    if(ZoneRob){
        fgcol = Robs[rindex].colourA;
        centre = vec2(Robs[rindex].position.x, Robs[rindex].position.y);
        distv = uv - centre;
        normal = vec3(distv.x, distv.y, height)/radius;
        height += Robs[rindex].position.z;

        if(flatTop){
            float tradius = radius/2.5;
            theight = sqrt((radius*radius)-(tradius*tradius));
            if(height>theight){ height=theight; normal = vec3(0.0, 1.0, 0.0); }
            f = smoothstep(theight-0.01, theight, height);
            normal = mix(normal,vec3(0.0,0.0,1.0), f);
            height = mix(height, theight, f);
        }

        robambient.x *= (0.6 + normal.z/3.0);
        float rotation = Robs[rindex].rotation;
        if(rindex>0){
            float SpFoffset = radius*2.0;
            float SpBoffset = radius/1.0;
            float SpFheight = radius*-1.0;
            float SpBheight = radius*1.4;
            float SpWidth = radius/1.4;
            float SpLength = SpFoffset+SpBoffset;
            float SpHeight = SpBheight-SpFheight;
            vec3 SpFc = vec3(centre.x + SpFoffset * cos(rotation), centre.y + SpFoffset * sin(rotation), 0.0);
            vec3 SpFl = SpFc; SpFl.x += (SpWidth * sin(rotation)); SpFl.y -= (SpWidth * cos(rotation));
            vec3 SpFr = SpFc; SpFr.x -= (SpWidth * sin(rotation)); SpFr.y += (SpWidth * cos(rotation));
            vec3 SpBc = vec3(centre.x - SpBoffset * cos(rotation), centre.y - SpBoffset * sin(rotation), 0.0);
            vec3 SpBl = SpBc; SpBl.x += (SpWidth * sin(rotation)); SpBl.y -= (SpWidth * cos(rotation));
            vec3 SpBr = SpBc; SpBr.x -= (SpWidth * sin(rotation)); SpBr.y += (SpWidth * cos(rotation));
            float SpFD = linePointLength(vec3(uv.x,uv.y,0.0), vec3(SpFl.x,SpFl.y,0.0), vec3(SpFr.x,SpFr.y,0.0));
            float SpH = SpFheight + (SpHeight*(SpFD/SpLength));
            float inTri = sdTriangle(uv, SpFc.xy, SpBr.xy, SpBl.xy);

            float lineDist = linePointLength(vec3(uv.x,uv.y,0.0), vec3(SpBc.x,SpBc.y,0.0), vec3(SpFc.x,SpFc.y,0.0));
            float linewid = radius*0.05;
            float linemid = abs((radius*0.45)-lineDist);
            if(linemid<linewid) fgcol=Robs[rindex].colourB;
            if(linemid<linewid+pixel){
                f = smoothstep(linewid,linewid+pixel, linemid);
                fgcol = mix(Robs[rindex].colourB, fgcol, f);
            }
            if(rindex>5){
                if(SpFD<radius*2.0){
                    float lw = radius*0.05;
                    float lm = abs((radius*0.45)-dist);
                    if(lm<lw) fgcol=Robs[rindex].colourB;
                    else if(dist>(radius*0.45)) fgcol=Robs[rindex].colourA;
                    if(lm<lw+pixel){ f = smoothstep(lw, lw+pixel, lm); fgcol = mix(Robs[rindex].colourB, fgcol, f); }
                }
            } else {
                if(SpFD>radius*2.5 && lineDist<(radius*0.5)+pixel){
                    float lw = radius*0.05;
                    float lm = abs((radius*0.75)-dist);
                    if(lm<lw) fgcol=Robs[rindex].colourB;
                    else if(dist>(radius*0.75)) fgcol=Robs[rindex].colourA;
                    if(lm<lw+pixel){ f = smoothstep(lw, lw+pixel, lm); fgcol = mix(Robs[rindex].colourB, fgcol, f); }
                }
            }

            if(SpH>height){
                float face = 0.7;
                if(inTri<0.0 && dist<radius*0.9){
                    if(dist<radius*0.7){
                        f = smoothstep(0.0, pixel*5.0, SpH-height);
                        height = mix(height, SpH, f);
                        normal = mix(normal, vec3(face*cos(rotation), face*sin(rotation), 0.7), f);
                    } else {
                        f = smoothstep(radius*0.75, radius*0.95, dist);
                        height = mix(SpH, height, f);
                        normal = mix(vec3(face*cos(rotation), face*sin(rotation), 0.7), normal, f);
                    }
                }
            }
        }
        normal = normal/length(normal);
    }

    if(ZoneGround||ZoneWall){
        float shadowheight = ZoneWall ? height : 0.0;
        for(int i=0;i<numrobs;i++){
            if(Robs[i].ison){
                for(int j=0;j<numlights;j++){
                    if(lights[j].casts && lights[j].ison){
                        float beam = linePointLength(Robs[i].position, lights[j].position, vec3(uv.x,uv.y,shadowheight));
                        float cradius = Robs[i].radius;
                        float blur = distance(Robs[i].position, vec3(uv.x,uv.y,shadowheight))/8.0;
                        float shadow;
                        if(beam<=(cradius-blur)) shadow = 1.0;
                        else { f = smoothstep(cradius-blur, cradius, beam); shadow = mix(1.0, 0.0, f); }
                        lights[j].shadow.x = max(shadow, lights[j].shadow.x);
                    }
                }
            }
        }
    }

    vec2 ambientmulti = vec2((min(0.5+(height*3.0), 1.0)), 0.5);
    float ambiA=1.0, ambiB=1.0, ambiC=0.5;
    ambientmulti *= sqrt((min(ambiC-(courtprox.w*ambiA), ambiB)) * (min(ambiC-courtprox.z*ambiA, ambiB))
                       * (min(ambiC-courtprox.y*ambiA, ambiB)) * (min(ambiC-courtprox.x*ambiA, ambiB)));

    vec3 position = vec3(uv, height);
    vec3 bgtot = vec3(0.0), fgtot = vec3(0.0), sptot = vec3(0.0);
    for(int j=0;j<numlights;j++){
        if(lights[j].ison){
            lights[j].difference = lights[j].position - position;
            lights[j].dist = length(lights[j].difference);
            lights[j].difference = lights[j].difference/lights[j].dist;
            lights[j].amount.x = max(0.0, dot(lights[j].difference, normal))/(lights[j].dist*lights[j].dist);
            lights[j].amount.y = max(0.0, dot(lights[j].difference, bgnormal))/(lights[j].dist*lights[j].dist);
            lights[j].amount.y *= lights[j].intensity * (1.0-lights[j].shadow.x);
            lights[j].amount.x *= lights[j].intensity * (1.0-lights[j].shadow.y);
            bgtot += lights[j].colour*lights[j].amount.y;
            fgtot += lights[j].colour*lights[j].amount.x;
        }
    }

    bgcol *= (robambient.y*ambientmulti.y)+bgtot;
    if(ZoneRob){
        vec3 incident = vec3(0.0, 0.0, -1.0);
        vec3 reflection = reflect(incident, normal);
        for(int j=0;j<numlights;j++){
            if(lights[j].ison){
                lights[j].amount.z = pow(max(0.0, dot(lights[j].difference, reflection)), 32.0);
                lights[j].amount.z = lights[j].amount.z/(lights[j].dist*lights[j].dist);
                lights[j].amount.z *= lights[j].intensity * (1.0-lights[j].shadow.y);
                sptot += lights[j].colour*lights[j].amount.z;
            }
        }
        fgcol *= (robambient.x*ambientmulti.x)+fgtot;
        fgcol += sptot;
        if(ZoneGround){ f = smoothstep(radius-pixel, radius, dist); col = mix(fgcol, bgcol, f); }
        else           { col = fgcol; }
    } else { col = bgcol; }

    if(tracting){
        float tdist = dradius*0.5;
        float tdistf = distance(Robs[tracter].position.xy, Robs[tractee].position.xy)/2.0;
        float cosr = cos(Robs[tracter].rotation);
        float sinr = sin(Robs[tracter].rotation);
        vec2 tpA = vec2(Robs[tracter].position.x + (tdist * cosr), Robs[tracter].position.y + (tdist * sinr));
        vec2 tpB = vec2(Robs[tracter].position.x + (tdistf * cosr), Robs[tracter].position.y + (tdistf * sinr));
        float tqdist = distance(uv, tpA);
        float tractor = sdBezier(uv, tpA, tpB, Robs[tractee].position.xy);
        float lv = 0.01*tqdist;
        float lw = (0.6*tqdist)+sin((mTime*80.0)+(tqdist*200.0))/80.0;
        vec3 lcol = tcol/3.;
        if(tractor<lw){ f = smoothstep(lv, lw, tractor); col = mix(col+lcol, col, f); }

        if(rindex==tractee){
            float llw = 0.4;
            vec3 lnorm = vec3(sin(mTime*3.), cos(mTime*11.), cos(mTime*7.));
            float ncola = sin(dot(normal, lnorm));
            float ncolc = sin(dot(normal, lnorm.zxy));
            if(ncolc>sin(ncola*5.) && ncolc<sin(ncola*5.)+llw) col += tcol;
            if(ncola>sin(ncolc*5.) && ncola<sin(ncolc*5.)+llw) col += tcol;
        }
    }

    col = contrast(col, 1.2);
    col = gammaCorrection(col, .95);
    fragColor = vec4(col, 1.0);
}

void main(){ mainImage(outColor, gl_FragCoord.xy); }
`;