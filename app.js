const cors = require('cors');
const express = require('express');
const { sequelize, Chamada, Enfermeiro } = require('./config/database');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.IO com CORS atualizado
const io = new Server(server, {
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

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Cliente Socket.IO conectado');
  console.log('Clientes conectados:', io.engine.clientsCount);
});

// Rota para receber notificação da ESP32
app.post('/chamada', (req, res) => {
  console.log('Recebendo nova chamada!');
  try {
    const { leito, andar, quarto, ala, criticidade } = req.body;
    console.log('Dados recebidos:', { leito, andar, quarto, ala, criticidade });

    if (!criticidade || (criticidade !== 'Emergencia' && criticidade !== 'Auxilio')) {
      throw new Error('Criticidade inválida. Deve ser "Emergencia" ou "Auxilio"');
    }

    io.emit('nova-chamada', { 
      leito, 
      andar, 
      quarto, 
      ala,
      criticidade
    });
    console.log('Evento nova-chamada emitido para todos os clientes. Criticidade:', criticidade);

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

app.post('/atualizar-cracha/:nfc', async (req, res) => {
  try {
    const { nfc } = req.params;
    const { estado } = req.body;

    const enfermeiro = await Enfermeiro.findByPk(nfc);

    if (!enfermeiro) {
      return res.status(404).json({ error: 'Enfermeiro não encontrado' });
    }

    await enfermeiro.update({ estadoCracha: estado });
    res.json({ success: true, message: 'Estado atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar estado:', error);
    res.status(500).json({ error: error.message });
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
      console.log('NFC válido detectado, finalizando chamada');
      io.emit('chamada-finalizada', { leito: 'Leito 01' });
      
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
      cpf_paciente: req.query.cpf_paciente,
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
    const { nfc } = req.body;
    const whereClause = nfc ? { nfc_enfermeiro: nfc } : {};

    const chamadas = await Chamada.findAll({
      where: whereClause,
      order: [['idChamada', 'DESC']],
      limit: 20
    });

    res.json(chamadas);
  } catch (error) {
    console.error('Erro ao buscar chamadas:', error);
    res.status(500).json({ error: error.message });
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

// Inicialização do servidor
server.listen(3000, '0.0.0.0', async () => {
  console.log('=== SERVIDOR INICIADO ===');
  console.log(`Ouvindo em: 0.0.0.0:3000`);
  
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