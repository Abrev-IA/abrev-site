# Dados do relatório mensal de busca

Uma pasta por mês, no formato `AAAA-MM`, com três arquivos.

## Como atualizar

1. No Search Console, propriedade `https://abrev.org/`, abra **Desempenho → Resultados da pesquisa**.
2. Escolha o período do mês e marque as quatro métricas: cliques, impressões, CTR e posição.
3. Clique em **EXPORTAR → Baixar CSV**. O arquivo traz uma planilha por aba do relatório.
4. Crie `automation/seo/dados/AAAA-MM/` e coloque ali:
   - `paginas.csv` — a aba **Páginas**. O gerador também aceita o nome `Páginas.csv` como vem do export.
   - `consultas.csv` — a aba **Consultas**, igualmente com ou sem acento.
   - `periodo.json` — escrito à mão, no formato do mês anterior.
5. Rode `node automation/seo/report.mjs AAAA-MM`.
6. Confira o relatório gerado em `automation/seo/relatorios/AAAA-MM.md` e faça o commit dos dois.

## Formato esperado

Os CSVs são os do export do Search Console em pt-BR, sem edição: primeira linha de
cabeçalho, depois `chave,cliques,impressões,CTR,posição`. O gerador entende vírgula
decimal, sufixo `%` e campos entre aspas.

`periodo.json` precisa de `inicio`, `fim`, `coletadoEm` e `origem`. Os campos
`totaisDeclarados` e `observacao` são opcionais: quando `totaisDeclarados` está
presente, o gerador compara com a soma das linhas e avisa se não fecharem.

## Por que os dados ficam versionados

O Search Console guarda 16 meses. Um relatório que depende de uma consulta ao vivo
perde o passado e deixa de ser reproduzível. Com o CSV no repositório, qualquer
pessoa regenera qualquer mês e chega ao mesmo arquivo — e o teste
`report.test.mjs` falha se o relatório publicado divergir dos dados.
