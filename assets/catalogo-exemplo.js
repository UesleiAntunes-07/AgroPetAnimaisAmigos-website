/* =========================================================
   CATÁLOGO DE EXEMPLO – só para aprovar o visual.
   Produtos, preços e fotos são ilustrativos. Quando o painel (admin)
   estiver pronto, a vitrine passa a ler os produtos reais do banco,
   no mesmo formato abaixo (ver LOJA.CATALOGO_URL em ofertas.js).

   Formato de cada produto:
     id, codigo      identificação (o código vai na mensagem do WhatsApp)
     nome, descricao
     categoria       id de uma das categorias
     pet             ["cao"], ["gato"] ou ["cao", "gato"]
     foto            caminho da imagem
     selo            texto curto opcional ("Mais vendido")
     variacao        nome do tipo de opção ("Tamanho", "Sabor")
     opcoes          [{ nome, preco, promo }]  promo = preço de oferta (opcional)
     unidade         "un" ou "kg" (granel: preço por kg, passo de 0,5 kg)
     promo_ate       "AAAA-MM-DD" último dia da oferta (opcional)
     destaque, esgotado, consulta (preço sob consulta, fora do carrinho), ordem
   ========================================================= */
(function () {
  // Exemplo: as ofertas valem até o próximo sábado, para a prévia nunca "vencer".
  const d = new Date();
  const sab = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((6 - d.getDay() + 7) % 7));
  const ate = `${sab.getFullYear()}-${String(sab.getMonth() + 1).padStart(2, "0")}-${String(sab.getDate()).padStart(2, "0")}`;
  const F = "assets/produtos/";

  window.AGROPET_CATALOGO = {
    exemplo: true,
    categorias: [
      { id: "racoes", nome: "Rações" },
      { id: "petiscos", nome: "Petiscos" },
      { id: "higiene", nome: "Higiene" },
      { id: "acessorios", nome: "Acessórios" },
      { id: "brinquedos", nome: "Brinquedos" },
      { id: "saude", nome: "Saúde" },
    ],
    produtos: [
      { id: "p001", codigo: "001", nome: "Ração Premium Cães Adultos", categoria: "racoes", pet: ["cao"], foto: F + "racao-caes.webp", selo: "Mais vendido", destaque: true, variacao: "Tamanho",
        descricao: "Ração completa para cães adultos de porte médio e grande, com proteína de qualidade, fibras e ômegas 3 e 6.",
        opcoes: [{ nome: "3 kg", preco: 69.9, promo: 59.9 }, { nome: "15 kg", preco: 229.9, promo: 189.9 }], promo_ate: ate },
      { id: "p002", codigo: "002", nome: "Ração Premium Gatos Castrados", categoria: "racoes", pet: ["gato"], foto: F + "racao-gatos.webp", destaque: true, variacao: "Tamanho",
        descricao: "Fórmula para gatos castrados, com controle de peso e cuidado com o trato urinário.",
        opcoes: [{ nome: "1 kg", preco: 34.9, promo: 29.9 }, { nome: "10,1 kg", preco: 219.9, promo: 199.9 }], promo_ate: ate },
      { id: "p003", codigo: "003", nome: "Ração a granel Cães Adultos", categoria: "racoes", pet: ["cao"], foto: F + "granel.webp", unidade: "kg", passo: 0.5,
        descricao: "Leve só a quantidade que precisa. Vendida por quilo, sempre fresca e bem armazenada.",
        opcoes: [{ nome: "", preco: 14.9, promo: 12.9 }], promo_ate: ate },
      { id: "p004", codigo: "004", nome: "Bifinho sabor carne", categoria: "petiscos", pet: ["cao"], foto: F + "petisco.webp", selo: "Favorito",
        descricao: "Petisco macio para recompensar e treinar. Pacote com 500 g.",
        opcoes: [{ nome: "500 g", preco: 32.9, promo: 27.9 }], promo_ate: ate },
      { id: "p005", codigo: "005", nome: "Sachê para gatos 85 g", categoria: "racoes", pet: ["gato"], foto: F + "sache.webp", variacao: "Sabor",
        descricao: "Alimento úmido completo para gatos adultos. Escolha o sabor preferido do seu gato.",
        opcoes: [{ nome: "Frango", preco: 3.49, promo: 2.99 }, { nome: "Carne", preco: 3.49, promo: 2.99 }, { nome: "Peixe", preco: 3.49, promo: 2.99 }], promo_ate: ate },
      { id: "p006", codigo: "006", nome: "Shampoo pelos macios 500 ml", categoria: "higiene", pet: ["cao", "gato"], foto: F + "shampoo.webp",
        descricao: "Limpa sem ressecar e deixa o pelo macio e cheiroso entre um banho e outro.",
        opcoes: [{ nome: "500 ml", preco: 29.9, promo: 24.9 }], promo_ate: ate },
      { id: "p007", codigo: "007", nome: "Caminha redonda", categoria: "acessorios", pet: ["cao", "gato"], foto: F + "caminha.webp", variacao: "Tamanho",
        descricao: "Caminha fofinha com borda alta para o pet se aconchegar. Capa lavável.",
        opcoes: [{ nome: "P", preco: 89.9, promo: 79.9 }, { nome: "M", preco: 119.9, promo: 104.9 }], promo_ate: ate },
      { id: "p008", codigo: "008", nome: "Mordedor de corda com bolinha", categoria: "brinquedos", pet: ["cao"], foto: F + "brinquedo.webp",
        descricao: "Brinquedo resistente para morder e puxar. Ajuda a gastar energia.",
        opcoes: [{ nome: "", preco: 24.9, promo: 19.9 }], promo_ate: ate },
      { id: "p009", codigo: "009", nome: "Areia higiênica 4 kg", categoria: "higiene", pet: ["gato"], foto: F + "areia.webp",
        descricao: "Areia que forma torrões firmes e ajuda a controlar o odor.",
        opcoes: [{ nome: "4 kg", preco: 24.9 }] },
      { id: "p010", codigo: "010", nome: "Coleira ajustável com plaquinha", categoria: "acessorios", pet: ["cao"], foto: F + "coleira.webp", variacao: "Tamanho",
        descricao: "Coleira com regulagem e plaquinha para gravar o nome do pet.",
        opcoes: [{ nome: "P", preco: 29.9 }, { nome: "M", preco: 34.9 }, { nome: "G", preco: 39.9 }] },
      { id: "p011", codigo: "011", nome: "Antipulgas e carrapatos", categoria: "saude", pet: ["cao"], foto: F + "antipulgas.webp", consulta: true,
        descricao: "A dose certa depende do peso do pet. Fale com a gente para indicar a opção ideal.",
        opcoes: [{ nome: "", preco: 0 }] },
      { id: "p012", codigo: "012", nome: "Osso natural (2 unidades)", categoria: "petiscos", pet: ["cao"], foto: F + "osso.webp", esgotado: true,
        descricao: "Osso natural para roer, ajuda na limpeza dos dentes.",
        opcoes: [{ nome: "2 un", preco: 18.9 }] },
    ],
  };
})();
