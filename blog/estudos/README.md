# Estudos (versão e-mail + PDF)

Para cada artigo do blog `blog/<slug>.html`, este diretório guarda a versão do
**estudo** entregue no cadastro da comunidade. A estratégia é de **bloqueio
parcial**: o artigo público mostra boa parte do conteúdo e trava a seção final
(mais valiosa) atrás do cadastro — quem se cadastra recebe o **estudo completo**
por e-mail (HTML + PDF).

- `<slug>.html` — **estudo completo em HTML adaptado para e-mail**:
  - **mesmo conteúdo do artigo do blog** (inclui a parte travada), com o
    **layout adaptado** para clientes de e-mail;
  - estilos **inline**, largura ~600px, sem nav/pop-up/animações/`<script>`;
  - gráficos representados como **barras/tabelas simples** (SVG não é confiável
    em e-mail); cabeçalho branded ABREV e rodapé com links.
  - É o **corpo** do e-mail.
- `<slug>.pdf` — **PDF gerado a partir do artigo do blog** (`blog/<slug>.html`),
  com a identidade visual completa (hero, gráficos SVG, seções). Renderizado com
  Chromium headless, desbloqueando o gate e ocultando nav/rodapé/pop-up:
  `page.evaluate(add 'unlocked' + esconde .nav/.footer/#communityModal/#gateCard)`
  → `page.pdf({format:'A4', printBackground:true})`. É o **anexo** do e-mail.

O Google Apps Script (`automation/newsletter/Codigo.gs`) busca estes arquivos
por URL (`https://abrev.org/blog/estudos/<slug>.html` e `.pdf`) e os usa como
corpo e anexo. Se não existirem, envia um fallback com link para o artigo.

## Bloqueio parcial no artigo

O artigo `blog/<slug>.html` marca a fronteira do bloqueio com:

- um `<div class="gatecard" id="gateCard">` (card de cadastro exibido quando
  bloqueado), e
- um `<div id="estudoGate">…</div>` envolvendo a seção final travada.

O CSS esconde `#estudoGate` e mostra `#gateCard` enquanto `body` **não** tem a
classe `unlocked`. O JS adiciona `unlocked` quando o visitante já se cadastrou
(`localStorage abrev_comunidade_done`) ou logo após concluir o cadastro pelo
pop-up. É um **soft-gate** (o conteúdo continua no HTML, preservando SEO e
mantendo uma única fonte para gerar o PDF); para bloqueio "duro" seria preciso
remover o conteúdo da página pública (pior para SEO).

> Estes arquivos são **entregáveis do fluxo dos agentes**: ao concluir um
> artigo, gerar também o `<slug>.html` (estudo completo adaptado para e-mail) e
> o `<slug>.pdf` (PDF do artigo).
