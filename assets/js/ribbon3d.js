/* PI Champion S2 — lightweight self-contained WebGL ribbon scene.
 * Decorative only: the entire application works without WebGL.
 * No external dependencies, no tracking, no network calls.
 */
(() => {
  'use strict';
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = null;
  let active = true;
  const scene = { sync };
  window.PIChampionRibbon3D = scene;

  function sync() {
    const node = document.querySelector('canvas[data-ribbon-scene]');
    if (current && current.node === node) return;
    if (current) { current.dispose(); current = null; }
    if (!node || reduced()) return;
    const gl = node.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    try { current = createScene(gl, node, node.dataset.ribbonScene === 'stage'); }
    catch (err) { console.warn('Ribbon fallback active:', err); current = null; }
  }
  function compile(gl, type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function createScene(gl, node, stage) {
    const vertex = `
      attribute vec2 uv;
      uniform float time; uniform float aspect; uniform float isStage;
      varying vec3 P; varying vec2 U; varying float shade;
      void main(){
        float x=uv.x; float v=uv.y-0.5;
        float t=time*0.11;
        float curve=sin(x*4.5-1.0+t)*0.26+sin(x*8.3+0.5-t*0.55)*0.035;
        float width=0.14+0.16*sin(x*3.14159);
        float px=mix(-1.48,1.53,x);
        float py=-0.27 + 0.56*x + curve + v*width*cos(x*7.0+0.3+t);
        float pz=0.2*sin(x*5.2+t) + v*(0.58*sin(x*5.0-0.4+t)+0.24);
        if(isStage>0.5){
          py=-0.47 + 0.42*sin(x*4.9-0.6+t*0.55) + v*width*1.9*cos(x*7.1+t);
          px=mix(-1.65,1.65,x);
          pz=0.25*sin(x*5.3+t)+v*(0.9*sin(x*5.8+t));
        }
        vec3 p=vec3(px,py,pz);
        P=p; U=uv;
        shade=0.52+0.48*sin(uv.y*3.2+uv.x*3.7);
        gl_Position=vec4(p.x, p.y, clamp(-p.z*0.13,-0.9,0.9),1.0);
      }`;
    const fragment = `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      uniform float time; uniform float isStage;
      varying vec3 P; varying vec2 U; varying float shade;
      void main(){
        vec3 dpdx=dFdx(P); vec3 dpdy=dFdy(P);
        vec3 normal=normalize(cross(dpdx,dpdy));
        vec3 light=normalize(vec3(-0.58,0.90,1.4));
        float lit=0.45+0.55*abs(dot(normal,light));
        float spec=pow(max(0.0,dot(reflect(-light,normal),normalize(vec3(0.1,0.2,1.0)))),22.0);
        float edge=pow(abs(U.y-0.5)*2.0,4.0);
        float lines=0.5+0.5*cos(U.y*122.0+U.x*5.0);
        float fine=0.5+0.5*cos(U.y*235.0-U.x*10.0);
        float glow=pow(max(0.0,1.0-abs(U.y-0.75)*3.0),7.0);
        vec3 emerald=vec3(0.008,0.24,0.13);
        vec3 jade=vec3(0.04,0.56,0.24);
        vec3 bright=vec3(0.56,0.92,0.43);
        vec3 col=mix(emerald,jade,smoothstep(0.02,0.9,U.y)*0.8);
        col=mix(col,bright,clamp(spec*1.2 + glow*.32 + edge*.20,0.0,0.87));
        col*=0.78+0.29*lit;
        col+=vec3(0.05,0.12,0.02)*lines*.20+vec3(0.07,0.10,0.03)*fine*.06;
        col+=vec3(0.26,0.30,0.13)*spec*0.43;
        float alpha=0.39+0.35*lit;
        alpha*=smoothstep(0.0,0.075,U.x)*(1.0-smoothstep(0.925,1.0,U.x));
        if(isStage>0.5){col*=1.18;alpha=min(0.95,alpha*1.45);}
        gl_FragColor=vec4(col,alpha);
      }`;
    const vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment);
    const prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));
    const vertices=[];const indices=[];const nx=128,ny=20;
    for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++)vertices.push(i/nx,j/ny);
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const a=i*(ny+1)+j,b=a+(ny+1);indices.push(a,b,a+1,b,b+1,a+1);}
    const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    gl.useProgram(prog); const loc=gl.getAttribLocation(prog,'uv');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const timeLoc=gl.getUniformLocation(prog,'time'),aspectLoc=gl.getUniformLocation(prog,'aspect'),stageLoc=gl.getUniformLocation(prog,'isStage');
    gl.uniform1f(stageLoc,stage?1:0);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    let frame=0,last=0,disposed=false;
    function draw(now){if(disposed)return;
      frame=requestAnimationFrame(draw);
      if(document.hidden || !active || now-last<33) return;
      last=now;
      const rect=node.getBoundingClientRect();
      if(rect.width<1||rect.height<1)return;
      const dpr=Math.min(window.devicePixelRatio||1,1.5);
      const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
      if(node.width!==w||node.height!==h){node.width=w;node.height=h;gl.viewport(0,0,w,h);}
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLoc,now/1000);
      gl.uniform1f(aspectLoc,rect.width/rect.height);
      gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }
    frame=requestAnimationFrame(draw);
    const vis=()=>{active=!document.hidden;};document.addEventListener('visibilitychange',vis);
    return {node,dispose(){disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',vis);gl.deleteBuffer(vbo);gl.deleteBuffer(ibo);gl.deleteProgram(prog);gl.deleteShader(vs);gl.deleteShader(fs);}};
  }
  window.addEventListener('pagehide',()=>{if(current){current.dispose();current=null;}});
})();
