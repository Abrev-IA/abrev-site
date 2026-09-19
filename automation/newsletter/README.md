# Newsletter / Comunidade ABREV — cadastro + envio do estudo

Backend do **pop-up "Faça parte da comunidade"** do blog e dos formulários de
cadastro do site. Site estático (GitHub Pages) não envia e-mail nem grava dados,
então isso roda em um **Google Apps Script** (Web App) na conta Google da ABREV.

## Fluxo

```
Leitor no blog  ──(12s de leitura)──►  Pop-up "Faça parte da comunidade"
        │  preenche nome / telefone / e-mail
        ▼
  fetch POST (no-cors) ─────────►  Apps Script /exec  (Codigo.gs)
                                     ├─ grava linha na planilha (aba "Cadastros")
                                     └─ se origem=blog_comunidade e enviar_estudo=true:
                                          envia e-mail com
                                          • HTML reduzido do estudo no corpo
                                          • PDF branded em anexo
```

## Payload enviado pelo site

```json
{
  "nome": "…",
  "telefone": "[BLOG] …",
  "email": "…",
  "origem": "blog_comunidade",
  "artigo": "Título do artigo",
  "artigo_url": "https://abrev.org/blog/<slug>.html",
  "enviar_estudo": true
}
```

O Apps Script deriva o `<slug>` de `artigo_url` e busca os assets do estudo em:

- `https://abrev.org/blog/estudos/<slug>.html` → **corpo** do e-mail (HTML reduzido)
- `https://abrev.org/blog/estudos/<slug>.pdf` → **anexo** (PDF com identidade ABREV)

Se algum asset ainda não existir, o e-mail é enviado com um fallback (link para
o artigo no site) e o cadastro é gravado normalmente.

## Colunas da planilha (aba "Cadastros")

`data_hora | nome | telefone | email | origem | artigo | artigo_url | estudo_enviado`

> `origem` distingue a fonte do cadastro: `blog_comunidade` (pop-up do blog),
> `pagina_inicial` (pop-up da home) etc. O telefone recebe um prefixo de origem
> (`[BLOG]`, `[HOME]`) para leitura rápida na planilha.

## Publicação (passo a passo)

1. Abra a planilha de cadastros → **Extensões → Apps Script**.
2. Cole o conteúdo de [`Codigo.gs`](./Codigo.gs) (substituindo o script atual).
3. Ajuste `CONFIG` se necessário (planilha, remetente, base do site).
4. **Implantar → Nova implantação → App da Web**
   - Executar como: **Eu mesmo**
   - Quem pode acessar: **Qualquer pessoa**
5. Mantenha a **mesma URL `/exec`** já usada no site. Se o Google gerar outra,
   atualize `APPS_SCRIPT_URL` nos arquivos do blog (`blog/index.html` e
   `blog/da-devolucao-ao-encantamento.html`) e no restante do site.
6. Autorize os escopos: planilha, envio de e-mail (`MailApp`) e busca de URL
   (`UrlFetchApp`).

## Convenção dos estudos (para o fluxo dos agentes)

Ao produzir um artigo do blog `blog/<slug>.html`, os agentes devem gerar também:

- `blog/estudos/<slug>.html` — versão **reduzida** e amigável para e-mail
  (cabeçalho branded, texto essencial, sem nav/pop-up/scripts).
- `blog/estudos/<slug>.pdf` — **PDF** com a identidade visual da ABREV.

Ver `blog/estudos/README.md` para o padrão dos arquivos.
