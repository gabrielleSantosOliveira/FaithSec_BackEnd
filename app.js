const cors = require('cors');
const express = require('express');
const { sequelize, Chamada, Enfermeiro } = require('./config/database');
const path = require('path');
const app = express();

// Adicione isso antes das suas rotas
app.use(cors());

app.use(express.json());
app.use(express.static('public'));

// Rota para a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para listar enfermeiros
app.get('/enfermeiros', async (req, res) => {
  try {
    const enfermeiros = await Enfermeiro.findAll({
      attributes: ['nfc', 'nome', 'cargo', 'estadoCracha']
    });
    res.json(enfermeiros);
  } catch (error) {
    console.error('Erro ao buscar enfermeiros:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para atualizar estado do crachá
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

// Rota para verificar NFC
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
      res.json({ valid: true, nome: enfermeiro.nome });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Erro ao registrar chamada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
  
});

// Rota POST para criar um novo enfermeiro
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

    // Log dos dados após desestruturação
    console.log('Dados extraídos:', { 
      nfc, telefone1, telefone2, nome, senha, 
      dataNasc, cargo, cpf, endereco, estadoCracha, ala 
    });

    // Validações básicas
    if (!nfc || !nome || !cpf || !senha) {
      console.log('Validação falhou - campos obrigatórios faltando');
      return res.status(400).json({
        error: 'Campos obrigatórios não preenchidos'
      });
    }

    // Verifica se já existe um enfermeiro com o mesmo NFC
    const enfermeiroBusca = await Enfermeiro.findByPk(nfc);
    if (enfermeiroBusca) {
      console.log('NFC já existe:', nfc);
      return res.status(400).json({
        error: 'Já existe um enfermeiro cadastrado com este NFC'
      });
    }

    // Cria o novo enfermeiro
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
    const { 
      responsavel,
      criticidade,
      inicio,
      termino,
      cpf_paciente,
      nfc_enfermeiro
    } = req.query;

    const chamada = await Chamada.create({
      responsavel,
      data: new Date(),
      criticidade,
      inicio,
      termino,
      cpf_paciente,
      nfc_enfermeiro
    });

    res.json({ success: true, chamada });
  } catch (error) {
    console.error('Erro ao registrar chamada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com banco de dados estabelecida.');
    console.log(`Servidor rodando em: http://0.0.0.0:${PORT}`);
  } catch (error) {
    console.error('Erro ao conectar com banco de dados:', error);
  }
});