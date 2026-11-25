/* =========================================================
   Agropet Animais Amigos – cena 3D do topo (cachorro e gato)
   Usa Three.js (CDN) e as malhas de assets/pets-data.js
   ========================================================= */
(function () {
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.min.js";
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

  async function mount(canvas, opts = {}) {
    const T = await import(THREE_URL);
    const still = !!opts.still;
    const mobile = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
    const SHELLS = opts.shells || (mobile ? 13 : 20);

    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.capture });
    let dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    renderer.setPixelRatio(opts.dpr || dpr);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(24, 1, 0.1, 60);
    const root = new T.Group();
    scene.add(root); root.position.x = -0.06;

    /* ---------- luz ---------- */
    scene.environment = makeEnv();
    scene.environmentIntensity = 0.55;
    scene.add(new T.HemisphereLight(0xfff3df, 0x6b4a1c, 0.85));
    const key = new T.DirectionalLight(0xfff1dc, 2.5);
    key.position.set(-1.7, 5.4, 5.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3.4, bottom: -1.2, near: 1, far: 16 });
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.05; key.shadow.radius = 5;
    scene.add(key);
    const rim = new T.DirectionalLight(0xffc36a, 1.7);
    rim.position.set(3.6, 3.2, -3.5);
    scene.add(rim);
    const rim2 = new T.DirectionalLight(0xd8f0c8, 0.9);
    rim2.position.set(-4, 2, -3);
    scene.add(rim2);

    function makeEnv() {
      const s = new T.Scene();
      s.add(new T.Mesh(new T.SphereGeometry(20, 24, 16), new T.MeshBasicMaterial({ color: 0x6d5a3c, side: T.BackSide })));
      const add = (c, i, x, y, z, w, h) => {
        const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(i), side: T.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
      };
      add(0xfff6e8, 9, -7, 9, 7, 9, 7);
      add(0xffe0b0, 4, 9, 4, 4, 5, 9);
      add(0xffa640, 3, 0, 5, -12, 16, 6);
      add(0xfff3dd, 2.5, 0, 14, 0, 14, 14);
      const p = new T.PMREMGenerator(renderer);
      const rt = p.fromScene(s, 0.04);
      p.dispose();
      return rt.texture;
    }

    /* ---------- malhas com pelagem ---------- */
    const uTime = { value: 0 };
    function decode(d) {
      const bin = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
      const p16 = new Int16Array(bin(d.p)), n8 = new Int8Array(bin(d.n)), c8 = new Uint8Array(bin(d.c)), idx = new Uint16Array(bin(d.i));
      const n = p16.length / 3, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), fur = new Float32Array(n), nor = new Float32Array(n * 3);
      const c = new T.Color();
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) { pos[i * 3 + k] = (p16[i * 3 + k] / 32767) * d.s; nor[i * 3 + k] = n8[i * 3 + k] / 127; }
        c.setRGB(c8[i * 4] / 255, c8[i * 4 + 1] / 255, c8[i * 4 + 2] / 255, T.SRGBColorSpace);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        fur[i] = (c8[i * 4 + 3] / 255) * 1.5;
      }
      return { pos, nor, col, fur, idx };
    }

    const baseMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.5 });
    function furMaterial(len, density) {
      const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, envMapIntensity: 0.6 });
      m.onBeforeCompile = (s) => {
        s.uniforms.uTime = uTime; s.uniforms.uLen = { value: len }; s.uniforms.uDen = { value: density };
        s.vertexShader = "attribute float aShell; attribute float aFur; varying vec3 vObj; varying float vSh; varying float vFur; varying vec3 vVN; varying vec3 vVP; uniform float uTime,uLen;\n" +
          s.vertexShader.replace("#include <begin_vertex>", `
            vec3 transformed = vec3(position);
            vObj = position; vSh = aShell; vFur = aFur;
            float fl = uLen * aFur;
            vec3 comb = vec3(sin(position.y*7.+uTime*1.3)*.10, -.62, .10+sin(position.x*6.+uTime*1.1)*.08);
            vec3 dir = normalize(objectNormal + comb*(.25+.75*aShell));
            transformed += dir * fl * aShell;
            vVN = normalMatrix * objectNormal;
            vVP = (modelViewMatrix*vec4(transformed,1.)).xyz;`);
        s.fragmentShader = `varying vec3 vObj; varying float vSh; varying float vFur; varying vec3 vVN; varying vec3 vVP; uniform float uDen;
          float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
          ` + s.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
            vec3 q = vObj*uDen; q += .35*sin(q.yzx*.21)+.2*sin(q.zxy*.47);
            vec3 ce = floor(q); vec3 fr = fract(q)-.5;
            float r1 = h31(ce), r2 = h31(ce+31.7);
            fr -= (vec3(r1,r2,h31(ce+7.3))-.5)*.55;
            float hgt = .38+.62*r1;
            float rad = .66*(1.-vSh/hgt);
            if (vFur < .03 || vSh > hgt || dot(fr,fr) > rad*rad) discard;
            diffuseColor.rgb *= mix(.52,1.12,smoothstep(0.,.9,vSh)) * (.9+.2*r2);
            float fres = pow(1.-abs(dot(normalize(vVN),normalize(-vVP))),3.);
            diffuseColor.rgb += diffuseColor.rgb*fres*.55*vSh + vec3(.05,.035,.015)*fres*vSh;`);
      };
      return m;
    }
    const furCache = {};
    function part(name, len, den, mirror) {
      const d = part.cache[name] || (part.cache[name] = decode(window.PETS_DATA[name]));
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(d.pos, 3));
      g.setAttribute("normal", new T.BufferAttribute(d.nor, 3));
      g.setAttribute("color", new T.BufferAttribute(d.col, 3));
      g.setIndex(new T.BufferAttribute(d.idx, 1));
      const grp = new T.Group();
      const base = new T.Mesh(g, baseMat);
      base.castShadow = base.receiveShadow = true;
      grp.add(base);
      if (len > 0) {
        const ig = new T.InstancedBufferGeometry();
        ["position", "normal", "color"].forEach((k) => ig.setAttribute(k, g.getAttribute(k)));
        ig.setAttribute("aFur", new T.BufferAttribute(d.fur, 1));
        ig.setIndex(g.index);
        const sh = new Float32Array(SHELLS);
        for (let i = 0; i < SHELLS; i++) sh[i] = (i + 1) / SHELLS;
        ig.setAttribute("aShell", new T.InstancedBufferAttribute(sh, 1));
        ig.instanceCount = SHELLS;
        const key = len + "_" + den;
        const fm = new T.Mesh(ig, furCache[key] || (furCache[key] = furMaterial(len, den)));
        fm.frustumCulled = false; fm.receiveShadow = true;
        grp.add(fm);
        furs.push(ig);
      }
      if (mirror) grp.scale.x = -1;
      return grp;
    }
    part.cache = {};
    const furs = [];

    /* ---------- materiais e peças pequenas ---------- */
    const phys = (c, o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 }, o));
    const matte = (c, o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.8, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new T.Color(0xffe9c8) }, o));
    const mesh = (g, m, parent, x = 0, y = 0, z = 0) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent && parent.add(o); return o; };
    const ball = (r) => new T.SphereGeometry(r, 32, 24);

    function eyeTexture(kind) {
      const c = document.createElement("canvas"); c.width = 512; c.height = 256;
      const x = c.getContext("2d"), cx = 128, cy = 128;
      x.fillStyle = kind === "dog" ? "#180c06" : "#f4ecdc"; x.fillRect(0, 0, 512, 256);
      const R = kind === "dog" ? 58 : 62;
      const g = x.createRadialGradient(cx, cy, 4, cx, cy, R);
      if (kind === "dog") { g.addColorStop(0, "#0c0603"); g.addColorStop(.42, "#120804"); g.addColorStop(.55, "#5a2f12"); g.addColorStop(.82, "#7c4519"); g.addColorStop(1, "#180c06"); }
      else { g.addColorStop(0, "#c9d66a"); g.addColorStop(.5, "#a3bd45"); g.addColorStop(.85, "#5f8a2c"); g.addColorStop(1, "#22301a"); }
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
      if (kind === "cat") { x.fillStyle = "#0c0c08"; x.beginPath(); x.ellipse(cx, cy, 24, 44, 0, 0, 7); x.fill(); }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    }
    function eye(parent, kind, r, x, y, z, lidColor) {
      const g = new T.Group(); g.position.set(x, y, z); parent.add(g);
      const ballG = new T.Group(); g.add(ballG);
      const m = new T.MeshPhysicalMaterial({ map: eyeTexture(kind), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 });
      mesh(ball(r), m, ballG).castShadow = false;
      const hl = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      mesh(ball(r * 0.2), hl, g, -r * 0.3, r * 0.42, r * 0.8).castShadow = false;
      mesh(ball(r * 0.09), hl, g, r * 0.36, -r * 0.2, r * 0.9).castShadow = false;
      const lid = mesh(new T.SphereGeometry(r * 1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matte(lidColor), g);
      lid.castShadow = false;
      g.userData = { lid, ballG };
      return g;
    }
    function setLids(eyes, t) { // 0 aberto, 1 fechado
      eyes.forEach((e) => { e.userData.lid.rotation.x = -0.85 + t * 2.15; });
    }
    function collar(parent, r, tube, color, y, z, tilt) {
      const g = new T.Group(); g.position.set(0, y, z); g.rotation.x = tilt; parent.add(g);
      const t = mesh(new T.TorusGeometry(r, tube, 16, 64), matte(color, { roughness: 0.55 }), g);
      t.rotation.x = Math.PI / 2; t.scale.z = 1.5;
      return g;
    }

    /* ---------- cachorro ---------- */
    const dog = new T.Group(); root.add(dog);
    const dogIn = new T.Group(); dog.add(dogIn);
    const dBody = part("dogBody", 0.095, 46); dogIn.add(dBody);
    const dNeck = new T.Group(); dNeck.position.set(0, 1.72, 0.16); dogIn.add(dNeck);
    const dHead = new T.Group(); dNeck.add(dHead);
    dHead.add(part("dogHead", 0.07, 52));
    const dEars = [1, -1].map((s) => {
      const e = new T.Group(); e.position.set(0.33 * s, 0.3, -0.02); dHead.add(e);
      const g = part("dogEar", 0.06, 54); if (s < 0) g.scale.x = -1; e.add(g); return e;
    });
    const dEyes = [eye(dHead, "dog", 0.098, -0.2, 0.1, 0.355, 0x7a4424), eye(dHead, "dog", 0.098, 0.2, 0.1, 0.355, 0x7a4424)];
    const nose = mesh(ball(0.1), phys(0x1b1310, { roughness: 0.28 }), dHead, 0, -0.005, 0.7); nose.scale.set(1.1, 0.78, 0.72);
    const dJaw = new T.Group(); dJaw.position.set(0, -0.27, 0.36); dHead.add(dJaw);
    dJaw.add(part("dogJaw", 0.03, 60));
    const tongue = new T.Group(); tongue.position.set(0, 0.01, 0.2); dJaw.add(tongue);
    const tg = mesh(new T.CapsuleGeometry(0.072, 0.15, 8, 20), phys(0xea7f7c, { roughness: 0.4 }), tongue, 0, -0.02, 0.07);
    tg.rotation.x = 1.75; tg.scale.set(1, 1, 0.34);
    const dTail = new T.Group(); dTail.position.set(0.0, 0.42, -0.62); dogIn.add(dTail);
    dTail.add(part("dogTail", 0.1, 44));
    const dCol = collar(dogIn, 0.405, 0.05, 0x17632c, 1.4, 0.1, 0.18);
    const tag = mesh(new T.CylinderGeometry(0.085, 0.085, 0.025, 32), new T.MeshPhysicalMaterial({ color: 0xf2b632, metalness: 0.35, roughness: 0.28, clearcoat: 0.6 }), dCol, 0, -0.16, 0.57);
    tag.rotation.x = Math.PI / 2 - 0.3; tag.scale.set(1.25, 1.2, 1.25);

    /* ---------- gato ---------- */
    const cat = new T.Group(); root.add(cat);
    const catIn = new T.Group(); cat.add(catIn);
    catIn.add(part("catBody", 0.075, 54));
    const cNeck = new T.Group(); cNeck.position.set(0, 1.42, 0.12); catIn.add(cNeck);
    const cHead = new T.Group(); cNeck.add(cHead);
    cHead.add(part("catHead", 0.06, 58));
    const cEyes = [eye(cHead, "cat", 0.1, -0.165, 0.05, 0.275, 0x8f8578), eye(cHead, "cat", 0.1, 0.165, 0.05, 0.275, 0x8f8578)];
    const cNose = mesh(ball(0.042), phys(0xe58b80, { roughness: 0.45 }), cHead, 0, -0.045, 0.435); cNose.scale.set(1.15, 0.78, 0.6);
    const wMat = new T.MeshBasicMaterial({ color: 0xfffaf0 });
    [-1, 1].forEach((s) => [0.1, 0, -0.1].forEach((a, i) => {
      const c = new T.CatmullRomCurve3([new T.Vector3(0.1 * s, -0.1 - i * 0.018, 0.41), new T.Vector3(0.28 * s, -0.08 + a * 0.5 - i * 0.02, 0.42), new T.Vector3(0.47 * s, -0.11 + a - i * 0.02, 0.34)]);
      mesh(new T.TubeGeometry(c, 14, 0.0042, 5), wMat, cHead).castShadow = false;
    }));
    const cTail = new T.Group(); cTail.position.set(0.28, 0.14, -0.35); catIn.add(cTail);
    cTail.add(part("catTail", 0.085, 50));
    const cCol = collar(catIn, 0.318, 0.037, 0xd96a00, 1.16, 0.075, 0.16);
    mesh(ball(0.06), new T.MeshPhysicalMaterial({ color: 0xf4d27a, metalness: 0.95, roughness: 0.2 }), cCol, 0, -0.075, 0.345);

    dog.position.set(-0.6, 0.3, -0.08); dog.rotation.y = 0.12;
    cat.position.set(0.74, 0.3, 0.16); cat.rotation.y = -0.2; cat.scale.setScalar(0.98);

    /* ---------- caminha ---------- */
    const bedPts = [[0, 0], [1.32, 0], [1.5, 0.04], [1.6, 0.16], [1.56, 0.3], [1.42, 0.36], [1.2, 0.335], [0, 0.31]].map((p) => new T.Vector2(p[0], p[1]));
    const bed = mesh(new T.LatheGeometry(new T.SplineCurve(bedPts).getPoints(60), 96), matte(0x1c3a1b, { roughness: 0.95, sheen: 0.35, sheenColor: new T.Color(0x6f9c5e) }), root, 0.04, 0, 0);
    bed.scale.set(1.02, 0.95, 0.82); bed.receiveShadow = true;
    const pipe = mesh(new T.TorusGeometry(1.585, 0.03, 12, 128), matte(0xf3e6cf), root, 0.04, 0.17, 0); pipe.rotation.x = Math.PI / 2; pipe.scale.set(1.02, 0.82, 1);
    const ground = new T.Mesh(new T.PlaneGeometry(3.5, 6), new T.ShadowMaterial({ opacity: 0.32, color: 0x4a2400 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);

    /* ---------- objetos flutuantes ---------- */
    const floats = [];
    function boneMesh(mat, s = 1) {
      const g = new T.Group();
      const c = mesh(new T.CapsuleGeometry(0.1, 0.42, 10, 24), mat, g); c.rotation.z = Math.PI / 2;
      [[-1, 1], [-1, -1], [1, 1], [1, -1]].forEach(([a, b]) => mesh(ball(0.135), mat, g, a * 0.29, b * 0.095, 0));
      g.scale.setScalar(s); return g;
    }
    function fishMesh(mat) {
      const g = new T.Group();
      const b = mesh(ball(0.2), mat, g); b.scale.set(1.25, 0.72, 0.4);
      const t = mesh(new T.ConeGeometry(0.17, 0.24, 24), mat, g, -0.31, 0, 0); t.rotation.z = -Math.PI / 2; t.scale.z = 0.35;
      mesh(ball(0.026), phys(0x1b1310), g, 0.14, 0.04, 0.075);
      return g;
    }
    function pawMesh(mat, s = 1) {
      const g = new T.Group();
      const p = mesh(ball(0.2), mat, g, 0, -0.09, 0); p.scale.set(1.15, 0.92, 0.55);
      [[-0.25, 0.1, .32], [-0.095, 0.24, .1], [0.095, 0.24, -.1], [0.25, 0.1, -.32]].forEach(([x, y, r]) => { const t = mesh(ball(0.092), mat, g, x, y, 0); t.scale.set(0.85, 1.12, 0.62); t.rotation.z = r; });
      g.scale.setScalar(s); return g;
    }
    function heartGeo() {
      const s = new T.Shape(); s.moveTo(0, -0.26);
      s.bezierCurveTo(-0.1, -0.16, -0.32, -0.02, -0.32, 0.14); s.bezierCurveTo(-0.32, 0.28, -0.2, 0.34, -0.12, 0.34); s.bezierCurveTo(-0.06, 0.34, 0, 0.3, 0, 0.23);
      s.bezierCurveTo(0, 0.3, 0.06, 0.34, 0.12, 0.34); s.bezierCurveTo(0.2, 0.34, 0.32, 0.28, 0.32, 0.14); s.bezierCurveTo(0.32, -0.02, 0.1, -0.16, 0, -0.26);
      const g = new T.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.06, bevelSegments: 8, curveSegments: 24 }); g.center(); return g;
    }
    const cream = phys(0xf7ead2, { roughness: 0.5 }), orange = phys(0xef8f1c, { roughness: 0.42 }), teal = phys(0x17a090, { roughness: 0.42 }), leaf = phys(0x5f9a4a, { roughness: 0.45 });
    function tennis() {
      const g = new T.Group(); mesh(ball(0.2), teal, g);
      const c = []; for (let i = 0; i <= 80; i++) { const a = (i / 80) * Math.PI * 2; c.push(new T.Vector3(Math.cos(a) * 0.85 + 0.15 * Math.cos(3 * a), Math.sin(a) * 0.85 - 0.15 * Math.sin(3 * a), 0.72 * Math.sin(2 * a)).setLength(0.199)); }
      mesh(new T.TubeGeometry(new T.CatmullRomCurve3(c, true), 120, 0.012, 8, true), phys(0xfff6e5), g); return g;
    }
    function addFloat(o, x, y, z, sp, par, rot) { o.position.set(x, y, z); o.userData = { x, y, z, sp, par, ph: Math.random() * 6, rot }; o.traverse((m) => (m.castShadow = false)); root.add(o); floats.push(o); }
    if (!opts.noFloats) {
      addFloat(boneMesh(cream, 0.8), -1.5, 2.72, -0.6, 0.9, 0.5, [0.2, 0.4, 0.6]);
      addFloat(tennis(), 1.5, 2.3, -0.5, 1.2, 0.7, [0.6, 0.5, 0]);
      addFloat(pawMesh(orange, 0.72), 0.95, 2.95, -1.0, 0.8, 0.35, [0, 0.3, -0.25]);
      const h = new T.Mesh(heartGeo(), phys(0x2f8a45, { roughness: 0.4 })); h.scale.setScalar(0.62); addFloat(h, -1.32, 1.5, 0.35, 1.1, 0.9, [0, 0.5, 0.2]);
    }

    /* ---------- corações ---------- */
    const hearts = []; const hGeo = heartGeo(); const hMats = [phys(0xff7d5c), phys(0xffd9a0), phys(0xfff3e2)];
    function burst(pos, n = 7) {
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(hGeo, hMats[i % 3]); m.position.copy(pos);
        m.userData = { v: new T.Vector3((Math.random() - .5) * 1.7, 1.1 + Math.random() * 1.1, .5 + Math.random() * .5), t: 0, s: 0.16 + Math.random() * 0.16, life: 1.15 + Math.random() * .4 };
        m.scale.setScalar(0.001); root.add(m); hearts.push(m);
      }
    }

    /* ---------- petisco ---------- */
    let treat = null, nextTo = "dog";
    const treatDog = boneMesh(cream, 0.62), treatCat = fishMesh(phys(0xf6b04a, { roughness: .45 }));
    function throwTreat() {
      if (treat) return null;
      const who = nextTo; nextTo = who === "dog" ? "cat" : "dog";
      const o = who === "dog" ? treatDog : treatCat;
      root.add(o); treat = { o, who, t: 0 };
      state[who].alert = 2; return who;
    }

    /* ---------- estado ---------- */
    const mk = () => ({ hop: 0, hopV: 0, sq: 0, sqV: 0, yaw: 0, pitch: 0, roll: 0, alert: 0, blink: 0, nextBlink: 1 + Math.random() * 3, joy: 0, chomp: 0, pyaw: 0, ear: 0, earV: 0, idleT: 0, ix: 0, iy: 0 });
    const state = { dog: mk(), cat: mk() };
    const ptr = { x: 0, y: 0, active: 0 };
    const vec = new T.Vector3(), vec2 = new T.Vector3(), ray = new T.Raycaster(), ndc = new T.Vector2();

    function pet(who) {
      const s = state[who]; s.hopV = who === "dog" ? 3.0 : 2.2; s.sqV = -2.4; s.joy = 1.8;
      (who === "dog" ? dNeck : cNeck).getWorldPosition(vec); vec.y += 0.45; vec.z += 0.5; burst(root.worldToLocal(vec.clone()), 8);
      opts.onPet && opts.onPet(who);
    }
    function hit(cx, cy) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      let best = null, bd = 1e9;
      for (const [who, g, list] of [["dog", dogIn, [[0, 1.8, .2, .62], [0, 1.0, .1, .6], [0, .45, 0, .75]]], ["cat", catIn, [[0, 1.45, .1, .5], [0, .85, 0, .45], [0, .42, 0, .6]]]]) {
        for (const [x, y, z, rad] of list) {
          vec.set(x, y, z); g.localToWorld(vec);
          const sp = new T.Sphere(vec, rad); const p = ray.ray.intersectSphere(sp, vec2);
          if (p) { const d = p.distanceTo(camera.position); if (d < bd) { bd = d; best = who; } }
        }
      }
      return best;
    }
    if (!still) {
      window.addEventListener("pointermove", (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = 3.5; }, { passive: true });
      canvas.addEventListener("pointermove", (e) => { const h = hit(e.clientX, e.clientY); canvas.style.cursor = h ? "pointer" : ""; if (h) state[h].joy = Math.max(state[h].joy, .35); });
      let down = null;
      canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
      canvas.addEventListener("pointerup", (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 12) return; const h = hit(e.clientX, e.clientY); if (h) pet(h); });
    }

    /* ---------- enquadramento ---------- */
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const needH = opts.frameH || 3.2, needW = opts.frameW || 3.62, tan = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(needH / (2 * tan), needW / (2 * tan * camera.aspect));
      const viewH = 2 * tan * dist;
      const cy = viewH / 2 - (opts.floor || 0.42);
      camera.position.set(0, cy + dist * 0.105, dist); camera.lookAt(0, cy, 0);
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(() => { resize(); if (still || paused) frame(0); }); ro.observe(canvas);

    /* ---------- animação ---------- */
    function lookTarget(neck, s, dt, t, who) {
      neck.getWorldPosition(vec); const world = vec.clone(); vec.project(camera);
      let tx, ty;
      if (treat) {
        treat.o.getWorldPosition(vec2); vec2.project(camera); tx = (vec2.x - vec.x) * 1.5; ty = (vec2.y - vec.y) * 1.5;
      } else if (ptr.active > 0) {
        const r = canvas.getBoundingClientRect();
        const px = ((ptr.x - r.left) / r.width) * 2 - 1, py = -((ptr.y - r.top) / r.height) * 2 + 1;
        tx = (px - vec.x) * 0.75; ty = (py - vec.y) * 0.62;
      } else {
        s.idleT -= dt; if (s.idleT <= 0) { s.idleT = 1.6 + Math.random() * 2.6; s.ix = (Math.random() - .5) * 1.3; s.iy = (Math.random() - .45) * .5; if (Math.random() < .3) { s.ix = who === "dog" ? .8 : -.9; s.iy = who === "dog" ? -.1 : .25; } }
        tx = s.ix; ty = s.iy;
      }
      const yaw = clamp(tx * 0.8, -0.75, 0.75), pitch = clamp(-ty * 0.62, -0.48, 0.42);
      s.pyaw = s.yaw;
      s.yaw = damp(s.yaw, yaw, 5, dt); s.pitch = damp(s.pitch, pitch, 5, dt);
      s.roll = damp(s.roll, -s.yaw * 0.16 + (s.joy > 0 ? Math.sin(t * 9) * 0.09 : 0) + (s.alert > 0 ? 0.16 * (who === "dog" ? 1 : -1) : 0), 6, dt);
    }
    let t = 0, last = 0, running = false, paused = true, raf = 0;

    function frame(dt) {
      t += dt; uTime.value = t; ptr.active -= dt;
      for (const who of ["dog", "cat"]) {
        const s = state[who], g = who === "dog" ? dogIn : catIn;
        s.joy = Math.max(0, s.joy - dt); s.alert = Math.max(0, s.alert - dt); s.chomp = Math.max(0, s.chomp - dt);
        s.hopV -= 11 * dt; s.hop += s.hopV * dt; if (s.hop < 0) { if (s.hopV < -1.4) s.sqV -= 1.3; s.hop = 0; s.hopV = 0; }
        s.sqV += (-s.sq * 170 - s.sqV * 12) * dt; s.sq = clamp(s.sq + s.sqV * dt, -.16, .16);
        const br = Math.sin(t * (who === "dog" ? 2.6 : 1.9)) * 0.008;
        g.position.y = s.hop; g.scale.set(1 - s.sq * .5 - br * .4, 1 + s.sq + br, 1 - s.sq * .5 + br);
        s.nextBlink -= dt; if (s.nextBlink < 0) { s.blink = 1; s.nextBlink = (who === "cat" ? 2.4 : 1.8) + Math.random() * 3.6; }
        s.blink = Math.max(0, s.blink - dt * (who === "cat" ? 3.2 : 6));
        const lid = Math.max(Math.sin(s.blink * Math.PI), s.joy > .5 ? (who === "cat" ? .82 : .4) : 0);
        setLids(who === "dog" ? dEyes : cEyes, lid);
        lookTarget(who === "dog" ? dNeck : cNeck, s, dt, t, who);
        const n = who === "dog" ? dNeck : cNeck;
        n.rotation.set(s.pitch - s.alert * .03, s.yaw, s.roll, "YXZ");
        n.position.z = (who === "dog" ? 0.16 : 0.12) + Math.abs(s.pitch) * .04;
        const av = dt > 0 ? (s.yaw - s.pyaw) / dt : 0;
        s.earV += (-(s.ear) * 90 - s.earV * 9 - av * 14 - s.hopV * 1.2) * dt; s.ear = clamp(s.ear + s.earV * dt, -.7, .7);
      }
      const ds = state.dog, cs = state.cat;
      dEars.forEach((e, i) => { const sgn = i ? -1 : 1; e.rotation.z = sgn * (0.1 + Math.abs(ds.ear) * .25 + (ds.alert > 0 ? .34 : 0) + ds.hop * .9) + ds.ear * .3; e.rotation.x = ds.ear * .15; });
      dTail.rotation.z = Math.sin(t * (ds.joy > 0 || ds.alert > 0 ? 17 : 8)) * (ds.joy > 0 || ds.alert > 0 ? .62 : .36); dTail.rotation.x = -.12;
      const pant = .5 + .5 * Math.sin(t * 7.5);
      const open = ds.chomp > 0 ? .5 + .5 * Math.sin(t * 34) : (ds.alert > 0 && treat && treat.who === "dog" ? 1.25 : .52 + pant * .24);
      dJaw.rotation.x = .1 + open * .34; tongue.scale.set(1, 1, ds.chomp > 0 ? .45 : .86 + pant * .22); tongue.rotation.x = .12 + pant * .12;
      cTail.rotation.y = Math.sin(t * 1.7) * .22; cTail.rotation.z = Math.sin(t * 1.3 + 1) * .1; cTail.rotation.x = Math.sin(t * 1.1) * .12;

      floats.forEach((o) => {
        const u = o.userData, px = ptr.active > 0 ? (ptr.x / innerWidth - .5) : 0, py = ptr.active > 0 ? (ptr.y / innerHeight - .5) : 0;
        u.ox = damp(u.ox || 0, px * u.par * .45, 4, dt); u.oy = damp(u.oy || 0, -py * u.par * .3, 4, dt);
        o.position.set(u.x + u.ox, u.y + Math.sin(t * u.sp + u.ph) * .09 + u.oy, u.z);
        o.rotation.set(u.rot[0] + Math.sin(t * u.sp * .7 + u.ph) * .28, u.rot[1] + Math.sin(t * u.sp * .5 + u.ph) * .5, u.rot[2] + Math.sin(t * u.sp * .6) * .14);
      });
      for (let i = hearts.length - 1; i >= 0; i--) {
        const m = hearts[i], u = m.userData; u.t += dt; if (u.t > u.life) { root.remove(m); hearts.splice(i, 1); continue; }
        u.v.y -= .5 * dt; u.v.x *= 1 - 1.2 * dt; m.position.addScaledVector(u.v, dt);
        const k = u.t / u.life; m.scale.setScalar(u.s * Math.min(1, u.t * 9) * (k > .7 ? (1 - k) / .3 : 1)); m.rotation.y = Math.sin(u.t * 6) * .6; m.rotation.z = Math.sin(u.t * 4) * .25;
      }
      if (treat) {
        treat.t += dt / 0.95; const k = Math.min(1, treat.t);
        const n = treat.who === "dog" ? dNeck : cNeck;
        vec.set(0, treat.who === "dog" ? -.2 : -.14, treat.who === "dog" ? .78 : .5); n.localToWorld(vec); root.worldToLocal(vec);
        const sx = treat.who === "dog" ? 1.9 : -1.9;
        treat.o.position.set(sx + (vec.x - sx) * k, .1 + (vec.y - .1) * k + Math.sin(k * Math.PI) * 1.25, 2.2 + (vec.z - 2.2) * k);
        treat.o.rotation.set(k * 5, k * 4, k * 9); treat.o.scale.setScalar((treat.who === "dog" ? .62 : .9) * (k > .92 ? (1 - k) / .08 : 1) + .001);
        if (k > .72 && !treat.hop) { treat.hop = 1; state[treat.who].hopV = treat.who === "dog" ? 2.7 : 2.2; }
        if (k >= 1) {
          const who = treat.who; root.remove(treat.o); treat = null; const s = state[who]; s.chomp = 1; s.joy = 2; s.alert = 0; s.sqV = -1.6;
          (who === "dog" ? dNeck : cNeck).getWorldPosition(vec); vec.y += .3; vec.z += .6; burst(root.worldToLocal(vec.clone()), 9);
          opts.onTreat && opts.onTreat(who);
        }
      }
      renderer.render(scene, camera);
    }

    let slow = 0, frames = 0;
    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0.016; last = now;
      frame(dt);
      // reduz a qualidade sozinho em aparelhos lentos
      frames++; if (frames > 20 && frames < 400) {
        slow = slow * .94 + dt * .06;
        if (frames % 40 === 0 && slow > 0.028) {
          if (dpr > 1.05) { dpr = Math.max(1, dpr - .35); renderer.setPixelRatio(dpr); resize(); }
          else furs.forEach((g) => { g.instanceCount = Math.max(8, g.instanceCount - 4); });
        }
      }
    }
    function play() { if (running || still) return; running = true; paused = false; last = 0; raf = requestAnimationFrame(loop); }
    function pause() { running = false; paused = true; cancelAnimationFrame(raf); }

    resize(); setLids(dEyes, 0); setLids(cEyes, 0);
    if (opts.pose) opts.pose({ state, ptr, dog, cat, bed, pipe, ground, root, camera, scene, key });
    frame(0.016); frame(0.016);
    return { play, pause, pet, throwTreat, frame, resize, renderer, scene, camera, state, THREE: T, parts: { dog, cat, bed, pipe, ground, root } };
  }

  window.AgropetPets = { mount };
})();
