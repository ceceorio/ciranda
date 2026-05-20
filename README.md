# Ciranda

Módulo independente de videoconferência da Fermento Cultural.

Este repositório foi criado para desenvolver, testar e publicar o Ciranda separadamente do site institucional e do sistema principal da Fermento.

## Objetivo

Publicar uma aplicação de videoconferência em ambiente próprio, inicialmente em:

```txt
ciranda.fermentocultural.com.br
```

## Escopo inicial

- Aplicação separada do sistema principal `ceceorio/fermcic`.
- Aplicação separada do site institucional `ceceorio/fermento-site`.
- Deploy independente em VPS com Node.js, PM2 e Nginx.
- Evolução por branches e pull requests.
- Integração futura com o sistema da Fermento somente depois de validação técnica.

## Regras de segurança

- Não commitar chaves, tokens, URLs privadas ou credenciais.
- Usar `.env` local no servidor.
- Manter `.env.example` apenas com nomes de variáveis, sem valores reais.
- Não alterar outros repositórios a partir deste projeto.

## Deploy planejado

Exemplo de arquitetura esperada:

```txt
GitHub: ceceorio/ciranda
Subdomínio: ciranda.fermentocultural.com.br
Processo PM2: ciranda
Porta interna sugerida: 3002
Proxy Nginx: ciranda.fermentocultural.com.br -> localhost:3002
SSL: Certbot / Let's Encrypt
```

## Próxima etapa

O Codex deve criar a aplicação base conforme as instruções do arquivo `AGENTS.md`, mantendo o projeto isolado e preparado para deploy em VPS.
