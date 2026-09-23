# Newsletter / Comunidade ABREV — cadastro, envio e disparo em massa

Backend do **opt-in "Receber por e-mail"** do blog. Site estático (GitHub Pages)
não envia e-mail nem grava dados, então isso roda em um **Google Apps Script**
(Web App) na conta Google da ABREV (`Codigo.gs`).

## O que faz

1. **Cadastro (opt-in):** o leitor pede "Receber por e-mail" no artigo → o site
   faz `POST` para o Web App, que grava/atualiza o inscrito na planilha **e**
   envia o e-mail daquele artigo (resumo em HTML no corpo + PDF completo anexo),
   já com link de descadastramento.
2. **Descadastramento:** cada e-mail tem, no rodapé, um link
   `…/exec?unsub=<token>`; ao abrir, o inscrito é marcado como `descadastrado`.
3. **Disparo em massa (novo artigo):** quando um novo `blog/estudos/<slug>.html`
   entra na `main`, a **GitHub Action** (`.github/workflows/newsletter-broadcast.yml`)
   chama o Web App com `{action:"broadcast", key, slug}` e ele envia o artigo a
   todos os inscritos **ativos**.

## Fluxo

```
Leitor no artigo ─ "Receber por e-mail" ─► POST /exec
                                            ├─ grava/atualiza inscrito (token, status=ativo)
                                            └─ envia e-mail do artigo (resumo HTML + PDF) + link de descadastro

Novo artigo na main ─► GitHub Action ─► POST /exec {action:broadcast, key, slug}
                                         └─ envia para todos os inscritos ativos
```

## Payload do opt-in (site → Web App)

```json
{
  "nome": "…", "telefone": "[BLOG] …", "email": "…",
  "origem": "blog_receber_email",
  "artigo": "Título do artigo",
  "artigo_url": "https://abrev.org/blog/<slug>.html",
  "enviar_estudo": true
}
```

O `<slug>` é derivado de `artigo_url`. O e-mail usa:
- corpo → resumo HTML de `blog/estudos/<slug>.html`;
- anexo → PDF completo de `blog/estudos/<slug>.pdf`.
Se algum asset não existir, cai em um fallback com link para o artigo.

### De onde o Apps Script busca os arquivos (`ASSETS_BASE`)

O `UrlFetchApp` do Apps Script **não consegue** buscar de `https://abrev.org`
(o GitHub Pages/Cloudflare bloqueia o bot do Google), o que fazia o e-mail cair
no fallback "Ler no site →" **sem** o resumo nem o PDF. Por isso o `Codigo.gs`
busca os arquivos direto do repositório via `CONFIG.ASSETS_BASE`
(`https://raw.githubusercontent.com/Abrev-IA/abrev-site/main`) e usa `abrev.org`
apenas nos **links exibidos ao leitor** (corpo "Ler no site" e descadastro).
Como o `raw.githubusercontent.com` serve o PDF como `application/octet-stream`,
o `fetchPdf_` valida pelos bytes `%PDF` e força `application/pdf` no anexo.

> Os arquivos precisam estar na branch `main` do repositório para serem
> buscados (é o caminho do `ASSETS_BASE`). Publique os 3 arquivos juntos.

## Planilha (aba "Cadastros")

`data_hora | nome | telefone | email | origem | artigo | artigo_url | status | token | ultimo_envio`

- `status`: `ativo` ou `descadastrado`.
- `token`: identificador do descadastramento (gerado no 1º cadastro).
- Reinscrição: um novo opt-in com um e-mail já existente volta o `status` para `ativo`.

## Publicação do Apps Script

1. Planilha → **Extensões → Apps Script** → cole `Codigo.gs`.
2. **Configurações do projeto → Propriedades do script**:
   `BROADCAST_KEY = <senha forte>` (a mesma vai no segredo do GitHub).
3. **Implantar → Gerenciar implantações → ✏️ editar → Versão: Nova versão → Implantar**
   (mantém a mesma URL `/exec`).
4. Autorize os escopos: planilha, `MailApp` (e-mail), `UrlFetchApp` (buscar URL).

## Segredos do GitHub (Settings → Secrets and variables → Actions)

- `APPS_SCRIPT_EXEC_URL` → a URL `/exec` do Web App.
- `NEWSLETTER_KEY` → **a mesma** senha do `BROADCAST_KEY`.

Disparo manual: aba **Actions → Newsletter — disparo de novo artigo → Run workflow**,
informando o `slug`.

## Limites (Gmail)

`MailApp` tem cota diária (~100/dia em contas gratuitas, ~1.500/dia no Workspace).
O `broadcast` respeita a cota (`getRemainingDailyQuota`) e informa quantos ficaram
sem cota. Para listas grandes, migrar para um serviço de envio dedicado.

## Convenção dos estudos (fluxo dos agentes)

Cada artigo gera 3 arquivos (ver `blog/estudos/README.md`):
- `blog/<slug>.html` — **resumo** para o blog (público);
- `blog/estudos/<slug>.html` — **resumo** em HTML adaptado para o e-mail;
- `blog/estudos/<slug>.pdf` — **versão completa** em PDF (anexo do e-mail).
