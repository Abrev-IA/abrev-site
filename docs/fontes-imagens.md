# Fontes locais e imagens compactadas

As 12 páginas públicas usam as mesmas famílias Inter e Montserrat, agora em WOFF2
variável local. As declarações font-face ficam inline, com font-display:swap,
subconjuntos latin e latin-ext e preload dos subconjuntos latin usados acima da
dobra. Não há consulta a fonts.googleapis.com nem dependência de uma folha CSS
externa para descobrir os arquivos das fontes.

Arquivos obtidos do Google Fonts: Inter v20 (pesos 400–900) e Montserrat v31
(pesos 300–900), estilo normal. Licenças OFL preservadas em assets/fonts/.
As URLs de obtenção são as retornadas pela API CSS oficial:
https://fonts.googleapis.com/css2?family=Inter:wght@400..900&family=Montserrat:wght@300..900&display=swap

As fotografias existentes foram convertidas para AVIF (qualidade 45) e WebP
(qualidade 62), com larguras de 320, 480, 768, 1200 e 1600 px. A composição
original permanece inteira, e o recorte de apresentação continua definido pelo
object-fit do site. O elemento picture oferece AVIF e fallback WebP. O logo
transparente usa WebP lossless em 210, 420 e 630 px. O PNG original permanece
disponível para metadados, e-mails e usos externos.

Fontes das fotos já utilizadas no site:
- https://images.unsplash.com/photo-1778512390644-b7cfc42a41f8
- https://images.unsplash.com/photo-1669003153363-6d7ba8e20c7e
- https://images.unsplash.com/photo-1781156216069-f51d03f20e4f

## Comparação de arquivos

| Recurso | Antes | Agora |
| --- | ---: | ---: |
| Foto principal 480 px | 42327 bytes | AVIF: 14287; WebP: 18618 bytes |
| Centro logístico 768 px | 88397 bytes no relatório | AVIF: 30172; WebP: 52318 bytes |
| Operação 480 px | 44847 bytes no relatório | AVIF: 17362; WebP: 27470 bytes |
| Logo | PNG: 40237 bytes | WebP 210: 3716; 420: 8360 bytes |

O tamanho escolhido depende da tela e da densidade de pixels. Estes números
comparam arquivos; a avaliação de desempenho depende do novo PageSpeed.

Referência anterior: mobile 94, desktop 100, LCP 2,9 s/0,7 s, CLS 0,051/0,022.
https://pagespeed.web.dev/analysis/https-abrev-org/4xl0g9gdsf?form_factor=mobile

Validação local: todos os recursos de srcset/preload/font-face existem, imagens
AVIF/WebP decodificam, cabeçalhos WOFF2 válidos, 13 testes existentes passaram.
Prévia visual em desktop e em tela móvel de 390 px; fotos AVIF e logo responsivo
foram selecionados pelo navegador, sem rolagem horizontal.
