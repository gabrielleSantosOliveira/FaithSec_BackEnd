const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('outrofaithsec', 'root', 'admin', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql'
});

const Paciente = require('../models/paciente')(sequelize);
const Enfermeiro = require('../models/enfermeiro')(sequelize);
const Chamada = require('../models/chamada')(sequelize);

// Define os relacionamentos
Chamada.belongsTo(Paciente, {
  foreignKey: 'cpf_paciente',
  targetKey: 'cpf'
});

Chamada.belongsTo(Enfermeiro, {
  foreignKey: 'nfc_enfermeiro',
  targetKey: 'nfc'
});

module.exports = {
  sequelize,
  Chamada,
  Paciente,
  Enfermeiro
};