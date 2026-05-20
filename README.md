# Ciranda

Ciranda e o modulo independente de videoconferencia da **Plataforma Fermento - Gestao Sociocultural**.

Ambiente de teste:

```text
https://ciranda.fermentocultural.com.br
```

## Escopo desta versao

Esta primeira entrega cria uma base funcional e independente com:

- tela de entrada da sala;
- campo para nome do participante;
- campo para nome da sala;
- estrutura visual de sala de video;
- captura local de audio/video via navegador;
- controles iniciais de microfone, camera, compartilhamento de tela e sair;
- rota tecnica `/health`;
- porta configuravel por variavel de ambiente, com padrao `3002`;
- estrutura preparada para evoluir com WebRTC direto, sem SDK externo nesta primeira entrega.

## Requisitos

- Node.js 18 ou superior.
- npm.
- HTTPS no ambiente publico para camera/microfone funcionarem corretamente nos navegadores.

## Instalacao

```bash
npm install
```

> A versao atual nao possui dependencias externas, mas `npm install` deve ser mantido no fluxo da VPS para compatibilidade com proximas entregas.

## Build

```bash
npm run build
```

O build copia os arquivos de `public/` para `dist/`.

## Start

```bash
npm start
```

Por padrao a aplicacao sobe na porta `3002`.

Para usar outra porta:

```bash
PORT=3002 npm start
```

## Health check

```bash
curl http://localhost:3002/health
```

Resposta esperada:

```json
{
  "ok": true,
  "service": "ciranda",
  "status": "healthy",
  "timestamp": "..."
}
```

## Deploy com PM2

Exemplo:

```bash
npm install
npm run build
PORT=3002 pm2 start server.js --name ciranda
pm2 save
```

Para reiniciar depois de uma atualizacao:

```bash
npm install
npm run build
pm2 restart ciranda
```

## Nginx

O Nginx deve fazer proxy do subdominio para a porta interna `3002`.

Exemplo conceitual:

```nginx
server {
  server_name ciranda.fermentocultural.com.br;

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Variaveis de ambiente

Use `.env.example` como referencia. Nao commitar `.env` real.

```text
PORT=3002
VIDEO_PROVIDER=direct-webrtc
PUBLIC_STUN_URL=stun:stun.l.google.com:19302
```

## Preparacao para WebRTC direto

A estrutura de video esta isolada em:

```text
public/video-provider.js
```

Hoje ela usa um provedor `direct-webrtc` inicial, sem token, SDK externo ou segredo. A proxima etapa e implementar a sinalizacao e a negociacao WebRTC direta dentro do proprio Ciranda.

## Regras do projeto

- Nao mexer em `ceceorio/fermcic`.
- Nao mexer em `ceceorio/fermento-site`.
- Manter o Ciranda independente.
- Nao commitar `.env` real.
- Nao inserir chaves, tokens ou segredos no codigo.
