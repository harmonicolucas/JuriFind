# JuriFind IA

Página publicada: [https://harmonicolucas.github.io/JuriFind/](https://harmonicolucas.github.io/JuriFind/)

JuriFind IA suggests a Mozambican lawyer from a description of the case written in Portuguese. The ranking uses only the practice areas, the city and the languages that lawyer already published. It does not invent a specialty, it does not copy a biography, and it does not store the text of the case.

O JuriFind IA é um software moçambicano que recomenda advogados a partir de uma descrição livre do caso, em português. A ordenação usa apenas áreas de prática, localização e línguas publicadas no directório [Encontre Advogados](https://encontreadvogados.co.mz/advogado/). Não inventa especialidades e não copia biografias.

## O que faz

1. A pessoa descreve o caso.
2. Regras sobre o contexto jurídico moçambicano identificam áreas do directório, cidades e línguas. Se existir uma chave de modelo, o modelo só pode confirmar nomes dessa mesma lista.
3. Os advogados são ordenados pela coincidência com esses dados.
4. Cada cartão liga ao perfil original. O telefone, quando aparece, é o número publicado nesse perfil. A fotografia não é copiada.

O texto do caso não é gravado.

## Arranque local

É preciso Node.js 20 ou superior. Não há dependências para instalar.

```bash
npm test
npm start
```

Abra `http://127.0.0.1:8787`.

A configuração opcional está em [`.env.example`](.env.example). Copie para `.env` apenas no servidor. A variável `LLM_API_KEY` activa a leitura e a redacção pelo modelo; sem ela, a aplicação funciona na mesma com as regras locais.

## Documentação

- [Instalação](docs/instalacao.md)
- [Arquitectura](docs/arquitectura.md)
- [Dados e privacidade](docs/dados-e-privacidade.md)
- [Publicação](docs/publicacao.md)

## Estado de publicação

A interface está publicada em [https://harmonicolucas.github.io/JuriFind/](https://harmonicolucas.github.io/JuriFind/). O Pages serve a pasta `web/` e não executa a API. O alojamento da API, o DNS e um domínio `.co.mz` continuam por configurar. Os passos estão em [docs/publicacao.md](docs/publicacao.md).

## Licença

O código está sob a licença MIT. Os dados do directório não estão incluídos nesta licença.
