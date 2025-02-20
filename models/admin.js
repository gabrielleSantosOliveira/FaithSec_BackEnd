const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Admin = sequelize.define('Admin', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        cpf: {
            type: DataTypes.STRING(14),
            allowNull: false,
            unique: true,
        },
        nome: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        senha: {
            type: DataTypes.STRING(255), // Guardar o hash da senha
            allowNull: false,
        },
        cargo: {
            type: DataTypes.ENUM(
                'Coordenador de Enfermagem',
                'Supervisor de Enfermagem',
                'Gerente de Enfermagem',
                'Diretor de Enfermagem'
            ),
            allowNull: false,
        },
    }, {
        tableName: 'admin_users',
        timestamps: false, // Se quiser createdAt e updatedAt, remova essa opção
    });

    return Admin;
}

