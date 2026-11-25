/* =========================================================
   Agropet Animais Amigos – landing page
   ---------------------------------------------------------
   CONFIGURAÇÃO: tudo o que pode precisar ser trocado está aqui.
   ========================================================= */
const CONFIG = {
  // ID do Meta Pixel. Deixe "" para desligar.
  META_PIXEL_ID: "",

  // Evento enviado em cada botão (data-track="..." no index.html)
  EVENTOS: {
    whatsapp: { nome: "Contact", standard: true },
    servico: { nome: "Contact", standard: true },
    banho: { nome: "Contact", standard: true },
    racao: { nome: "Contact", standard: true },
    tele: { nome: "Contact", standard: true },
    maps: { nome: "FindLocation", standard: true },
    waze: { nome: "FindLocation", standard: true },
    vip: { nome: "GrupoVIP", standard: false },
    instagram: { nome: "ClickInstagram", standard: false },
    avaliacoes: { nome: "ClickAvaliacoes", standard: false },
  },

  WHATSAPP: "5551999852076",

  // Horário (0 = domingo ... 6 = sábado). null = fechado.
  HORARIO: { 0: null, 1: ["10:00", "19:00"], 2: ["10:00", "19:00"], 3: ["10:00", "19:00"], 4: ["10:00", "19:00"], 5: ["10:00", "19:00"], 6: ["10:00", "19:00"] },
  FUSO: "America/Sao_Paulo",

  // Dia da tele grátis (2 = terça)
  DIA_TELE: 2,
};

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const REDUZ = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOUSE = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------------- Meta Pixel ---------------- */
if (CONFIG.META_PIXEL_ID) {
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  fbq("init", CONFIG.META_PIXEL_ID);
  fbq("track", "PageView");
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-track]");
  const ev = a && CONFIG.EVENTOS[a.dataset.track];
  if (ev && window.fbq) fbq(ev.standard ? "track" : "trackCustom", ev.nome, { origem: a.dataset.track });
});

/* ---------------- Links de WhatsApp com mensagem pronta ---------------- */
$$("[data-wa]").forEach((a) => {
  a.href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(a.dataset.wa)}`;
  a.target = "_blank";
  a.rel = "noopener";
});

/* ---------------- Horário: aberto/fechado ---------------- */
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function agora() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { dia: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), min: +p.hour * 60 + +p.minute };
}
const emMin = (h) => +h.split(":")[0] * 60 + +h.split(":")[1];
const bonito = (h) => h.replace(/^0/, "").replace(":00", "h").replace(":", "h");
function atualizaHorario() {
  const { dia, min } = agora();
  const hoje = CONFIG.HORARIO[dia];
  let txt, aberto = false;
  if (hoje && min >= emMin(hoje[0]) && min < emMin(hoje[1])) { aberto = true; txt = `Aberto agora, até as ${bonito(hoje[1])}`; }
  else if (hoje && min < emMin(hoje[0])) txt = `Fechado agora, abre hoje às ${bonito(hoje[0])}`;
  else {
    for (let i = 1; i <= 7; i++) {
      const d = (dia + i) % 7, h = CONFIG.HORARIO[d];
      if (h) { txt = `Fechado agora, abre ${i === 1 ? "amanhã" : DIAS[d]} às ${bonito(h[0])}`; break; }
    }
  }
  $$("[data-status]").forEach((el) => { el.classList.toggle("on", aberto); $("span", el).textContent = txt; });
  $("#horas").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const h = CONFIG.HORARIO[d];
    return `<li class="${d === dia ? "hoje" : ""}"><span>${DIAS[d]}${d === dia ? " (hoje)" : ""}</span><b>${h ? bonito(h[0]) + " às " + bonito(h[1]) : "fechado"}</b></li>`;
  }).join("");
  const falta = (CONFIG.DIA_TELE - dia + 7) % 7;
  const fechou = falta === 0 && hoje && min >= emMin(hoje[1]);
  $("#teleDia").textContent = falta === 0 && !fechou ? "É hoje!" : falta === 1 ? "É amanhã!" : `Próxima em ${fechou ? 7 : falta} dias`;
}
atualizaHorario();
setInterval(atualizaHorario, 60000);
$("#ano").textContent = new Date().getFullYear();

/* ---------------- Estrelas ---------------- */
$$(".estrelas").forEach((e) => { e.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.500L12 17.400 6.100 20.600l1.200-6.500L2.500 9.500l6.600-.9z"/></svg>'.repeat(5); });

/* ---------------- Copiar endereço ---------------- */
$("#copiar").addEventListener("click", async () => {
  const t = $("#endereco").textContent, s = $("#copiar span");
  try { await navigator.clipboard.writeText(t); s.textContent = "Endereço copiado"; }
  catch { const r = document.createRange(); r.selectNodeContents($("#endereco")); getSelection().removeAllRanges(); getSelection().addRange(r); s.textContent = "Endereço selecionado, agora é só copiar"; }
  setTimeout(() => (s.textContent = "Copiar endereço"), 2600);
});

/* ---------------- Cabeçalho ao rolar ---------------- */
const topo = $("#topo");
const aoRolar = () => topo.classList.toggle("topo--fixo", scrollY > 30);
aoRolar();
addEventListener("scroll", aoRolar, { passive: true });

/* ---------------- Entradas ---------------- */
$$("[data-rv-grupo]").forEach((g) => [...g.children].forEach((c, i) => { c.setAttribute("data-rv", ""); c.style.setProperty("--d", i * 70 + "ms"); }));
const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("ok"); rv.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
$$("[data-rv]").forEach((el) => (REDUZ ? el.classList.add("ok") : rv.observe(el)));

/* ---------------- Faixa rolante ---------------- */
{ const f = $("#faixa"), base = f.innerHTML; f.innerHTML = base.repeat(3); f.innerHTML += f.innerHTML; }

/* ---------------- Cartões que inclinam em 3D ---------------- */
if (MOUSE && !REDUZ) {
  $$("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", (x * 16).toFixed(2) + "deg");
      el.style.setProperty("--rx", (-y * 14).toFixed(2) + "deg");
      el.style.setProperty("--px", (x * 22).toFixed(1) + "px");
      el.style.setProperty("--py", (y * 18).toFixed(1) + "px");
    });
    el.addEventListener("pointerleave", () => ["--rx", "--ry", "--px", "--py"].forEach((k) => el.style.removeProperty(k)));
  });
  const fotos = $("#fotos");
  fotos.addEventListener("pointermove", (e) => {
    const r = fotos.getBoundingClientRect();
    fotos.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    fotos.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  fotos.addEventListener("pointerleave", () => { fotos.style.removeProperty("--mx"); fotos.style.removeProperty("--my"); });
}

/* ---------------- Bolhas do banho ---------------- */
(function bolhas() {
  const box = $("#bolhas");
  if (REDUZ) return;
  let vivo = false, timer;
  function nova() {
    if (!vivo || document.hidden || $$(".bolha", box).length > 13) return;
    const b = document.createElement("span"), t = 22 + Math.random() * 54;
    b.className = "bolha"; b.setAttribute("aria-hidden", "true");
    b.style.cssText = `--t:${t}px;left:${4 + Math.random() * 84}%;--x:${(Math.random() - 0.5) * 90}px;--dur:${6 + Math.random() * 5}s`;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (b.classList.contains("poc")) return;
      const r = b.getBoundingClientRect(), p = box.getBoundingClientRect();
      b.style.left = r.left - p.left + "px"; b.style.top = r.top - p.top + "px"; b.style.bottom = "auto";
      b.classList.add("poc");
      setTimeout(() => b.remove(), 380);
    });
    b.addEventListener("animationend", (e) => { if (e.animationName === "sobe") b.remove(); });
    box.appendChild(b);
  }
  new IntersectionObserver(([e]) => {
    vivo = e.isIntersecting; clearInterval(timer);
    if (vivo) { for (let i = 0; i < 5; i++) setTimeout(nova, i * 240); timer = setInterval(nova, 620); }
  }, { threshold: 0.1 }).observe(box);
})();

/* ---------------- Trilha de patinhas + van (ligadas à rolagem) ---------------- */
(function rolagem() {
  const trilha = $("#trilha"), van = $("#van"), secao = $("#banho"), card = $(".tele__card");
  let patas = [];
  function monta() {
    const w = secao.clientWidth, h = secao.clientHeight, n = Math.max(12, Math.round(w / 84));
    trilha.innerHTML = ""; patas = [];
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", w > 820 ? `M-30 ${h * 0.915} C ${w * 0.2} ${h * 0.975}, ${w * 0.36} ${h * 0.89}, ${w * 0.5} ${h * 0.925} S ${w * 0.8} ${h * 0.96}, ${w + 30} ${h * 0.86}` : `M-20 ${h - 46} C ${w * 0.3} ${h - 10}, ${w * 0.6} ${h - 84}, ${w + 20} ${h - 40}`);
    p.setAttribute("fill", "none"); svg.appendChild(p); trilha.appendChild(svg);
    const L = p.getTotalLength(), s = w > 820 ? 34 : 24;
    for (let i = 0; i < n; i++) {
      const d = (i + 0.5) / n * L, a = p.getPointAtLength(d), b = p.getPointAtLength(d + 2);
      const ang = Math.atan2(b.y - a.y, b.x - a.x), lado = i % 2 ? 1 : -1;
      const g = document.createElementNS(ns, "g"), u = document.createElementNS(ns, "use");
      u.setAttribute("href", "#pata"); u.setAttribute("width", s); u.setAttribute("height", s); u.setAttribute("x", -s / 2); u.setAttribute("y", -s / 2);
      g.setAttribute("transform", `translate(${a.x - Math.sin(ang) * lado * s * 0.5} ${a.y + Math.cos(ang) * lado * s * 0.5}) rotate(${(ang * 180) / Math.PI + 90 + lado * 8})`);
      const g2 = document.createElementNS(ns, "g"); g2.setAttribute("class", "pegada"); g2.appendChild(u); g.appendChild(g2); svg.appendChild(g); patas.push(g2);
    }
    passo();
  }
  let pend = false;
  function passo() {
    pend = false;
    const vh = innerHeight, r = secao.getBoundingClientRect();
    const k = REDUZ ? 1 : Math.min(1, Math.max(0, (vh * 1.02 - (r.top + r.height * 0.55)) / (r.height * 0.5 + vh * 0.3)));
    patas.forEach((p, i) => p.classList.toggle("on", i / patas.length < k));
    const c = card.getBoundingClientRect();
    const q = REDUZ ? 0.62 : Math.min(1, Math.max(0, (vh - c.top) / (vh + c.height)));
    van.style.setProperty("--v", q.toFixed(3));
  }
  addEventListener("scroll", () => { if (!pend) { pend = true; requestAnimationFrame(passo); } }, { passive: true });
  let tm; new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(monta, 120); }).observe(secao);
})();

/* ---------------- Palco 3D ---------------- */
(function palco() {
  const palco = $("#palco"), canvas = $("#pets"), btn = $("#petisco"), balao = $("#balao"), dica = $("#dica");
  const FALAS = {
    dog: { carinho: ["Au au!", "De novo, de novo!", "Esse cafuné é bom demais!", "Posso ir tomar banho?"], petisco: ["Nhac! Quero mais!", "O melhor petisco do Cristal!", "Au! Que delícia!"] },
    cat: { carinho: ["Miau!", "Prrrr...", "Tá, pode continuar.", "Só mais um pouquinho."], petisco: ["Nham! Aprovado.", "Miau! Mais um?", "Esse peixinho, sim."] },
  };
  const vez = {}; let tBalao, tirouDica = false;
  function fala(quem, tipo) {
    const l = FALAS[quem][tipo], k = quem + tipo; vez[k] = (vez[k] ?? -1) + 1;
    balao.textContent = l[vez[k] % l.length];
    balao.className = "balao balao--" + quem; balao.hidden = false;
    void balao.offsetWidth; balao.classList.add("on");
    clearTimeout(tBalao); tBalao = setTimeout(() => balao.classList.remove("on"), 2100);
    if (!tirouDica) { tirouDica = true; dica.classList.add("fim"); }
  }
  function temWebGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2")); } catch { return false; } }
  if (!temWebGL() || (navigator.connection && navigator.connection.saveData)) { dica.remove(); return; }

  const carrega = (src) => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  async function inicia() {
    try {
      await Promise.all([carrega("assets/pets-data.js"), carrega("assets/pets3d.js")]);
      const cena = await AgropetPets.mount(canvas, { still: REDUZ, onPet: (q) => fala(q, "carinho"), onTreat: (q) => fala(q, "petisco") });
      palco.classList.add("palco--3d");
      if (REDUZ) { dica.remove(); return; }
      btn.hidden = false; dica.classList.add("on");
      btn.addEventListener("click", () => cena.throwTreat());
      let visivel = true;
      const ajusta = () => (visivel && !document.hidden ? cena.play() : cena.pause());
      new IntersectionObserver(([e]) => { visivel = e.isIntersecting; ajusta(); }, { threshold: 0.02 }).observe(palco);
      document.addEventListener("visibilitychange", ajusta);
      setTimeout(() => dica.classList.add("fim"), 9000);
    } catch (err) { console.warn("3D indisponível, usando a imagem.", err); dica.remove(); }
  }
  if ("requestIdleCallback" in window) requestIdleCallback(inicia, { timeout: 1500 }); else setTimeout(inicia, 500);
})();
