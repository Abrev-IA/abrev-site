# Cadastro, réguas de e-mail e comunidade — ABREV

Back-end do fluxo descrito em *"ABREV — Fluxo de cadastro e réguas de e-mail"*.
Site estático (GitHub Pages) não envia e-mail nem grava dados → tudo roda em um
**Google Apps Script** (Web App), `Codigo.gs`, na conta Google da ABREV.

## Listas (planilha "ABREV — Cadastros Site", ID fixo no `CONFIG`)

- **Comunidade** (`CONFIG.TAB_COMUNIDADE`): recebe a **régua quinzenal**. Entram
  pelo pop-up e pelo opt-in do blog.
- **Leads-Estudo** (`CONFIG.TAB_LEADS`): quem pediu um estudo no blog (histórico).
  **Não** recebe a régua, a menos que tenha marcado o opt-in.
- A aba **Cadastros** (evento já ocorrido) não é usada.

## Entradas (POST `text/plain`, `mode:'no-cors'`, corpo JSON)

**1) Pop-up "Faça parte da comunidade"** → lista Comunidade → **E1**
```json
{ "action": "community", "nome": "…", "telefone": "…(opcional)", "email": "…" }
```
Dedupe por e-mail: se já existe, atualiza os dados e **não** reenvia o E1.

**2) Blog "Receber o estudo completo"** → Leads-Estudo → **E2** (com link do PDF)
```json
{ "action": "estudo", "nome": "…", "email": "…",
  "artigo": "Título do artigo", "artigo_url": "https://abrev.org/blog/<slug>.html",
  "slug": "<slug>", "opt_in": true, "origem": "blog" }
```
`opt_in` vem de uma **caixa desmarcada por padrão**. Se `true`, também entra na
Comunidade (sem novo E1 — o E2 já dá as boas-vindas).

**3) Régua quinzenal** (protegido por chave) → toda a Comunidade ativa
```json
{ "action": "broadcast", "key": "<BROADCAST_KEY>", "slug": "<slug>",
  "titulo": "…(opcional)", "resumo": "…(opcional)" }
```
Sem `titulo`/`resumo`, o script lê o `<title>` e o `<meta description>` do artigo.
É o que a GitHub Action `newsletter-broadcast.yml` chama ao entrar um novo estudo.

## Descadastro

`GET /exec?unsub=<token>` → sai da Comunidade, mostra a página de confirmação e
dispara o **E4**. O token vai no rodapé de todo e-mail ("Não quero mais receber
conteúdos"). Um clique, sem login.

## E-mails

| E-mail | Quando | Enviado por |
|---|---|---|
| **E1** Boas-vindas | 1º cadastro na Comunidade | `Codigo.gs` |
| **E2** Estudo completo | pedido do estudo no blog | `Codigo.gs` (PDF por **link**) |
| **E3** Candidatura recebida | envio do Google Forms de associado | `automation/associacao/NotificarDiretoria.gs` |
| **E4** Descadastro | clique no link de saída | `Codigo.gs` |
| Régua quinzenal | novo artigo | `Codigo.gs` (`broadcast`) |

> Os textos E1–E4/régua no `Codigo.gs` são **provisórios** (revisão pendente).
> Ficam em funções `enviarE1_`/`enviarE2_`/`enviarE4_`/`enviarRegua_`.

## Remetente `adm@abrev.org`

`CONFIG.FROM_EMAIL`. Precisa ser um alias **"Enviar e-mail como" verificado** na
conta que roda o script (SMTP GoDaddy: `smtpout.secureserver.net`, 465/587).

## Publicação / diagnóstico

1. Planilha → **Extensões → Apps Script** → cole `Codigo.gs`.
2. Propriedades do script: `BROADCAST_KEY = <senha>` (a mesma no segredo do GitHub).
3. **Implantar → Gerenciar implantações → Nova versão** (mantém a URL `/exec`).
4. Verificar: abrir `/exec` deve mostrar `"version":"fluxo-e1e4-1"`.
   Diagnóstico: `/exec?diag=1&key=<BROADCAST_KEY>` retorna contagem de Comunidade/Leads.

## Segredos do GitHub (Actions)

- `APPS_SCRIPT_EXEC_URL` → URL `/exec`.
- `NEWSLETTER_KEY` → mesma senha do `BROADCAST_KEY`.

## Limites (Gmail)

`MailApp` tem cota diária (~100/dia grátis, ~1.500/dia Workspace). O `broadcast`
respeita a cota. Para listas grandes, migrar para um ESP dedicado.
