const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('outrofaithsec', 'root', 'admin', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql'
});

const Paciente = require('../models/paciente')(sequelize);
const Enfermeiro = require('../models/enfermeiro')(sequelize);
const Chamada = require('../models/chamada')(sequelize);
const Admin = require('../models/admin')(sequelize);

// Define os relacionamentos
Chamada.belongsTo(Paciente, {
  foreignKey: 'idPaciente',
  targetKey: 'idPaciente'
});

Chamada.belongsTo(Enfermeiro, {
  foreignKey: 'nfc_enfermeiro',
  targetKey: 'nfc'
});

module.exports = {
  sequelize,
  Chamada,
  Paciente,
  Enfermeiro,
  Admin
};