# Sitemap e navegação de conteúdo

Gerar localmente com `node automation/seo/sitemap.mjs`.
Validar as regras com `node --test automation/seo/sitemap.test.mjs`.

O gerador lê HTML diretamente na raiz, em `blog/` e `imprensa/`. Inclui somente
páginas com um canonical HTTPS em abrev.org que corresponda ao próprio arquivo.
Exclui redirecionamentos, noindex/none, URLs com query ou fragmento, templates,
QA, cópias de estudos e arquivos de verificação. A ausência do canonical da home
interrompe a geração para evitar substituir o sitemap por uma lista incompleta.
O lastmod usa o timestamp de commit (%cI) do último commit que alterou cada
HTML, consultado em HEAD; não usa mtime, a data de geração nem a do commit do
sitemap. Arquivos novos ou modificados sem commit ficam sem lastmod até serem
commitados. O checkout do workflow busca o histórico completo (fetch-depth: 0);
um clone raso interrompe a geração e preserva o sitemap anterior. A saída é
ordenada e não duplica URLs; preserva as quebras de linha do sitemap existente.

Limite: o histórico é uma aproximação da última atualização significativa, não
uma análise semântica. Alterações só em CSS/JS/imagens compartilhados não mudam a
data do HTML; uma edição cosmética no HTML pode mudá-la. Evite commits de mera
troca de datas e reavalie o critério se o processo editorial passar a exigir isso.
Referência: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#additional-notes-about-xml-sitemaps

O workflow `SEO — atualizar sitemap` executa em alterações de HTML na main e
depois da conclusão bem-sucedida do publicador do cockpit. Esse segundo gatilho
cobre publicações feitas com GITHUB_TOKEN, cujos commits não disparam workflows
normais de push. O checkout utiliza a main atual, e não uma revisão antiga do
evento. Só faz commit quando sitemap.xml mudou e solicita uma compilação Pages
depois do commit. Não envia newsletter, solicita indexação ou altera páginas.

O guia de logística reversa ganhou um link permanente nos rodapés de navegação,
incluindo o template que serve de base para os próximos artigos do blog.

Limites: páginas em outras pastas ou sem canonical correto precisam de ajuste
antes de entrar na lista. A presença no sitemap não garante indexação. Conflito
de push ou falha na API do GitHub faz o workflow falhar visivelmente; pode ser
executado novamente por workflow_dispatch após corrigir a causa.

## Feed do blog (B14)

`node automation/seo/feed.mjs` gera `blog/feed.xml` em Atom 1.0, compatível com
leitores que aceitam RSS/Atom. Formato: https://www.rfc-editor.org/rfc/rfc4287.
O índice do blog oferece link visível no rodapé e autodetecção por `rel=alternate`.
Não há cadastro, envio de e-mails ou mudança no visual dos artigos.

O feed lista somente HTML público diretamente em blog/, com canonical próprio;
não inclui índice, redirecionamentos, noindex nem cópias de estudos. Título vem
do H1 e resumo da meta description. IDs permanentes usam a URL canônica.
`updated` vem do último commit do HTML (mesmo critério e limites do lastmod),
não da hora da geração. A data de publicação não é inventada. Arquivo elegível
sem commit ou editado sem commit interrompe a geração e preserva o feed anterior.
Histórico completo é obrigatório. Não gere o feed com artigos em edição.

O workflow SEO existente valida e gera sitemap e feed após alterações de HTML
na main e após o publicador do cockpit. Commita ambos somente se mudarem e mantém
a solicitação de build do Pages. Novos artigos entram e arquivos excluídos saem
na próxima execução; títulos e descrições devem estar preenchidos.

Validação conjunta: `node --test automation/seo/sitemap.test.mjs automation/seo/feed.test.mjs`.
Para publicação manual de artigo: faça commit do HTML, execute os dois geradores
e inclua os arquivos gerados no PR. O feed não é adicionado ao sitemap de páginas
HTML. Oferecer o feed não comprova assinatura, uso por agregadores ou indexação.
