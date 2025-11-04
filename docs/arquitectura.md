# Arquitectura

```text
Browser (web/)
    |
    |  POST /api/recommend
    v
Servidor Node (src/server.js)
    |-- regras locais (src/classify.js)
    |-- modelo opcional (src/llm.js), só com áreas da lista
    |-- ordenação (src/recommend.js)
    |-- índice factual em cache (src/source.js)
    |-- telefone publicado, em memória (src/contacts.js)
    v
API pública do directório
https://encontreadvogados.co.mz/wp-json/wp/v2
```

O GitHub Pages pode servir a pasta `web/`. Não executa esta API. O backend tem de ficar noutro alojamento, por exemplo o contentor definido no `Dockerfile` ou o serviço descrito em `render.yaml`.

## Pedido de recomendação

`POST /api/recommend` recebe JSON:

```json
{
  "text": "Fui despedido sem justa causa em Nacala-Porto.",
  "location": "Nacala-Porto",
  "area": "",
  "strictLocation": false
}
```

A resposta traz as áreas identificadas, a lista ordenada, uma explicação por advogado, a ligação ao perfil e o aviso de que o resultado não é aconselhamento jurídico.

`GET /api/meta` devolve cidades e áreas que existem em algum perfil, para os filtros. `GET /api/health` indica se o índice está pronto, sem revelar segredos.

## Como a correspondência é calculada

As regras reconhecem temas frequentes no direito moçambicano: trabalho, família e alimentos, sucessões, DUAT, arrendamento, penal, fisco, banca, energia e recursos naturais, sociedades, migração, dados pessoais e outros. Cada tema só é aceite se o nome existir na taxonomia publicada pelo directório.

A pontuação soma o peso das áreas que o perfil realmente lista. Há um reforço se a cidade preferida ou referida coincide, e outro, menor, se uma língua referida consta do perfil. Sem área coincidente, o advogado não entra na lista. A cidade, por si, não chega.

O modelo, quando há chave, recebe o texto com emails e números longos ocultados e a lista fechada de áreas e cidades. Nomes fora dessa lista são descartados. Uma segunda chamada pode redigir a explicação; se o texto inventar uma área, prometer resultado ou falhar, fica a explicação construída a partir das áreas coincidentes.

## Protecção

- Corpo limitado a 20 KB e descrição entre 20 e 2000 caracteres.
- Limite de pedidos por endereço. Atrás de proxy, só com `TRUST_PROXY=true`.
- Cabeçalhos que impedem enquadramento e adivinhação do tipo de ficheiro.
- A interface, quando servida por este processo, só carrega recursos do próprio sítio e só fala com a própria API.
- Os ficheiros estáticos não saem da pasta `web/`.
- Não há registo do texto do caso.
- Não há endpoint para descarregar o índice completo.

## Ficheiros

| Pasta | Papel |
| --- | --- |
| `web/` | Interface estática. |
| `src/classify.js` | Leitura do caso. |
| `src/recommend.js` | Ordenação. |
| `src/source.js` | Leitura e cache do índice. |
| `src/llm.js` | Modelo opcional. |
| `src/contacts.js` | Telefone publicado e validação do domínio de origem. |
| `src/http.js` | Rotas, erros e ficheiros. |
| `test/` | Testes sem rede. |
