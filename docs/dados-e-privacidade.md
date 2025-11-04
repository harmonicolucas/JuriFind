# Dados e privacidade

## O que é lido

O directório [Encontre Advogados](https://encontreadvogados.co.mz/advogado/) expõe uma API pública de leitura do WordPress. O `robots.txt` do sítio não impede essa leitura fora da área de administração. O JuriFind usa esse mecanismo e guarda apenas:

- nome
- áreas de prática
- localização
- línguas
- ligação HTTPS para o perfil no mesmo domínio
- indicação de que existe fotografia, sem descarregar a imagem

Biografias, peças académicas e ficheiros de imagem não são copiados para o repositório nem para a cache.

O telefone só é mostrado se estiver publicado num título do perfil original. Fica em memória do processo, com prazo de um dia, e não é escrito na cache em disco. `ENRICH_CONTACTS=false` desliga esta leitura. O botão de contacto continua a abrir o perfil.

## O que não é feito

- Não se reproduz a base inteira como obra própria.
- Não se inventam advogados, áreas, cidades, línguas, números ou cargos.
- Não se apresenta o JuriFind como o directório oficial nem como serviço da Ordem dos Advogados de Moçambique.
- Não se guarda o relato do caso. Antes de um modelo externo, emails e sequências longas de algarismos são substituídos.

A lei moçambicana de direito de autor não trata como utilização livre a reprodução de bases de dados inteiras ou de partes substanciais. Por isso o programa referencia o perfil original em vez de o reescrever.

## Pessoa que descreve o caso

O relato pode conter dados pessoais. A interface pede que não sejam incluídos números de identificação, dados de saúde nem contactos de terceiros. O servidor não escreve esse texto em disco nem em registos. O modelo só o recebe se `LLM_API_KEY` estiver definida, e mesmo assim com os contactos e números longos ocultados.

## Recomendação

A lista é uma correspondência com dados publicados. Não é aconselhamento jurídico, não garante que o advogado aceite o caso e não ordena profissionais pela sua qualidade. A pessoa deve confirmar a inscrição e os contactos no perfil original e na Ordem dos Advogados de Moçambique.

## Retirar um perfil

Acrescente o slug a `EXCLUDE_SLUGS` e reinicie o servidor. O perfil deixa de aparecer mesmo que continue no directório de origem. Como a cache expira, uma remoção feita na origem também deixa de ser lida no prazo de `CACHE_TTL_HOURS`.
