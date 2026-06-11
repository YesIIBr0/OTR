/* OTR — WebGL raymarched glass voice-orb.
   Renders the bright sky background + a refractive navy-core metaball that
   breathes, ripples like a waveform, and parallaxes to the pointer.
   Falls back to the CSS .hero-fallback glow if WebGL is unavailable. */
(function () {
  const canvas = document.getElementById('orb-canvas');
  const fallback = document.querySelector('.hero-fallback');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || reduce) { if (fallback) fallback.style.display = 'block'; return; }

  let gl;
  try {
    gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  } catch (e) {}
  if (!gl) { if (fallback) fallback.style.display = 'block'; canvas.style.display = 'none'; return; }

  const vs = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const fs = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;     // -1..1
    uniform float uPulse;     // 0..1 extra energy (mic / hover)
    uniform float uIntro;     // 0..1 reveal

    // brand palette
    const vec3 NAVY  = vec3(0.047,0.137,0.251);
    const vec3 INK   = vec3(0.039,0.102,0.184);
    const vec3 SKY   = vec3(0.310,0.663,0.910);
    const vec3 SKYHI = vec3(0.498,0.784,0.949);
    const vec3 PALE  = vec3(0.863,0.933,0.984);
    const vec3 WHITE = vec3(1.0);
    const vec3 OFF   = vec3(0.953,0.969,0.988);

    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
    float noise(vec3 p){
      vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      float n=mix(mix(mix(hash(i.xy+i.z*37.0),hash(i.xy+vec2(1,0)+i.z*37.0),f.x),
                      mix(hash(i.xy+vec2(0,1)+i.z*37.0),hash(i.xy+vec2(1,1)+i.z*37.0),f.x),f.y),
                  mix(mix(hash(i.xy+(i.z+1.0)*37.0),hash(i.xy+vec2(1,0)+(i.z+1.0)*37.0),f.x),
                      mix(hash(i.xy+vec2(0,1)+(i.z+1.0)*37.0),hash(i.xy+vec2(1,1)+(i.z+1.0)*37.0),f.x),f.y),f.z);
      return n;
    }
    float smin(float a,float b,float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }

    // metaball voice-orb SDF
    float map(vec3 p){
      float t = uTime*0.55;
      float breathe = 0.9 + 0.05*sin(t*1.1) + 0.06*uPulse;
      float d = length(p) - breathe;
      // waveform ripples on the surface
      float w = sin(p.y*7.0 + t*2.2) * sin(p.x*5.0 - t*1.3);
      d += (0.035 + 0.05*uPulse) * w;
      // orbiting satellite blobs -> liquid feel
      vec3 b1 = vec3(0.55*sin(t*0.9), 0.42*cos(t*0.7), 0.30*sin(t*0.5));
      d = smin(d, length(p-b1)-0.34, 0.45);
      vec3 b2 = vec3(-0.5*cos(t*0.6), 0.5*sin(t*1.0+1.5), -0.3*cos(t*0.8));
      d = smin(d, length(p-b2)-0.30, 0.42);
      return d;
    }
    vec3 calcNormal(vec3 p){
      vec2 e=vec2(0.0015,0.0);
      return normalize(vec3(
        map(p+e.xyy)-map(p-e.xyy),
        map(p+e.yxy)-map(p-e.yxy),
        map(p+e.yyx)-map(p-e.yyx)));
    }

    // soft bright studio backdrop
    vec3 background(vec2 uv, vec2 m){
      float v = uv.y;
      vec3 col = mix(PALE, WHITE, smoothstep(-0.2,1.1,v));
      col = mix(col, OFF, smoothstep(0.0,-1.0,v)*0.6);
      // volumetric sky-blue beam following pointer
      vec2 lp = vec2(0.35,0.25) + m*0.25;
      float beam = exp(-pow(length((uv-lp)*vec2(1.0,1.4)),2.0)*1.6);
      col += SKYHI * beam * 0.35;
      // faint dust motes
      float dust = noise(vec3(uv*8.0, uTime*0.05));
      col += WHITE * smoothstep(0.85,1.0,dust) * beam * 0.5;
      return col;
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
      vec2 m = uMouse;

      vec3 bg = background(uv, m);

      // camera — orb sits right-of-center, parallax to pointer
      vec3 ro = vec3(0.0, 0.0, 3.2);
      vec2 off = vec2(0.62, 0.04);
      vec3 rd = normalize(vec3(uv - off + m*0.06, -1.6));

      // raymarch
      float tDist = 0.0; bool hit=false; vec3 pos;
      for(int i=0;i<70;i++){
        pos = ro + rd*tDist;
        float d = map(pos);
        if(d<0.001){ hit=true; break; }
        tDist += d*0.85;
        if(tDist>7.0) break;
      }

      vec3 col = bg;
      if(hit){
        vec3 n = calcNormal(pos);
        vec3 v = -rd;
        float fres = pow(1.0 - max(dot(n,v),0.0), 3.0);

        // refraction: sample background bent by the surface normal
        vec2 ruv = uv + n.xy*0.42;
        vec3 refr = background(ruv*0.9, m);
        // a second, deeper sample for chromatic glass dispersion
        vec3 refrB = background((uv+n.xy*0.5)*0.9, m);
        refr = vec3(refr.r, mix(refr.g,refrB.g,0.5), refrB.b);

        // navy core: thicker center reads deep navy, edges read clear
        float core = smoothstep(0.55, 0.05, length(pos.xy - vec2(0.0)));
        vec3 glass = mix(refr, NAVY, core*0.85);
        glass = mix(glass, INK, core*core*0.5);

        // iridescent sky rim
        vec3 irid = mix(SKY, SKYHI, 0.5+0.5*sin(fres*7.0+uTime));
        glass = mix(glass, irid, fres*0.6);

        // key light specular
        vec3 L = normalize(vec3(-0.4+m.x*0.4, 0.7+m.y*0.4, 0.8));
        vec3 H = normalize(L+v);
        float spec = pow(max(dot(n,H),0.0), 60.0);
        glass += WHITE * spec * 1.1;
        // soft secondary fill highlight
        float spec2 = pow(max(dot(n,normalize(vec3(0.6,-0.2,0.6))),0.0), 14.0);
        glass += SKYHI * spec2 * 0.25;

        // fresnel glow halo bleeding into bg
        col = mix(glass, col, smoothstep(0.0,1.0,0.0)); // glass wins where hit
        col = glass;
      } else {
        // bloom halo around the orb even on miss
        vec2 oc = off;
        float halo = exp(-pow(length(uv-oc)*1.05,2.0)*2.2);
        col += SKYHI * halo * (0.12 + 0.06*uPulse);
      }

      // intro reveal wipe + vignette
      col = mix(OFF, col, clamp(uIntro,0.0,1.0));
      float vig = smoothstep(1.5,0.3,length(uv));
      col = mix(col, col*0.97, (1.0-vig)*0.4);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('shader', gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }
  const vsh = compile(gl.VERTEX_SHADER, vs);
  const fsh = compile(gl.FRAGMENT_SHADER, fs);
  if (!vsh || !fsh) { if (fallback) fallback.style.display = 'block'; canvas.style.display = 'none'; return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res: gl.getUniformLocation(prog, 'uRes'),
    time: gl.getUniformLocation(prog, 'uTime'),
    mouse: gl.getUniformLocation(prog, 'uMouse'),
    pulse: gl.getUniformLocation(prog, 'uPulse'),
    intro: gl.getUniformLocation(prog, 'uIntro'),
  };

  let DPR = Math.min(window.devicePixelRatio || 1, 1.8);
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  // expose a pulse hook (mic / hover delight) for app.js
  window.__orbPulse = 0;

  const start = performance.now();
  let raf;
  function frame(now) {
    const t = (now - start) / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1f(U.time, t);
    gl.uniform2f(U.mouse, mouse.x, mouse.y);
    gl.uniform1f(U.pulse, window.__orbPulse || 0);
    gl.uniform1f(U.intro, Math.min(1, t * 1.4));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  resize();
  raf = requestAnimationFrame(frame);

  // pause when hero off-screen (perf)
  const hero = document.getElementById('hero');
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { if (!raf) raf = requestAnimationFrame(frame); }
        else { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0.02 }).observe(hero);
  }
})();
