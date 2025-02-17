const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Chamada = sequelize.define('Chamada', {
    idChamada: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    responsavel: {
      type: DataTypes.STRING(45)
    },
    data: {
      type: DataTypes.DATEONLY
    },
    criticidade: {
      type: DataTypes.STRING(45)
    },
    inicio: {
      type: DataTypes.TIME
    },
    termino: {
      type: DataTypes.TIME
    },
    duracao: {
      type: DataTypes.TIME
    },
    idPaciente: {
      type: DataTypes.INTEGER,
      references: {
        model: 'paciente',
        key: 'idPaciente'
      }
    },
    nfc_enfermeiro: {
      type: DataTypes.STRING(40),
      references: {
        model: 'enfermeiro',
        key: 'nfc'
      }
    }
  }, {
    tableName: 'chamada',
    timestamps: false
  });
  return Chamada;
};