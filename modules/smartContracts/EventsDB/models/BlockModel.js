const { Sequelize, DataTypes, Op, Model } = require('sequelize');

module.exports = function (sequelize) {
    const Model = sequelize.define('BlockModel', {
        blockIndex: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        hash: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
    }, { timestamp: false });

    return Model;
}