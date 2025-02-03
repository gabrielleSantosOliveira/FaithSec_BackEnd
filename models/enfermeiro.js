const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Enfermeiro = sequelize.define('Enfermeiro', {
    nfc: {
      type: DataTypes.STRING(30),
      primaryKey: true
    },
    telefone1: {
      type: DataTypes.STRING(20)
    },
    telefone2: {
      type: DataTypes.STRING(20)
    },
    qtdAtend: {
      type: DataTypes.INTEGER
    },
    nome: {
      type: DataTypes.STRING(100)
    },
    senha: {
      type: DataTypes.STRING(20)
    },
    dataNasc: {
      type: DataTypes.DATE
    },
    cargo: {
      type: DataTypes.STRING(45)
    },
    cpf: {
      type: DataTypes.STRING(20)
    },
    endereco: {
      type: DataTypes.STRING(100)
    },
    estadoCracha: {
      type: DataTypes.ENUM('habilitado', 'desabilitado'),
      defaultValue: 'habilitado'
    },
    ala: {
      type: DataTypes.ENUM('UTI', 'Internação Geral', 'nenhum'),
      defaultValue: 'nenhum'
    }
  }, {
    tableName: 'enfermeiro',
    timestamps: false
  });

  return Enfermeiro;
};