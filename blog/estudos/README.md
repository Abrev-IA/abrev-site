# Estudos (e-mail + PDF)

Cada artigo do blog gera **3 arquivos**. O blog mostra um **resumo** (bom para SEO
e para atrair o cadastro); o **conteúdo completo** vai no **PDF por e-mail**:

1. `blog/<slug>.html` — **resumo para o blog** (público). Traz introdução, dados
   principais e um bloco de opt-in "Receber por e-mail". Não é o estudo completo.
2. `blog/estudos/<slug>.html` — **resumo em HTML adaptado para e-mail** (corpo do
   e-mail): estilos **inline**, ~600px, gráficos como barras/tabelas simples, sem
   nav/pop-up/`<script>`. Aponta para o PDF em anexo. O rodapé de descadastramento
   é adicionado automaticamente pelo Apps Script (não incluir aqui).
3. `blog/estudos/<slug>.pdf` — **versão completa em PDF**, com a identidade visual
   da ABREV (hero, gráficos, todas as seções). É o **anexo** do e-mail.

## Como o e-mail é montado

O opt-in do artigo (pop-up "Receber por e-mail") faz `POST` para o Apps Script
(`automation/newsletter/Codigo.gs`), que:
- grava/atualiza o inscrito na planilha;
- envia o e-mail: **corpo** = `estudos/<slug>.html`, **anexo** = `estudos/<slug>.pdf`,
  buscados por URL (`https://abrev.org/blog/estudos/<slug>.…`);
- inclui o link de **descadastramento**.

Quando um **novo** `blog/estudos/<slug>.html` entra na `main`, a GitHub Action
`newsletter-broadcast.yml` dispara esse mesmo e-mail para **todos os inscritos**.

## Gerando o PDF completo

Renderizar a versão completa com Chromium headless
(`page.pdf({format:'A4', printBackground:true})`). Como o blog agora é um resumo,
o PDF deve ser gerado a partir da **versão completa** do artigo (o rascunho
completo dos agentes), e não do resumo publicado.

> Entregáveis obrigatórios do fluxo dos agentes. Sem o `<slug>.html` (resumo de
> e-mail) e o `<slug>.pdf` (completo), o e-mail cai no fallback (só um link).
