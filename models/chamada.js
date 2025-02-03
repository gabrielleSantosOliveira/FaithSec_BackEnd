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
    cpf_paciente: {
      type: DataTypes.STRING(45)
    },
    nfc_enfermeiro: {
      type: DataTypes.STRING(40)
    }
  }, {
    tableName: 'chamada',
    timestamps: false
  });

  return Chamada;
};