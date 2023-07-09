const { Sequelize, DataTypes, Op, Model } = require('sequelize');

module.exports = function (sequelize) {
    const Model = sequelize.define('EventsModel', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        eventName: { type: DataTypes.STRING, allowNull: false },
        contractAddress: { type: DataTypes.INTEGER, allowNull: false },
        timestamp: { type: DataTypes.BIGINT, allowNull: false },
        blockIndex: { type: DataTypes.INTEGER, allowNull: false },
        blockHash: { type: DataTypes.TEXT, allowNull: false },
        v1: { type: DataTypes.TEXT, allowNull: true },
        v2: { type: DataTypes.TEXT, allowNull: true },
        v3: { type: DataTypes.TEXT, allowNull: true },
        v4: { type: DataTypes.TEXT, allowNull: true },
        v5: { type: DataTypes.TEXT, allowNull: true },
        v6: { type: DataTypes.TEXT, allowNull: true },
        v7: { type: DataTypes.TEXT, allowNull: true },
        v8: { type: DataTypes.TEXT, allowNull: true },
        v9: { type: DataTypes.TEXT, allowNull: true },
        v10: { type: DataTypes.TEXT, allowNull: true },
    }, { timestamp: false });

    // Model.prototype.myCustomSetter = function (param, param2) {  }


    return Model;
}