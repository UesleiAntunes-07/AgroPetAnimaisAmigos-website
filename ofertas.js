/* =========================================================
   Agropet Animais Amigos – vitrine de ofertas e carrinho
   ---------------------------------------------------------
   O carrinho não faz pagamento: o botão "Comprar pelo WhatsApp"
   abre a conversa com a lista de produtos já escrita.
   Usa CONFIG, $, $$ e REDUZ de script.js.
   ========================================================= */
const LOJA = {
  // Endereço que devolve o catálogo em JSON (painel/admin). Vazio = usa assets/catalogo-exemplo.js
  CATALOGO_URL: "",
  // Onde o carrinho fica salvo no aparelho da pessoa
  CHAVE: "agropet-carrinho-v1",
  // Quantos produtos aparecem antes do "Ver mais"
  INICIAIS_CELULAR: 6,
  INICIAIS_COMPUTADOR: 8,
};

(function loja() {
  const CEL = matchMedia("(max-width: 760px)");
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const R$ = (v) => brl.format(v).replace(/ /g, " ");
  const num = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const hojeISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.FUSO }).format(new Date());
  const waLink = (txt) => `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(txt)}`;
  const pixel = (ev, dados) => { if (window.fbq) fbq("track", ev, Object.assign({ currency: "BRL" }, dados)); };
  function dataCurta(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  }

  /* ---------- Regras de preço ---------- */
  const emPromo = (p, o) => !!(o && o.promo && o.promo < o.preco && (!p.promo_ate || hojeISO() <= p.promo_ate));
  const precoDe = (p, o) => (emPromo(p, o) ? o.promo : o.preco);
  const temOferta = (p) => !p.consulta && !p.esgotado && p.opcoes.some((o) => emPromo(p, o));
  const vendavel = (p) => p && !p.consulta && !p.esgotado;
  const kg = (p) => p.unidade === "kg";
  const passoDe = (p) => (kg(p) ? p.passo || 0.5 : 1);
  const qtdTxt = (p, q) => (kg(p) ? `${num(q)} kg` : String(q));
  const sufixo = (p) => (kg(p) ? "/kg" : "");

  /* ---------- Estado ---------- */
  let CAT = null;
  const PROD = new Map();
  const ui = { aba: "ofertas", pet: "", cat: "", busca: "", limite: 0, escolha: {} };
  const guarda = {
    ler() { try { return JSON.parse(localStorage.getItem(LOJA.CHAVE)) || null; } catch { return null; } },
    salvar(v) { try { localStorage.setItem(LOJA.CHAVE, JSON.stringify(v)); } catch { /* sem armazenamento: o carrinho vale só nesta visita */ } },
  };
  const cart = Object.assign({ itens: [], entrega: "retirar", bairro: "", nome: "", obs: "" }, guarda.ler() || {});
  if (!Array.isArray(cart.itens)) cart.itens = [];
  let removidos = 0;
  const salva = () => guarda.salvar(cart);

  const el = {
    vitrine: $("#vitrine"), filtros: $("#filtros"), busca: $("#busca"), mais: $("#verMais"), aviso: $("#avisoExemplo"),
    abas: $$(".aba"), qtdTopo: $("#qtdTopo"), barra: $("#sacolaBarra"), sbQtd: $("#sbQtd"), sbTotal: $("#sbTotal"), sbItens: $("#sbItens"),
    gaveta: $("#gaveta"), corpo: $("#gavetaCorpo"), pe: $("#gavetaPe"), ficha: $("#ficha"), fichaPainel: $("#fichaPainel"), fala: $("#avisoCarrinho"),
  };

  /* ---------- Catálogo ---------- */
  async function carrega() {
    if (LOJA.CATALOGO_URL) {
      const r = await fetch(LOJA.CATALOGO_URL, { cache: "no-store" });
      if (!r.ok) throw new Error("catálogo " + r.status);
      return r.json();
    }
    if (window.AGROPET_CATALOGO) return window.AGROPET_CATALOGO;
    throw new Error("sem catálogo");
  }
  function prepara(c) {
    c.categorias = c.categorias || [];
    c.produtos = (c.produtos || []).filter((p) => p && p.id && p.ativo !== false && Array.isArray(p.opcoes) && p.opcoes.length);
    c.produtos.forEach((p) => {
      p.pet = p.pet || [];
      p.opcoes.forEach((o) => { o.preco = +o.preco || 0; o.promo = o.promo ? +o.promo : 0; });
      PROD.set(p.id, p);
    });
    // Itens guardados no aparelho que não existem mais
    const antes = cart.itens.length;
    cart.itens = cart.itens.filter((it) => { const p = PROD.get(it.id); return p && p.opcoes[it.op] && it.qtd > 0; });
    removidos = antes - cart.itens.length;
    if (removidos) salva();
    return c;
  }
  const catNome = (id) => (CAT.categorias.find((c) => c.id === id) || {}).nome || "";

  /* ---------- Vitrine ---------- */
  function lista(aba = ui.aba, comFiltro = true) {
    let l = CAT.produtos.slice();
    if (aba === "ofertas") l = l.filter(temOferta);
    if (comFiltro) {
      const q = norm(ui.busca);
      if (ui.pet) l = l.filter((p) => p.pet.includes(ui.pet));
      if (ui.cat) l = l.filter((p) => p.categoria === ui.cat);
      if (q) l = l.filter((p) => norm([p.nome, p.marca, p.descricao, catNome(p.categoria), p.codigo].join(" ")).includes(q));
    }
    return l.sort((a, b) => (a.esgotado ? 1 : 0) - (b.esgotado ? 1 : 0) || (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || (a.ordem ?? 999) - (b.ordem ?? 999));
  }
  const pets = (p) => (p.pet.length === 1 ? (p.pet[0] === "cao" ? " · Cães" : " · Gatos") : p.pet.length > 1 ? " · Cães e gatos" : "");

  function precoHTML(p, o) {
    if (p.consulta) return `<p class="preco preco--consulta">Preço sob consulta</p>`;
    const u = sufixo(p) ? `<small>${sufixo(p)}</small>` : "";
    if (emPromo(p, o)) {
      return `<p class="preco"><span class="sr">De</span><s>${R$(o.preco)}</s><span class="sr">por</span><b>${R$(o.promo)}${u}</b>${p.promo_ate ? `<span class="preco__ate">Oferta até ${dataCurta(p.promo_ate)}</span>` : ""}</p>`;
    }
    return `<p class="preco"><b>${R$(o.preco)}${u}</b></p>`;
  }
  function opcoesHTML(p, i) {
    if (p.opcoes.length < 2) return p.opcoes[0].nome ? `<p class="prod__op1">${esc(p.opcoes[0].nome)}</p>` : "";
    return `<div class="ops" role="radiogroup" aria-label="${esc(p.variacao || "Opção")}">${p.opcoes
      .map((o, k) => `<button type="button" role="radio" data-op="${k}" aria-checked="${k === i}" tabindex="${k === i ? 0 : -1}">${esc(o.nome)}</button>`)
      .join("")}</div>`;
  }
  function passoHTML(p, q, rotulo) {
    return `<div class="passo" role="group" aria-label="${esc(rotulo)}"><button type="button" data-menos aria-label="Tirar ${kg(p) ? num(passoDe(p)) + " kg" : "um"}">−</button><output>${qtdTxt(p, q)}</output><button type="button" data-mais aria-label="Pôr mais ${kg(p) ? num(passoDe(p)) + " kg" : "um"}">+</button></div>`;
  }
  function acaoHTML(p, i) {
    if (p.consulta) return `<a class="prod__btn prod__btn--zap" target="_blank" rel="noopener" data-track="servico" href="${waLink(`Oi! Vim pelo site e quero consultar: ${p.nome}${p.codigo ? ` (cód. ${p.codigo})` : ""}.`)}"><svg class="ic"><use href="#zap"/></svg>Consultar</a>`;
    if (p.esgotado) return `<a class="prod__btn prod__btn--off" target="_blank" rel="noopener" href="${waLink(`Oi! Vim pelo site. Quando chega ${p.nome}?`)}">Avise quando chegar</a>`;
    const q = noCarrinho(p.id, i);
    if (q > 0) return passoHTML(p, q, `Quantidade de ${p.nome} no carrinho`);
    return `<button class="prod__btn" type="button" data-add><svg class="ic"><use href="#sacola"/></svg>Adicionar<span class="sr"> ${esc(p.nome)} ao carrinho</span></button>`;
  }
  function card(p) {
    const i = ui.escolha[p.id] ?? 0, o = p.opcoes[i] || p.opcoes[0];
    const desc = !p.consulta && emPromo(p, o) ? Math.round((1 - o.promo / o.preco) * 100) : 0;
    return `<article class="prod${p.esgotado ? " prod--esgotado" : ""}" data-id="${esc(p.id)}">
      <button class="prod__foto" type="button" data-ficha tabindex="-1" aria-hidden="true"><img src="${esc(p.foto)}" alt="" loading="lazy" width="480" height="480">${desc ? `<span class="prod__off">-${desc}%</span>` : ""}${p.selo && !p.esgotado ? `<span class="prod__selo">${esc(p.selo)}</span>` : ""}${p.esgotado ? `<span class="prod__esg">Esgotado</span>` : ""}</button>
      <div class="prod__info">
        <p class="prod__meta">${esc(catNome(p.categoria))}${pets(p)}</p>
        <h3 class="prod__nome"><button type="button" data-ficha>${esc(p.nome)}</button></h3>
        ${opcoesHTML(p, i)}
        ${precoHTML(p, o)}
        ${acaoHTML(p, i)}
      </div>
    </article>`;
  }
  function filtrosHTML() {
    const base = lista(ui.aba, false);
    const cats = CAT.categorias.filter((c) => base.some((p) => p.categoria === c.id));
    const pet = [["", "Todos os pets"], ["cao", "Cães"], ["gato", "Gatos"]].map(([v, t]) => `<button class="chip" type="button" data-pet="${v}" aria-pressed="${ui.pet === v}">${t}</button>`).join("");
    const cat = cats.map((c) => `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${ui.cat === c.id}">${esc(c.nome)}</button>`).join("");
    el.filtros.innerHTML = pet + (cat ? "<i aria-hidden=\"true\"></i>" + cat : "");
  }
  function desenha() {
    const l = lista();
    $$("[data-conta]").forEach((s) => (s.textContent = lista(s.dataset.conta, false).length));
    filtrosHTML();
    const vis = l.slice(0, ui.limite);
    el.vitrine.innerHTML = vis.length ? vis.map(card).join("") : `<div class="vitrine__vazio"><img src="assets/gato.webp" alt="" width="120" height="155"><h3>Nada por aqui com esse filtro</h3><p>Tente outra busca ou fale com a gente: se não estiver no site, a gente procura na loja.</p><button class="btn btn--c" type="button" data-limpa>Limpar filtros</button></div>`;
    el.mais.hidden = l.length <= ui.limite;
    el.mais.textContent = `Ver mais produtos (${l.length - ui.limite})`;
  }
  function trocaCard(id, foco) {
    const velho = el.vitrine.querySelector(`.prod[data-id="${CSS.escape(id)}"]`);
    if (!velho) return;
    const t = document.createElement("div");
    t.innerHTML = card(PROD.get(id));
    const novo = t.firstElementChild;
    velho.replaceWith(novo);
    if (foco) (novo.querySelector(foco) || novo.querySelector("[data-add],[data-mais]"))?.focus();
    return novo;
  }
  function escolheAba(aba, focar) {
    ui.aba = aba; ui.limite = CEL.matches ? LOJA.INICIAIS_CELULAR : LOJA.INICIAIS_COMPUTADOR;
    el.abas.forEach((b) => { const on = b.dataset.aba === aba; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; if (on) { el.vitrine.setAttribute("aria-labelledby", b.id); if (focar) b.focus(); } });
    if (ui.cat && !lista(aba, false).some((p) => p.categoria === ui.cat)) ui.cat = "";
    desenha();
  }

  /* ---------- Carrinho ---------- */
  const noCarrinho = (id, op) => cart.itens.find((x) => x.id === id && x.op === op)?.qtd || 0;
  function muda(id, op, delta, origem) {
    const p = PROD.get(id);
    if (!vendavel(p)) return;
    let it = cart.itens.find((x) => x.id === id && x.op === op);
    if (!it) { if (delta <= 0) return; it = { id, op, qtd: 0 }; cart.itens.push(it); }
    const antes = it.qtd;
    it.qtd = Math.min(kg(p) ? 50 : 99, Math.round((it.qtd + delta) * 100) / 100);
    if (it.qtd < passoDe(p) - 1e-9) cart.itens = cart.itens.filter((x) => x !== it);
    salva();
    const o = p.opcoes[op];
    if (delta > 0 && it.qtd > antes) {
      pixel("AddToCart", { content_ids: [p.codigo || p.id], content_name: p.nome, content_type: "product", value: +(precoDe(p, o) * delta).toFixed(2) });
      if (origem) voa(origem);
      el.fala.textContent = `${p.nome}${o.nome ? " " + o.nome : ""}: ${qtdTxt(p, it.qtd)} no carrinho.`;
    } else {
      el.fala.textContent = noCarrinho(id, op) ? `${p.nome}: ${qtdTxt(p, it.qtd)} no carrinho.` : `${p.nome} saiu do carrinho.`;
    }
    atualiza();
  }
  function linhas() {
    return cart.itens.map((it) => {
      const p = PROD.get(it.id), o = p && p.opcoes[it.op];
      if (!p || !o) return null;
      const ok = vendavel(p), unit = precoDe(p, o);
      return { it, p, o, ok, unit, promo: emPromo(p, o), total: ok ? unit * it.qtd : 0, cheio: ok ? o.preco * it.qtd : 0 };
    }).filter(Boolean);
  }
  function contas() {
    const ls = linhas(), ok = ls.filter((l) => l.ok);
    const total = ok.reduce((s, l) => s + l.total, 0), cheio = ok.reduce((s, l) => s + l.cheio, 0);
    const unidades = ok.reduce((s, l) => s + (kg(l.p) ? 1 : l.it.qtd), 0);
    return { ls, ok, total, economia: Math.max(0, cheio - total), unidades };
  }
  const itensTxt = (n) => `${n} ${n === 1 ? "item" : "itens"}`;

  function atualiza() {
    const c = contas();
    el.qtdTopo.hidden = !c.unidades; el.qtdTopo.textContent = c.unidades;
    $("#abreSacola").setAttribute("aria-label", c.unidades ? `Abrir carrinho, ${itensTxt(c.unidades)}, ${R$(c.total)}` : "Abrir carrinho, vazio");
    const mostrar = c.unidades > 0 && el.gaveta.hidden && el.ficha.hidden;
    el.barra.hidden = !mostrar;
    document.body.classList.toggle("tem-sacola", c.unidades > 0);
    el.sbQtd.textContent = c.unidades; el.sbTotal.textContent = R$(c.total); el.sbItens.textContent = itensTxt(c.unidades);
    // atualiza os cartões visíveis sem perder o foco
    $$(".prod[data-id]", el.vitrine).forEach((a) => {
      const p = PROD.get(a.dataset.id); if (!p) return;
      const i = ui.escolha[p.id] ?? 0, alvo = a.querySelector(".prod__btn, .passo");
      if (!alvo || !vendavel(p)) return;
      const q = noCarrinho(p.id, i), temPasso = alvo.classList.contains("passo");
      if ((q > 0) !== temPasso) { const f = document.activeElement && a.contains(document.activeElement); trocaCard(p.id, f ? (q > 0 ? "[data-mais]" : "[data-add]") : null); }
      else if (temPasso) alvo.querySelector("output").textContent = qtdTxt(p, q);
    });
    if (!el.gaveta.hidden) desenhaGaveta();
  }

  function mensagem() {
    const c = contas(), L = ["Olá, Agropet! Vim pelo site e quero fazer este pedido:", ""];
    c.ok.forEach((l, n) => {
      L.push(`*${n + 1}. ${l.p.nome}*`);
      const det = [l.o.nome, l.p.codigo ? `cód. ${l.p.codigo}` : ""].filter(Boolean).join(" · ");
      if (det) L.push(det);
      const conta = kg(l.p) ? `${num(l.it.qtd)} kg x ${R$(l.unit)}/kg` : `${l.it.qtd} x ${R$(l.unit)}`;
      L.push(`${conta} = ${R$(l.total)}${l.promo ? ` (oferta, de ${R$(l.o.preco)}${sufixo(l.p)})` : ""}`);
      L.push("");
    });
    L.push(`*Total estimado: ${R$(c.total)}*`);
    if (c.economia > 0.004) L.push(`Economia nas ofertas: ${R$(c.economia)}`);
    L.push(`Entrega: ${cart.entrega === "tele" ? "tele-entrega" + (cart.bairro.trim() ? `, bairro ${cart.bairro.trim()}` : "") : "vou retirar na loja"}`);
    if (cart.nome.trim()) L.push(`Nome: ${cart.nome.trim()}`);
    if (cart.obs.trim()) L.push(`Observações: ${cart.obs.trim()}`);
    L.push("", "Pode confirmar, por favor?");
    return L.join("\n");
  }

  /* ---------- Gaveta (carrinho aberto) ---------- */
  let estadoGaveta = "lista"; // lista | esvaziar | enviado
  function desenhaGaveta() {
    const c = contas();
    if (estadoGaveta === "enviado") {
      el.corpo.innerHTML = `<div class="enviado"><img src="assets/i-whatsapp.webp" alt="" width="120" height="120"><h3>Seu pedido abriu no WhatsApp</h3><p>Confira a mensagem e toque em enviar. A loja responde confirmando preço, estoque e entrega.</p><a class="lk" target="_blank" rel="noopener" href="${waLink(mensagem())}">Não abriu? Toque aqui</a></div>`;
      el.pe.innerHTML = `<button class="btn btn--v" type="button" data-novo>Esvaziar e começar outro pedido</button><div class="pe-acoes"><button type="button" data-volta>Voltar ao carrinho</button><button type="button" data-fecha>Continuar vendo</button></div>`;
      return;
    }
    if (!c.ls.length) {
      el.corpo.innerHTML = `<div class="vazio-c"><img src="assets/gato.webp" alt="" width="150" height="194"><h3>Seu carrinho está vazio</h3><p>As ofertas da semana estão esperando por você.</p>${removidos ? `<p class="item__aviso">${removidos === 1 ? "Um item saiu" : removidos + " itens saíram"} do site e foi retirado do carrinho.</p>` : ""}</div>`;
      el.pe.innerHTML = `<button class="btn btn--p" type="button" data-ver-ofertas>Ver as ofertas</button>`;
      return;
    }
    const itens = c.ls.map((l) => `<li class="item${l.ok ? "" : " item--off"}" data-id="${esc(l.it.id)}" data-op="${l.it.op}">
        <img src="${esc(l.p.foto)}" alt="" width="74" height="74">
        <div>
          <p class="item__nome">${esc(l.p.nome)}</p>
          <p class="item__det">${[l.o.nome, R$(l.unit) + sufixo(l.p)].filter(Boolean).map(esc).join(" · ")}${l.promo && l.ok ? `<span class="item__oferta">oferta</span>` : ""}</p>
          ${l.ok ? `<div class="item__linha">${passoHTML(l.p, l.it.qtd, `Quantidade de ${l.p.nome}`)}<b class="item__total">${R$(l.total)}</b></div>` : `<p class="item__aviso">${l.p.esgotado ? "Esgotou e não vai no pedido." : "Só sob consulta, não vai no pedido."}</p>`}
          <button class="item__tirar" type="button" data-tirar><svg class="ic"><use href="#lixo"/></svg>Remover</button>
        </div>
      </li>`).join("");
    const tele = cart.entrega === "tele";
    el.corpo.innerHTML = `<ul class="itens">${itens}</ul>
      ${removidos ? `<p class="item__aviso">${removidos === 1 ? "Um item saiu" : removidos + " itens saíram"} do site e foi retirado do carrinho.</p>` : ""}
      <div class="form-c">
        <fieldset><legend>Como prefere receber?</legend><div class="entrega">
          <label><input type="radio" name="entrega" value="retirar" ${tele ? "" : "checked"}>Retirar na loja<small>Rua Butuí, 142</small></label>
          <label><input type="radio" name="entrega" value="tele" ${tele ? "checked" : ""}>Tele-entrega<small>A gente combina pelo WhatsApp</small></label>
        </div></fieldset>
        ${tele ? `<label><span>Bairro</span><input type="text" id="cBairro" maxlength="60" autocomplete="address-level3" value="${esc(cart.bairro)}" placeholder="Ex.: Cristal"></label><p class="dica-tele">Às terças a tele é grátis. A taxa dos outros dias é combinada pelo WhatsApp.</p>` : ""}
        <label><span>Seu nome <small>(opcional)</small></span><input type="text" id="cNome" maxlength="60" autocomplete="name" value="${esc(cart.nome)}"></label>
        <label><span>Observações <small>(opcional)</small></span><textarea id="cObs" maxlength="300" placeholder="Ex.: a ração é para filhote">${esc(cart.obs)}</textarea></label>
      </div>`;
    const pode = c.ok.length > 0;
    el.pe.innerHTML = (estadoGaveta === "esvaziar"
      ? `<div class="confirma"><p>Tirar todos os itens do carrinho?</p><div><button class="btn btn--v" type="button" data-sim-esvaziar>Esvaziar</button><button class="btn btn--c" type="button" data-volta>Manter</button></div></div>`
      : `<div class="resumo-c">
          <p><span>${itensTxt(c.unidades)}</span><span>${R$(c.total + c.economia)}</span></p>
          ${c.economia > 0.004 ? `<p class="eco"><span>Economia nas ofertas</span><span>− ${R$(c.economia)}</span></p>` : ""}
          <p class="tot"><span>Total estimado</span><span>${R$(c.total)}</span></p>
          <small>Você finaliza pelo WhatsApp. A loja confirma preço, estoque e entrega antes do pagamento.</small>
        </div>
        ${pode ? `<a class="btn btn--p btn--xl" id="comprar" target="_blank" rel="noopener" href="${waLink(mensagem())}"><svg class="ic"><use href="#zap"/></svg>Comprar pelo WhatsApp</a>` : `<button class="btn btn--c btn--xl" type="button" disabled>Nenhum item disponível</button>`}
        <div class="pe-acoes"><button type="button" data-copiar>Copiar pedido</button><button class="perigo" type="button" data-esvaziar>Esvaziar carrinho</button></div>`);
  }
  let abridor = null;
  function abre(painel, foco) {
    abridor = document.activeElement;
    painel.hidden = false;
    document.documentElement.classList.add("trava");
    el.barra.hidden = true;
    (foco || painel.querySelector(".fechar"))?.focus();
  }
  function fecha(painel) {
    if (painel.hidden) return;
    painel.hidden = true;
    if (el.gaveta.hidden && el.ficha.hidden) document.documentElement.classList.remove("trava");
    if (painel === el.gaveta && estadoGaveta !== "enviado") estadoGaveta = "lista";
    atualiza();
    abridor?.focus?.();
  }
  function abreGaveta() {
    if (estadoGaveta === "esvaziar") estadoGaveta = "lista";
    desenhaGaveta(); abre(el.gaveta);
  }

  /* ---------- Ficha do produto ---------- */
  let fichaQtd = 1, fichaId = null;
  function desenhaFicha() {
    const p = PROD.get(fichaId), i = ui.escolha[p.id] ?? 0, o = p.opcoes[i];
    const desc = !p.consulta && emPromo(p, o) ? Math.round((1 - o.promo / o.preco) * 100) : 0;
    const ja = noCarrinho(p.id, i);
    let acao;
    if (p.consulta || p.esgotado) acao = acaoHTML(p, i);
    else acao = `<div class="ficha__qtd">${passoHTML(p, fichaQtd, "Quantidade")}${ja ? `<span class="ficha__ja">Já no carrinho: ${qtdTxt(p, ja)}</span>` : ""}</div>
      <button class="btn btn--p btn--xl" type="button" data-ficha-add><svg class="ic"><use href="#sacola"/></svg>Adicionar · ${R$(precoDe(p, o) * fichaQtd)}</button>`;
    el.fichaPainel.innerHTML = `<button class="fechar" type="button" data-fecha aria-label="Fechar">×</button>
      <div class="ficha__foto"><img src="${esc(p.foto)}" alt="${esc(p.nome)}" width="480" height="480">${desc ? `<span class="prod__off">-${desc}%</span>` : ""}</div>
      <div class="ficha__info" data-id="${esc(p.id)}">
        <p class="prod__meta">${esc(catNome(p.categoria))}${pets(p)}</p>
        <h2 id="fichaTit">${esc(p.nome)}</h2>
        ${p.descricao ? `<p class="desc">${esc(p.descricao)}</p>` : ""}
        ${opcoesHTML(p, i)}
        ${precoHTML(p, o)}
        ${acao}
        ${p.codigo ? `<p class="ficha__cod">Código ${esc(p.codigo)}</p>` : ""}
      </div>`;
  }
  function abreFicha(id) {
    fichaId = id; fichaQtd = passoDe(PROD.get(id));
    desenhaFicha(); abre(el.ficha);
    const p = PROD.get(id);
    pixel("ViewContent", { content_ids: [p.codigo || p.id], content_name: p.nome, content_type: "product" });
  }

  /* ---------- Animação: produto voando para o carrinho ---------- */
  function voa(img) {
    const alvo = !el.barra.hidden && CEL.matches ? el.barra.querySelector(".sacola-barra__ic") : $("#abreSacola");
    const pula = (n) => { n.classList.remove("balanca"); void n.offsetWidth; n.classList.add("balanca"); };
    if (REDUZ || !img || !alvo || !img.animate) { if (alvo) pula(alvo); return; }
    const a = img.getBoundingClientRect(), b = alvo.getBoundingClientRect();
    if (!a.width || !b.width) return pula(alvo);
    const c = img.cloneNode(); c.className = "voa"; c.removeAttribute("loading");
    Object.assign(c.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px" });
    document.body.appendChild(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const k = Math.max(0.12, Math.min(0.3, 44 / a.width));
    c.animate([
      { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(.55) rotate(-12deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(10deg)`, opacity: 0.2 },
    ], { duration: 700, easing: "cubic-bezier(.4,0,.6,1)" }).onfinish = () => { c.remove(); pula(alvo); };
  }

  /* ---------- Eventos ---------- */
  el.vitrine.addEventListener("click", (e) => {
    const art = e.target.closest(".prod[data-id]"); if (!art) { if (e.target.closest("[data-limpa]")) { ui.pet = ui.cat = ui.busca = ""; el.busca.value = ""; desenha(); } return; }
    const id = art.dataset.id, p = PROD.get(id), i = ui.escolha[id] ?? 0;
    const op = e.target.closest("[data-op]");
    if (op) { ui.escolha[id] = +op.dataset.op; trocaCard(id, `[data-op="${op.dataset.op}"]`); return; }
    if (e.target.closest("[data-add]")) { muda(id, i, passoDe(p), art.querySelector(".prod__foto img")); art.classList.remove("pula"); void art.offsetWidth; art.classList.add("pula"); return; }
    if (e.target.closest("[data-mais]")) return muda(id, i, passoDe(p), art.querySelector(".prod__foto img"));
    if (e.target.closest("[data-menos]")) return muda(id, i, -passoDe(p));
    if (e.target.closest("[data-ficha]")) return abreFicha(id);
  });
  // setas do teclado dentro dos grupos de opção
  document.addEventListener("keydown", (e) => {
    const b = e.target.closest?.(".ops [role=radio]"); if (!b || !["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const irm = [...b.parentElement.children], k = (irm.indexOf(b) + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + irm.length) % irm.length;
    irm[k].click();
  });
  el.filtros.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    if (b.dataset.pet !== undefined) ui.pet = b.dataset.pet;
    if (b.dataset.cat !== undefined) ui.cat = ui.cat === b.dataset.cat ? "" : b.dataset.cat;
    ui.limite = CEL.matches ? LOJA.INICIAIS_CELULAR : LOJA.INICIAIS_COMPUTADOR;
    desenha();
    el.filtros.querySelector(b.dataset.pet !== undefined ? `[data-pet="${b.dataset.pet}"]` : `[data-cat="${CSS.escape(b.dataset.cat)}"]`)?.focus();
  });
  let tBusca;
  el.busca.addEventListener("input", () => { clearTimeout(tBusca); tBusca = setTimeout(() => { ui.busca = el.busca.value; if (ui.busca && ui.aba === "ofertas" && !lista().length && lista("todos").length) escolheAba("todos"); else desenha(); }, 160); });
  el.abas.forEach((b) => b.addEventListener("click", () => escolheAba(b.dataset.aba)));
  $(".abas").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    escolheAba(ui.aba === "ofertas" ? "todos" : "ofertas", true);
  });
  el.mais.addEventListener("click", () => {
    const de = ui.limite; ui.limite += CEL.matches ? 6 : 8; desenha();
    el.vitrine.children[de]?.querySelector("[data-ficha]:not([tabindex])")?.focus();
  });
  $$("[data-abre-carrinho]").forEach((b) => b.addEventListener("click", abreGaveta));

  el.gaveta.addEventListener("click", async (e) => {
    const t = e.target;
    if (t.closest("[data-fecha]")) return fecha(el.gaveta);
    if (t.closest("[data-ver-ofertas]")) { fecha(el.gaveta); escolheAba("ofertas"); $("#ofertas").scrollIntoView({ behavior: REDUZ ? "auto" : "smooth" }); return; }
    const li = t.closest(".item");
    if (li) {
      const id = li.dataset.id, op = +li.dataset.op, p = PROD.get(id);
      const mesmo = (sel) => el.corpo.querySelector(`.item[data-id="${CSS.escape(id)}"][data-op="${op}"] ${sel}`);
      if (t.closest("[data-mais]")) { muda(id, op, passoDe(p)); mesmo("[data-mais]")?.focus(); return; }
      if (t.closest("[data-menos]")) { muda(id, op, -passoDe(p)); (mesmo("[data-menos]") || el.corpo.querySelector("[data-mais], #cNome") || el.pe.querySelector("button"))?.focus(); return; }
      if (t.closest("[data-tirar]")) { cart.itens = cart.itens.filter((x) => !(x.id === id && x.op === op)); salva(); el.fala.textContent = `${p.nome} saiu do carrinho.`; atualiza(); el.corpo.querySelector("[data-tirar], #cNome")?.focus(); if (!cart.itens.length) el.pe.querySelector("button")?.focus(); return; }
    }
    if (t.closest("#comprar")) {
      const c = contas();
      pixel("InitiateCheckout", { value: +c.total.toFixed(2), num_items: c.unidades, content_ids: c.ok.map((l) => l.p.codigo || l.p.id), content_type: "product" });
      setTimeout(() => { estadoGaveta = "enviado"; desenhaGaveta(); el.pe.querySelector("button")?.focus(); }, 300);
      return;
    }
    if (t.closest("[data-copiar]")) {
      const b = t.closest("[data-copiar]"), txt = mensagem();
      try { await navigator.clipboard.writeText(txt); b.textContent = "Pedido copiado"; }
      catch { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); b.textContent = "Pedido copiado"; } catch { b.textContent = "Não deu para copiar"; } ta.remove(); }
      setTimeout(() => (b.textContent = "Copiar pedido"), 2400);
      return;
    }
    if (t.closest("[data-esvaziar]")) { estadoGaveta = "esvaziar"; desenhaGaveta(); el.pe.querySelector("[data-volta]")?.focus(); return; }
    if (t.closest("[data-sim-esvaziar]") || t.closest("[data-novo]")) { cart.itens = []; removidos = 0; estadoGaveta = "lista"; salva(); el.fala.textContent = "Carrinho esvaziado."; atualiza(); el.pe.querySelector("button")?.focus(); return; }
    if (t.closest("[data-volta]")) { estadoGaveta = "lista"; desenhaGaveta(); el.pe.querySelector("#comprar, button")?.focus(); }
  });
  el.gaveta.addEventListener("change", (e) => {
    if (e.target.name === "entrega") { cart.entrega = e.target.value; salva(); desenhaGaveta(); el.corpo.querySelector(`input[value="${cart.entrega}"]`)?.focus(); }
  });
  el.gaveta.addEventListener("input", (e) => {
    const campo = { cNome: "nome", cObs: "obs", cBairro: "bairro" }[e.target.id];
    if (!campo) return;
    cart[campo] = e.target.value; salva();
    const a = $("#comprar"); if (a) a.href = waLink(mensagem());
  });

  el.ficha.addEventListener("click", (e) => {
    const t = e.target, p = PROD.get(fichaId);
    if (t.closest("[data-fecha]")) return fecha(el.ficha);
    const op = t.closest("[data-op]");
    if (op) { ui.escolha[p.id] = +op.dataset.op; desenhaFicha(); el.fichaPainel.querySelector(`[data-op="${op.dataset.op}"]`)?.focus(); trocaCard(p.id); return; }
    if (t.closest("[data-mais]")) { fichaQtd = Math.min(kg(p) ? 50 : 99, Math.round((fichaQtd + passoDe(p)) * 100) / 100); desenhaFicha(); el.fichaPainel.querySelector("[data-mais]").focus(); return; }
    if (t.closest("[data-menos]")) { fichaQtd = Math.max(passoDe(p), Math.round((fichaQtd - passoDe(p)) * 100) / 100); desenhaFicha(); el.fichaPainel.querySelector("[data-menos]").focus(); return; }
    if (t.closest("[data-ficha-add]")) {
      const img = el.fichaPainel.querySelector(".ficha__foto img");
      const i = ui.escolha[p.id] ?? 0;
      fecha(el.ficha);
      muda(p.id, i, fichaQtd, img);
    }
  });
  document.addEventListener("keydown", (e) => {
    const aberto = !el.ficha.hidden ? el.ficha : !el.gaveta.hidden ? el.gaveta : null;
    if (!aberto) return;
    if (e.key === "Escape") { e.preventDefault(); fecha(aberto); return; }
    if (e.key === "Tab") {
      const f = [...aberto.querySelectorAll('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  addEventListener("storage", (e) => { if (e.key === LOJA.CHAVE && e.newValue) { try { Object.assign(cart, JSON.parse(e.newValue)); atualiza(); } catch {} } });

  /* ---------- Início ---------- */
  carrega().then((c) => {
    CAT = prepara(c);
    el.aviso.hidden = !CAT.exemplo;
    const ofertas = lista("ofertas", false).length;
    escolheAba(ofertas ? "ofertas" : "todos");
    if (!ofertas) $("#abaOfertas").hidden = true;
    atualiza();
  }).catch((err) => {
    console.warn("Vitrine indisponível:", err);
    el.vitrine.innerHTML = `<div class="vitrine__vazio"><h3>Não conseguimos mostrar as ofertas agora</h3><p>Fale com a gente pelo WhatsApp que a gente passa as promoções da semana.</p><a class="btn btn--p" target="_blank" rel="noopener" href="${waLink("Oi! Vim pelo site e quero saber as ofertas da semana.")}"><svg class="ic"><use href="#zap"/></svg>Pedir as ofertas</a></div>`;
    $(".vit-ctrl").hidden = true; el.filtros.hidden = true;
  });
})();
