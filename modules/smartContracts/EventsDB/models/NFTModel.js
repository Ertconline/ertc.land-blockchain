const { Sequelize, DataTypes, Op, Model } = require('sequelize');

module.exports = function (sequelize) {
    const Model = sequelize.define('NFTModel', {
        nonce: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        owner: { type: DataTypes.STRING, allowNull: false },
        validationId: { type: DataTypes.INTEGER, allowNull: true },
        blockIndex: { type: DataTypes.INTEGER, allowNull: true },
        data: { type: DataTypes.STRING, allowNull: true },
        isFreeze: { type: DataTypes.BOOLEAN, defaultValue: true },
    }, { timestamp: false });

    return Model;
}