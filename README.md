# Faith-Sec Backend

Faith-Sec Backend é a API responsável pela comunicação entre o frontend e o banco de dados do sistema de chamada de enfermagem.

## Requisitos

- **Node.js** (recomenda-se a versão LTS)
- **MySQL** instalado na máquina
- **Banco de dados importado**

## Configuração do Banco de Dados

Para rodar o backend corretamente, é necessário importar o banco de dados. Siga o passo a passo abaixo para importar o arquivo `faithsecBD.sql` no **MySQL Workbench**:

### Passo a Passo para Importar o Banco de Dados

1. Abra o **MySQL Workbench**.
2. Conecte-se ao seu servidor MySQL.
3. Clique em **Server** no menu superior e selecione **Data Import**.
4. Em **Import Options**, selecione **Import from Self-Contained File** e escolha o arquivo `faithsecBD.sql`.
5. Em **Default Schema to be Imported To**, selecione ou crie um schema com o nome **outrofaithsec**.
6. Clique em **Start Import** e aguarde a conclusão.
7. Verifique se as tabelas foram importadas corretamente rodando `SHOW TABLES;` no SQL Editor.

O arquivo do banco de dados pode ser encontrado neste repositório: [faithsecBD.sql](https://github.com/gabrielleSantosOliveira/faithSec_atuaizado/blob/main/faithsecBD.sql)

### Configuração do Acesso ao Banco de Dados

O backend está configurado para utilizar o usuário **root** com a senha **admin**. Caso necessário, essas credenciais podem ser alteradas no arquivo `database.js`, localizado na pasta `config`.

## Instalação e Execução do Backend

1. Instale as dependências:
   ```sh
   npm install
   ```
2. Inicie o servidor backend:
   ```sh
   node app.js
   ```
3. O backend estará rodando e pronto para receber requisições.

## Dependências Utilizadas

- **Express** - Framework para Node.js.
- **MySQL2** - Cliente MySQL para Node.js.
- **Sequelize** - ORM para MySQL.
- **Socket.io** - Permite comunicação em tempo real.
- **WS** - Suporte a WebSockets.
- **CORS** - Middleware para permitir requisições de origens diferentes.
- **Path** - Manipulação de caminhos de arquivos.

## Documentação das Bibliotecas Principais

- [Express](https://expressjs.com/)
- [MySQL2](https://www.npmjs.com/package/mysql2)
- [Sequelize](https://sequelize.org/docs/v6/getting-started/)
- [Socket.io](https://socket.io/docs/)
- [WS](https://github.com/websockets/ws)
- [CORS](https://www.npmjs.com/package/cors)
- [Path](https://nodejs.org/api/path.html)

## Contribuição

1. Faça um fork do repositório.
2. Crie uma branch para sua funcionalidade (`git checkout -b minha-feature`).
3. Faça commit das alterações (`git commit -m 'Adiciona nova funcionalidade'`).
4. Envie as mudanças (`git push origin minha-feature`).
5. Abra um Pull Request.

## Licença

Este projeto está sob a licença MIT. Para mais detalhes, consulte o arquivo `LICENSE`.

