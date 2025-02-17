const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Paciente = sequelize.define('Paciente', {
    idPaciente: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(100)
    },
    datNasc: {
      type: DataTypes.DATE
    },
    rg: {
      type: DataTypes.CHAR(9)
    },
    nmrCertidao: {
      type: DataTypes.STRING(32)
    },
    telefone1: {
      type: DataTypes.STRING(17)
    },
    telefone2: {
      type: DataTypes.STRING(17)
    },
    endereco: {
      type: DataTypes.STRING(255)
    },
    procedencia: {
      type: DataTypes.STRING(100)
    },
    pessoaRespon: {
      type: DataTypes.STRING(100)
    },
    profissao: {
      type: DataTypes.STRING(50)
    },
    conjuge: {
      type: DataTypes.STRING(100)
    },
    nomeMae: {
      type: DataTypes.STRING(100)
    },
    nomePai: {
      type: DataTypes.STRING(100)
    },
    estadoCivil: {
      type: DataTypes.STRING(30)
    },
    cor: {
      type: DataTypes.STRING(45)
    },
    sexo: {
      type: DataTypes.STRING(45)
    },
    cpf: {
      type: DataTypes.STRING(45)
    }
  }, {
    tableName: 'paciente',
    timestamps: false
  });
  return Paciente;
};