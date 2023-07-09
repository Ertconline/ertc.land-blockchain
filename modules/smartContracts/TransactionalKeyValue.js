/**
 iZ³ | Izzzio blockchain - https://izzz.io
 */

const KeyValue = require('../keyvalue');

/**
 * Transactional key-value DB
 */
class TransactionalKeyValue {
    constructor(name) {
        /**
         * Содержит в себе транзакции, готовые к записи
         * @type {{}}
         */
        this.transactions = {};

        /**
         * Хранилище значений
         * @type {KeyValue}
         */
        this.db = new KeyValue(name);
    }

    /**
     * Получает данные из хранилища. Если есть не сохранённые данные, возвращает из них
     * @param {string} key
     * @param {Function} callback
     */
    get(key, callback = () => {}) {
        if (typeof this.transactions[key] !== 'undefined') {
            if (this.transactions[key] === null) {
                callback(true);
            } else {
                callback(null, this.transactions[key]);
            }
            return;
        }

        this.db.get(key, (err, val) => {
            if (err) {
                callback(err);
                return;
            }
            
            callback(null, val.toString());
        })
    }

    getMany(keys, callback = () => {}) {
        const result = {};
               
        for (const key of keys) {
            const transaction = this.transactions[key];
            if (typeof transaction !== 'undefined') {
                result[key] = transaction;
            }
        }

        keys = keys.filter(key => typeof result[key] === 'undefined');

        if (keys.length === 0) {
            callback(null, JSON.stringify(Object.values(result)));
            return;
        }

        this.db.getMany(keys, (err, results) => {
            if (err) {
                callback(err);
                return;
            }

            keys.forEach((key, index) => result[key] = results[index]);

            callback(null, JSON.stringify(Object.values(result)));
        })
        
    }

    /**
     * Сохраняет данные во временное транзакционное хранилище
     * @param {string} key
     * @param {string} value
     * @param {Function} callback
     */
    put(key, value, callback = () => {
    }) {
        this.transactions[key] = value;
        callback(null);
    }

    batch(items, callback = () => {}) {
        for (const item of items) {
            if (item.type === 'del') {
                this.transactions[item.key] = null;
            } else {
                this.transactions[item.key] = item.value;
            }
        }
        
        callback();
    }

    /**
     * Сохраняет в транзакционное хранилище информацию об удалении значения
     * @param key
     * @param callback
     */
    del(key, callback = () => {
    }) {
        this.transactions[key] = null;
        callback(null);
    }

    /**
     * Сброс очереди транзакций
     * @param callback
     */
    rollback(callback = () => {
    }) {
        this.transactions = {};
        callback(null);
    }

    /**
     * Запись данных транзакций в БД
     * @param callback
     */
    deploy(callback = () => {
    }) {
        let that = this;

        async function deployAll() {
            const batch = [];
            
            for (const key in that.transactions) {
                if (that.transactions.hasOwnProperty(key)) {
                    if (that.transactions[key] === null) {
                        batch.push({ type: 'del', key });
                    } else {
                        let value = that.transactions[key];
                        if (typeof value === 'object') {
                            value = JSON.stringify(value);
                        }
                        batch.push({ type: 'put', key, value });
                    }
                }
            }

            that.db.batch(batch, () => {
                that.rollback(() => {
                    callback(true);
                })
            })
        }

        deployAll();
    }

    /**
     * Save DB. Saves only deployed data
     * @param cb
     */
    save(cb) {
        return this.db.save(cb);
    }

    /**
     * Clear DB
     * @param cb
     */
    clear(cb) {
        this.transactions = {};
        return this.db.clear(cb);
    }

    close(cb){
        this.transactions = {};
        return this.db.close(cb);
    }
}

module.exports = TransactionalKeyValue;