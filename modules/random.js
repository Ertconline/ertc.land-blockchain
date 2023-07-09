/**
 iZ³ | Izzzio blockchain - https://izzz.io
 */

module.exports = {
    int: function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    },
    arbitrary: function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }
};