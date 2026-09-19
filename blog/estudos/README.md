# Estudos (versão e-mail + PDF)

Para cada artigo do blog `blog/<slug>.html`, este diretório guarda a versão do
**estudo** enviada por e-mail no cadastro da comunidade:

- `<slug>.html` — **HTML reduzido**, amigável para clientes de e-mail:
  - cabeçalho com a marca ABREV (sem depender de fontes/CSS externos);
  - título, resumo e o conteúdo essencial do artigo (dados/gráficos como texto
    ou imagem simples), sem nav, pop-up, animações ou `<script>`;
  - estilos **inline** (muitos clientes removem `<style>`), largura ~600px;
  - rodapé com link para o artigo completo e assinatura da ABREV.
- `<slug>.pdf` — **PDF** do estudo com a identidade visual da ABREV
  (mesma base do HTML reduzido, em layout de página).

O Google Apps Script (`automation/newsletter/Codigo.gs`) busca estes arquivos
por URL (`https://abrev.org/blog/estudos/<slug>.html` e `.pdf`) e os usa como
corpo e anexo do e-mail. Se não existirem, o e-mail usa um fallback com link.

> Estes arquivos passam a ser um **entregável do fluxo dos agentes**: ao concluir
> um artigo, gerar também o `<slug>.html` e o `<slug>.pdf` aqui.
