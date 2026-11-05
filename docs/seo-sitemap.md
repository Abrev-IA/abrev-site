# Sitemap e navegação de conteúdo

Gerar localmente com `node automation/seo/sitemap.mjs`.
Validar as regras com `node --test automation/seo/sitemap.test.mjs`.

O gerador lê HTML diretamente na raiz, em `blog/` e `imprensa/`. Inclui somente
páginas com um canonical HTTPS em abrev.org que corresponda ao próprio arquivo.
Exclui redirecionamentos, noindex/none, URLs com query ou fragmento, templates,
QA, cópias de estudos e arquivos de verificação. A ausência do canonical da home
interrompe a geração para evitar substituir o sitemap por uma lista incompleta.
Não inventa datas lastmod. A saída é ordenada e não duplica URLs.

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
