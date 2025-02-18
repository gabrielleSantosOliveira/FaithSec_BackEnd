const cors = require('cors');
const express = require('express');
const { sequelize, Chamada, Enfermeiro, Paciente } = require('./config/database');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { Op } = require('sequelize');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const ioServer = http.createServer();

const wss = new WebSocket.Server({ server });

// Configuração do Socket.IO com CORS atualizado
const io = new Server(ioServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware de CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.static('public'));
app.use(express.static('.'));

// Função de broadcast WebSocket
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

//celular
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

// Adicione uma função específica para toggle do LED AMARELO
function toggleLed() {
  currentState.ledState = !currentState.ledState;
  broadcast({
    type: 'ledUpdate',
    data: { ledState: currentState.ledState }
  });
  console.log('Estado do LED alterado para:', currentState.ledState);
}

// Na configuração do WebSocket, ajuste o handler de mensagem
wss.on('connection', (ws) => {
  console.log('Novo cliente WebSocket conectado');

  // Envia estado inicial para o cliente
  ws.send(JSON.stringify({
    type: 'state',
    data: { ledState: currentState.ledState }
  }));

  ws.on('message', (message) => {
    try {
      // Log da mensagem raw
      const messageStr = message.toString();
      console.log('Mensagem raw recebida:', messageStr);

      // Ignora mensagens de controle do WebSocket
      if (messageStr.includes('probe')) {
        console.log('Mensagem de controle WebSocket recebida:', messageStr);
        return;
      }

      // Tenta fazer o parse do JSON
      const data = JSON.parse(messageStr);
      console.log('Mensagem parseada:', data);

      if (data.type === 'toggleYellowLed') {
        toggleLed();
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      // Somente loga o conteúdo se não for uma mensagem de controle
      if (!message.toString().includes('probe')) {
        console.error('Conteúdo da mensagem que causou erro:', message.toString());
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Erro no WebSocket:', error);
  });

  ws.on('close', () => {
    console.log('Cliente WebSocket desconectado');
  });
});

// Socket.IO connection handler
// Verificação de crachá em tempo real via WebSocketio.on('connection', (socket) => {
io.on('verificar-cracha', async (nfc) => {
  console.log('Cliente Socket.IO conectado');
  console.log('Clientes conectados:', io.engine.clientsCount);
  try {
    const enfermeiro = await Enfermeiro.findByPk(nfc);

    if (!enfermeiro) {
      console.log(`Crachá ${nfc} não encontrado.`);
      socket.emit('cracha-invalido');
      socket.disconnect();
      return
    }

    if (enfermeiro.estadoCracha !== 'habilitado') {
      console.log(`Crachá ${nfc} desabilitado. Desconectando enfermeiro.`);
      socket.emit('cracha-desabilitado');
      socket.disconnect();
      return
    }

    console.log(`Crachá ${nfc} está habilitado.`);
  } catch (error) {
    console.error('Erro ao verificar crachá:', error);
    socket.emit('erro-verificacao', error.message);
  }
});

// Estado global do sistema
let currentState = {
  ledState: false
};

// Rota para receber notificação da ESP32
app.post('/chamada', (req, res) => {
  console.log('Recebendo nova chamada!');
  try {
    // Aqui estava o erro - criticidade não estava sendo desestruturada do req.body
    const { leito, andar, quarto, ala, criticidade, isSimulation } = req.body;
    console.log('Dados recebidos:', { leito, andar, quarto, ala, criticidade, isSimulation });

    if (!criticidade || (criticidade !== 'Emergencia' && criticidade !== 'Auxilio')) {
      throw new Error('Criticidade inválida. Deve ser "Emergencia" ou "Auxilio"');
    }

    const chamadaData = { 
      leito, 
      andar, 
      quarto, 
      ala, 
      criticidade,
      timestamp: new Date().toLocaleTimeString() 
    };

    // Broadcast via WebSocket (para o celular)
    broadcast({
      type: 'newCall',
      data: chamadaData
    });

    // Emite via Socket.IO (para a web)
    io.emit('nova-chamada', chamadaData);

    // Salva no banco apenas se não for simulação (botão azul)
    if (!isSimulation) {
      Chamada.create({
        responsavel: responsavel || 'Sistema',
        data: new Date(),
        criticidade: criticidade,
        inicio: inicio || new Date().toTimeString().split(' ')[0],
        termino: null,
        nfc_enfermeiro: nfc_enfermeiro || null,
        duracao: null,
        idPaciente: idPaciente || 1,
        leito: leito,
        andar: andar,
        quarto: quarto,
        ala: ala
      }).then(() => {
        console.log('Chamada salva no banco com sucesso');
      }).catch(err => {
        console.error('Erro ao salvar chamada no banco:', err);
      });
    }

    res.json({
      success: true,
      message: `Chamada ${criticidade} recebida e notificada`
    });
  } catch (error) {
    console.error('Erro ao processar chamada:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chamadas.html'));
});

// Rotas de pacientes
app.get('/pacientes', async (req, res) => {
  try {
    const pacientes = await Paciente.findAll();
    res.json(pacientes);
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

app.get('/pacientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const paciente = await Paciente.findByPk(id);

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    res.json(paciente);
  } catch (error) {
    console.error('Erro ao buscar paciente:', error);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// Rotas de enfermeiros
app.get('/enfermeiros', async (req, res) => {
  try {
    const enfermeiros = await Enfermeiro.findAll({
      attributes: ['nfc', 'nome', 'cargo', 'estadoCracha', 'ala']
    });
    res.json(enfermeiros);
  } catch (error) {
    console.error('Erro ao buscar enfermeiros:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/enfermeiros/buscar', async (req, res) => {
  try {
    const { nome, ala, cargo, nfc, estadoCracha } = req.body;

    // Construindo a cláusula WHERE dinamicamente
    const whereClause = {};

    // Adiciona condições apenas se os campos foram fornecidos com valor não vazio
    if (nome && nome.trim()) {
      whereClause.nome = {
        [Op.like]: `%${nome.trim()}%`  // Busca parcial por nome
      };
    }

    if (nfc && nfc.trim()) {
      whereClause.nfc = nfc.trim();
      console.log(nfc)
    }

    if (cargo && cargo.trim()) {
      whereClause.cargo = cargo.trim();
    }

    if (estadoCracha && estadoCracha.trim()) {
      whereClause.estadoCracha = estadoCracha.trim();
    }

    if (ala && ala.trim()) {
      whereClause.ala = {
        [Op.eq]: ala  // Busca por data exata
      };
    }

    // Verifica se pelo menos um filtro foi aplicado
    if (Object.keys(whereClause).length === 0) {
      return res.status(400).json({
        error: "É necessário fornecer pelo menos um critério de filtro válido"
      });
    }

    const enfermeiros = await Enfermeiro.findAll({
      where: whereClause,
      attributes: {
      },
      order: [['nome', 'ASC']], // Ordena por nome
      limit: 20
    });

    res.json(enfermeiros);
  } catch (error) {
    console.error('Erro ao buscar enfermeiros:', error);
    res.status(500).json({
      error: "Erro ao buscar enfermeiros",
      details: error.message
    });
  }
});

// Atualização do estado do crachá
app.post('/atualizar-cracha/:nfc', async (req, res) => {
  try {
    const { nfc } = req.params;
    const { estado } = req.body;

    const enfermeiro = await Enfermeiro.findByPk(nfc);

    if (!enfermeiro) {
      return res.status(404).json({ error: 'Enfermeiro não encontrado' });
    }

    await enfermeiro.update({ estadoCracha: estado });

    if (estado !== 'habilitado') {
      console.log(`Emitindo evento para desconectar enfermeiro com crachá ${nfc}`);
      io.emit('cracha-desabilitado', { nfc });
    }

    res.json({ success: true, message: 'Estado atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar estado:', error);
    res.status(500).json({ error: error.message });
  }
});
// Nova rota específica para verificação mobile
app.get('/verificar-nfc-mobile/:nfc', async (req, res) => {
  try {
    const nfc = req.params.nfc;
    const enfermeiro = await Enfermeiro.findOne({
      where: {
        nfc: nfc,
        estadoCracha: 'habilitado'
      }
    });

    if (enfermeiro) {
      // Apenas acende o LED amarelo, sem finalizar a chamada
      broadcast({
        type: 'ledUpdate',
        data: { ledState: true }
      });

      currentState.ledState = true;

      res.json({
        valid: true,
        nome: enfermeiro.nome
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Erro ao verificar NFC mobile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Nova rota específica para verificação mobile
app.get('/verificar-nfc-mobile/:nfc', async (req, res) => {
  try {
    const nfc = req.params.nfc;
    const enfermeiro = await Enfermeiro.findOne({
      where: {
        nfc: nfc,
        estadoCracha: 'habilitado'
      }
    });

    if (enfermeiro) {
      // Apenas acende o LED amarelo, sem finalizar a chamada
      broadcast({
        type: 'ledUpdate',
        data: { ledState: true }
      });

      currentState.ledState = true;

      res.json({
        valid: true,
        nome: enfermeiro.nome
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Erro ao verificar NFC mobile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/verificar-nfc/:nfc', async (req, res) => {
  try {
    const nfc = req.params.nfc;
    const enfermeiro = await Enfermeiro.findOne({
      where: {
        nfc: nfc,
        estadoCracha: 'habilitado'
      }
    });

    if (enfermeiro) {
      // Apaga o LED amarelo quando lê o RFID
      broadcast({
        type: 'ledUpdate',
        data: { ledState: false }  // MUDOU AQUI: agora apaga
      });

      currentState.ledState = false;  // MUDOU AQUI: atualiza estado

      console.log('NFC válido detectado, finalizando chamada');
      io.emit('chamada-finalizada', { leito: 'Leito 07' });

      res.json({
        valid: true,
        nome: enfermeiro.nome
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Erro ao verificar NFC:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para cadastrar novo enfermeiro
app.post('/enfermeiro', async (req, res) => {
  try {
    console.log('Requisição recebida em /enfermeiro');
    console.log('Body:', req.body);

    const {
      nfc,
      telefone1,
      telefone2,
      nome,
      senha,
      dataNasc,
      cargo,
      cpf,
      endereco,
      estadoCracha,
      ala
    } = req.body;

    if (!nfc || !nome || !cpf || !senha) {
      console.log('Validação falhou - campos obrigatórios faltando');
      return res.status(400).json({
        error: 'Campos obrigatórios não preenchidos'
      });
    }

    const enfermeiroBusca = await Enfermeiro.findByPk(nfc);
    if (enfermeiroBusca) {
      console.log('NFC já existe:', nfc);
      return res.status(400).json({
        error: 'Já existe um enfermeiro cadastrado com este NFC'
      });
    }

    console.log('Tentando criar novo enfermeiro...');
    const novoEnfermeiro = await Enfermeiro.create({
      nfc,
      telefone1,
      telefone2,
      qtdAtend: 0,
      nome,
      senha,
      dataNasc: dataNasc ? new Date(dataNasc) : null,
      cargo,
      cpf,
      endereco,
      estadoCracha,
      ala
    });

    console.log('Enfermeiro criado com sucesso:', novoEnfermeiro.toJSON());

    return res.status(201).json({
      message: 'Enfermeiro cadastrado com sucesso',
      data: novoEnfermeiro
    });

  } catch (error) {
    console.error('Erro detalhado ao cadastrar enfermeiro:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor ao cadastrar enfermeiro',
      details: error.message
    });
  }
});

// Rota para atualizar o cadastro do enfermeiro
app.post('/enfermeiro/atualizar', async (req, res) => {
  try {
    console.log('Requisição recebida para atualizar enfermeiro');
    console.log('Body:', req.body);

    const {
      nfc,
      telefone1,
      telefone2,
      nome,
      password,
      dataNasc,
      role,
      cpf,
      address,
      ala
    } = req.body;

    // Validação: o NFC é obrigatório para localizar o enfermeiro
    if (!nfc) {
      console.log('NFC não fornecido para atualização');
      return res.status(400).json({ error: 'NFC é obrigatório para atualização' });
    }

    // Busca o enfermeiro pelo NFC
    const enfermeiro = await Enfermeiro.findByPk(nfc);
    if (!enfermeiro) {
      console.log('Enfermeiro não encontrado com o NFC:', nfc);
      return res.status(404).json({ error: 'Enfermeiro não encontrado' });
    }

    // Atualiza os campos conforme o mapeamento informado
    await enfermeiro.update({
      telefone1: telefone1,
      telefone2: telefone2, // conforme mapeamento recebido
      nome: nome,
      senha: password,
      dataNasc: dataNasc ? new Date(dataNasc) : null,
      cargo: role,
      cpf: cpf,
      endereco: address,
      ala: ala // conforme mapeamento recebido
    });

    console.log('Enfermeiro atualizado com sucesso:', enfermeiro.toJSON());
    return res.status(200).json({
      message: 'Cadastro do enfermeiro atualizado com sucesso',
      data: enfermeiro
    });

  } catch (error) {
    console.error('Erro ao atualizar enfermeiro:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor ao atualizar enfermeiro',
      details: error.message
    });
  }
});


// Rota para registrar chamada
app.get('/registrar-chamada', async (req, res) => {
  try {
    console.log('Registrar chamada - Query recebida:', req.query);
    const chamada = await Chamada.create({
      responsavel: req.query.responsavel,
      data: new Date(),
      criticidade: req.query.criticidade,
      inicio: req.query.inicio,
      termino: req.query.termino,
      idPaciente: req.query.idPaciente,
      nfc_enfermeiro: req.query.nfc_enfermeiro
    });
    console.log('Chamada criada:', chamada.toJSON());
    res.json({ success: true, chamada });
  } catch (error) {
    console.error('Erro ao registrar chamada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para listar chamadas
app.post('/chamadas', async (req, res) => {
  try {
    const { responsavel, data, time, criticidade, idChamada, nfc } = req.body;

    // Construindo a cláusula WHERE dinamicamente
    const whereClause = {};

    // Adiciona condições apenas se os campos foram fornecidos com valor não vazio
    if (nfc && nfc.trim()) whereClause.nfc_enfermeiro = nfc.trim();
    if (responsavel && responsavel.trim()) whereClause.responsavel = responsavel.trim();
    if (criticidade && criticidade.trim()) whereClause.criticidade = criticidade.trim();
    if (idChamada && idChamada.trim()) whereClause.idChamada = idChamada.trim();

    // Tratamento para data
    if (data && data.trim()) {
      whereClause.data = data;
    }

    // Tratamento para time (hora)
    if (time && time.trim()) {
      whereClause.inicio = time;
    }

    const chamadas = await Chamada.findAll({
      where: whereClause,
      order: [['idChamada', 'DESC']],
      limit: 20
    });

    res.json(chamadas.length ? chamadas : []);
  } catch (error) {
    console.error('Erro ao buscar chamadas:', error);
    res.status(500).json({
      error: "Erro ao buscar chamadas",
      details: error.message
    });
  }
});

// Rota para finalizar chamada
app.get('/finalizar-chamada', (req, res) => {
  const { leito } = req.query;

  console.log('Recebendo requisição para finalizar chamada do leito:', leito);

  if (!leito) {
    console.log('Erro: leito não fornecido');
    return res.status(400).json({
      success: false,
      error: 'Leito não fornecido'
    });
  }

  io.emit('chamada-finalizada', { leito });
  console.log('Evento chamada-finalizada emitido para o leito:', leito);

  res.json({
    success: true,
    message: `Chamada do leito ${leito} finalizada com sucesso`
  });
});

// Rota para login do enfermeiro
app.post('/login-enfermeiro', async (req, res) => {
  try {
    const { cpf, senha, nfc } = req.body;

    if (!cpf || !senha) {
      return res.status(400).json({ error: 'Nome e senha são obrigatórios' });
    }

    // Filtro base: cpf e senha
    const whereClause = { cpf, senha };

    // Se o NFC for enviado, adiciona ao filtro
    if (nfc) {
      whereClause.nfc = nfc;
    }

    const enfermeiro = await Enfermeiro.findOne({ where: whereClause });

    if (!enfermeiro) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!nfc) {
      // Caso sem NFC, retorna apenas sucesso
      return res.json({ success: true });
    }

    // Verifica se o cartão está habilitado
    if (enfermeiro.estadoCracha !== 'habilitado') {
      console.log(`Cartão ${nfc} não habilitado para o enfermeiro ${cpf}`);
      return res.status(403).json({ error: 'Cartão não habilitado' });
    }

    // Caso com NFC e cartão habilitado, retorna os dados completos
    return res.json(enfermeiro);

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Inicialização do servidor
server.listen(3001, '0.0.0.0', async () => {
  console.log('=== SERVIDOR INICIADO ===');
  console.log(`Ouvindo em: 0.0.0.0:3001`);

  // Imprimir endereços de rede
  const os = require('os');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        console.log(`Endereço IP: ${details.address}`);
      }
    });
  });
});

ioServer.listen(4000, () => {
  console.log('Socket.IO rodando na porta 4000');
});