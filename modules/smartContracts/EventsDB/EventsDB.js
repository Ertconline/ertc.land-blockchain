/**
 iZ³ | Izzzio blockchain - https://izzz.io
 */


const logger = new (require('../../logger'))('ContractEvents');
const storj = require('../../instanceStorage');
const utils = require('../../utils');
const BigNumber = require('bignumber.js');
const { Sequelize, DataTypes, Op, Model, where } = require('sequelize');
const { EventsModel, NFTModel, BlockModel } = require('./models');

/**
 * Events index database
 */
class EventsDB {
    static async create({ path }) {
        const config = storj.get('config');

        if (path === '' || path === ':memory:') {
            path = path;
        } else {
            path = config.workDir + path;
        }
        
        const db = new Sequelize({
            dialect: 'postgres',
            database: process.env.DB_NAME,
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            logging: false,
        });

        await db.authenticate();
        const eventsModel = EventsModel(db);
        const NftModel = NFTModel(db);
        const blockModel = BlockModel(db);
        await db.sync({ alter: true });

        const models = [
            { key: 'eventsModel', value: eventsModel },
            { key: 'NftModel', value: NftModel },
            { key: 'blockModel', value: blockModel },
        ];

        const smartContracts = new this({ path, config, db, models });
        return smartContracts;
    }

    constructor({ path, config, db, models }) {
        this.path = path;
        this.config = config;
        this.db = db;

        for (const {key, value} of models) {
            this[key] = value;
        }

        this._eventHandler = {};
        this._transactions = {};

        storj.put('ContractEvents', this);

        const blockHandler = storj.get('blockHandler');
        blockHandler.registerBlockHandler('EcmaContractDeploy', (blockData, block, callback) => this.createBlockHeaderData(blockData, block, callback));
        blockHandler.registerBlockHandler('EcmaContractCallBlock', (blockData, block, callback) => this.createBlockHeaderData(blockData, block, callback));
        blockHandler.registerBlockHandler('Empty', (blockData, block, callback) => this.createBlockHeaderData(blockData, block, callback));
        blockHandler.registerBlockHandler('Keyring', (blockData, block, callback) => this.createBlockHeaderData(blockData, block, callback));
        blockHandler.registerBlockHandler('KO-KEY-ISSUE', (blockData, block, callback) => this.createBlockHeaderData(blockData, block, callback));
        blockHandler.registerBlockHandler('KO-KEY-DELETE', (blockData, block, callback) => this.createBlockHeaderData(blockData, block, callback));
    }

    async createBlockHeaderData(blockData, block, callback) {
        try {
            const instanceData = {
                blockIndex: block.index,
                hash: block.hash,
                type: blockData.type,
            };
            
            let instance = await this.blockModel.findOne({ where: { blockIndex: instanceData.blockIndex } });
            if (!instance) {
                await this.blockModel.create(instanceData, { fields: ['blockIndex', 'hash', 'type'], returning: false });
            } else {
                await this.blockModel.update(instanceData, { where: { blockIndex: instanceData.blockIndex }, fields: ['blockIndex', 'hash', 'type'], returning: false });
            }

            callback(null);
        } catch (e) {
            console.log('handle block to db', 'err', e);
            callback(e);
        }
    }

    /**
     * Flush DB to disk
     * @param {Function} cb
     */
    flush(cb) {
        cb();
    }

    _checkTransaction(block, contractAddress, reset=false) {
        block = String(block);
        contractAddress = String(contractAddress);

        if (!this._transactions[block]) {
            this._transactions[block] = {};
        }
        
        if (!this._transactions[block][contractAddress] || reset) {
            this._transactions[block][contractAddress] = {
                'events': [],
                'nfts': [],
            };
        }

        if (!this._transactions.lockUnlockNft || reset) {
            this._transactions.lockUnlockNft = new Set();
        }

        if (!this._transactions.transferNft || reset) {
            this._transactions.transferNft = new Set();
        }

        if (!this._transactions.transferNftByValidationId || reset) {
            this._transactions.transferNftByValidationId = new Set();
        }
    }

    /**
     * Handle block replayed
     * @param blockIndex
     * @param cb
     * @private
     */
    async _handleBlockReplay(blockIndex, cb) {
        this._transactions[String(blockIndex)] = {};

        try {
            let attributes = [
                'id'
            ];
            const eventsId = (await this.eventsModel.findAll({ where: { blockIndex }, attributes, raw: true })).map(_ => _.id);
            attributes = [
                'nonce'             
            ];
            const nftId = (await this.NftModel.findAll({ where: { blockIndex }, attributes, raw: true })).map(_ => _.nonce);
            
            await Promise.all([
                this.eventsModel.destroy({ 
                    where: { 
                        id: eventsId,
                    }
                }),
                this.NftModel.destroy({
                    where: {
                        nonce: nftId,
                    }
                })
            ]);

            cb(null);
        } catch (e) {
            console.log('e', e);
            cb(e);
        }
    }

    /**
     * Handle event emit
     * @param contract
     * @param event
     * @param {array} params
     * @param block
     * @param cb
     */
    async emitEvents(event, cb) {
        try {
            const contractAddress = event.contractAddress;
            const blockIndex = event.blockIndex;
            const eventType = event.type;

            this._checkTransaction(blockIndex, contractAddress);
            this._transactions[blockIndex][contractAddress][eventType].push(event);
            
            cb(null);
        } catch (e) {
            console.log('Event emit error', e);
            cb(e);
        }
    }

    /**
     * Rollback block contract Events
     * @param contractAddress
     * @param blockIndex
     * @param cb
     */
    async rollback(contractAddress, blockIndex, cb) {
        // if (blockIndex === -1) return cb(null);

        // this._checkTransaction(blockIndex, contractAddress, true);

        // console.log('Rollback events', blockIndex, contractAddress);

        // await this.eventsModel.destroy({ 
        //     where: { 
        //         blockIndex,
        //         contractAddress
        //     }
        // });

        // await this.NftModel.destroy({
        //     where: {
        //         blockIndex,
        //     }
        // })

        cb(null);
    }

    async _deployEvents(contract, block) {
        const events = this._transactions[block][contract]['events'].flatMap(event => {
            const params = event.params.map(param => {
                return {
                    v1: param[0],
                    v2: param[1],
                    v3: param[2],
                    v4: param[3],
                    v5: param[4],
                    v6: param[5],
                    v7: param[6],
                    v8: param[7],
                    v9: param[8],
                    v10: param[9],
                    eventName: event.name,
                    contractAddress: event.contractAddress,
                    timestamp: event.timestamp,
                    blockIndex: event.blockIndex,
                    blockHash: event.hash,
                }
            });
            return params;
        });
       
        if (events.length === 0) return;

        const eventsCreated = await this.eventsModel.bulkCreate(events);
        await Promise.all(eventsCreated.map(instance => this._handleEvent(contract, instance.eventName, instance)));
    }

    async _deployNFT(contractAddress, blockIndex) {
        let nfts = this._transactions[blockIndex][contractAddress]['nfts'].map(async event => {
            const params = event.params.map(async ([nonce, owner, validationId, data, isFreeze]) => {
                const nftData = {
                    nonce: isFinite(nonce) ? Number(nonce) : nonce, 
                    owner, 
                    validationId, 
                    data,
                    blockIndex: event.blockIndex,
                    isFreeze,
                };

                for (const key in nftData) {
                    if (typeof nftData[key] === 'undefined') {
                        delete nftData[key];
                    }
                }

                return nftData;
            });

            return Promise.all(params);
        });

        nfts = await Promise.all(nfts);
        nfts = nfts.flat();

        if (nfts.length === 0) return;

        const nftsCreated = await this.NftModel.bulkCreate(nfts, { 
            updateOnDuplicate: ['owner'],
        });
        await Promise.all(nftsCreated.map(instance => 
            this._handleEvent(contractAddress, 'NFT change', instance)));
    }

    async _lockUnlockNft() {
        const lockUnlockNftPromise = [...this._transactions.lockUnlockNft].map(({ isFreeze, nonces }) => {
            return this.NftModel.update({ isFreeze }, { 
                where: {
                    nonce: nonces,
                },
                fields: ['isFreeze'],
                returning: false,
            })
        });

        await Promise.all(lockUnlockNftPromise);
    }

    async _transferNft() {
        console.time('_transactions.transferNft loop');
        const transferPromise = [...this._transactions.transferNft].map(({ nonces, to }) => {
            return this.NftModel.update({ owner: to }, {
                where: {
                    nonce: nonces,
                },
                fields: ['owner'],
                returning: false,
            })
        });

        await Promise.all(transferPromise);

        console.timeEnd('_transactions.transferNft loop');
        console.time('_transactions.transferNftByValidationId loop');

        const transferNftByValidationIdPromise = [...this._transactions.transferNftByValidationId].map(({ nonces, to }) => {
            return this.NftModel.update({ owner: to }, {
                where: {
                    nonce: nonces,
                },
                fields: ['owner'],
                returning: false,
            })
        })
        
        await Promise.all(transferNftByValidationIdPromise);

        console.timeEnd('_transactions.transferNftByValidationId loop');

    }

    /**
     * Deploy block contract Events
     * @param contractAddress
     * @param blockIndex
     * @param cb
     */
    async deploy(contractAddress, blockIndex, cb) {
        console.time('deploy');
        this._checkTransaction(blockIndex, contractAddress);
        
        console.time('deploy _deployEvents');
        while (true) {
            try {
                await this._deployEvents(contractAddress, blockIndex);
                break;
            } catch (e) {
                console.log('Deploy events');
                logger.error(e);
            }
        }
        console.timeEnd('deploy _deployEvents');

        console.time('deploy _deployNFT');

        while (true) {
            try {
                await this._deployNFT(contractAddress, blockIndex);
                break;
            } catch (e) {
                console.log('Deploy nft');
                logger.error(e);
            }
        }
        console.timeEnd('deploy _deployNFT');

        console.time('deploy _lockUnlockNft');

        while (true) {
            try {
                await this._lockUnlockNft();
                break;
            } catch (e) {
                console.log('Unlock/Lock nft');
                logger.error(e);
            }
        }
        console.timeEnd('deploy _lockUnlockNft');

        console.time('deploy _transferNft');

        while (true) {
            try {
                await this._transferNft();
                break;
            } catch (e) {
                console.log('Transfer nft');
                logger.error(e);
            }
        }
        console.timeEnd('deploy _transferNft');

        
        this._checkTransaction(blockIndex, contractAddress, true);
        console.timeEnd('deploy');

        cb(null);
    }

    async _handleEvent(contract, event, args) {
        const key = `${contract}_${event}`;

        const eventsHandle = this._eventHandler[key] || [];
        
        for (const eventHandle of eventsHandle) {
            eventHandle(contract, event, args);
        }
    }

    addEventHandler(contract, event, callback) {
        const key = `${contract}_${event}`;

        if (typeof this._eventHandler[key] === 'undefined') {
            this._eventHandler[key] = [];
        }

        this._eventHandler[key].push(callback);
        return key;
    }

    async lockOrUnlockNftByValidationId(amount, validationId, owner, isFreeze, cb) {
        try {
            const count = await this.NftModel.count({ where: { validationId, owner, isFreeze: !isFreeze } });
            if (amount > count) {
                cb(new Error(`Amount is too big, max: ${amount}/${count}`));
                return;
            }

            const nfts = await this.NftModel.findAll({ 
                attributes: ['nonce'],
                where: { validationId, owner, isFreeze: !isFreeze }, 
                limit: amount,
                raw: true,
            });

            const nonces = nfts.map(_ => _.nonce);

            while (true) {
                const nonceList = nonces.splice(0, 100_000);
                if (nonceList.length === 0) break;

                this._transactions.lockUnlockNft.add({ owner, validationId, amount, isFreeze, nonces: nonceList });
            }

            cb(null, nonces);
        } catch (e) {
            cb(e)
        }
    }
   
    async transferNft(event, cb) {
        try {
            console.time('transferNft');
            const [from, to, amount] = event.params;
            const isFreeze = false;
            const noncesUsed = [...this._transactions.transferNft].flatMap(_ => _.nonces);

            console.time('transferNft-count');
            const count = await this.NftModel.count({ 
                where: { 
                    nonce: { [Op.not]: noncesUsed }, 
                    owner: from, 
                    isFreeze 
                },
            });

            if (amount > count) {
                cb(new Error(`Amount is too big, max: ${amount}/${count}`));
                return;
            }
            console.timeEnd('transferNft-count');

            console.time('transferNft-findAll');
            const nfts = await this.NftModel.findAll({ 
                attributes: ['nonce'],
                where: { 
                    owner: from, 
                    isFreeze, 
                    nonce: { [Op.not]: noncesUsed },
                }, 
                limit: amount,
                raw: true,
            });

            const nonces = nfts.map(_ => _.nonce);
            console.timeEnd('transferNft-findAll');
 
            while (true) {
                const nonceList = nonces.splice(0, 100_000);
                if (nonceList.length === 0) break;

                this._transactions.transferNft.add({ from, to, amount, isFreeze, nonces: nonceList });
            }

            console.timeEnd('transferNft');
            cb(null);
        } catch (e) {
            cb(e);
        }
    }

    async transferNftByValidationId(event, cb) {
        try {
            const [validationId, isFreeze, from, to, amount] = event.params;
            const noncesUsed = [...this._transactions.transferNftByValidationId].flatMap(_ => _.nonces);

            const whereQuery = { 
                nonce: { [Op.not]: noncesUsed }, 
                owner: from,
                isFreeze,
            }

            
            if (isFinite(Number(validationId))) {
                whereQuery['validationId'] = Number(validationId);
            }
            
            const count = await this.NftModel.count({ 
                where: { 
                    ...whereQuery,
                }
            });

            if (amount > count) {
                cb(new Error(`Amount is too big, max: ${amount}/${count}`));
                return;
            }

            const nfts = await this.NftModel.findAll({ 
                attributes: ['nonce'],
                where: { 
                    ...whereQuery,
                },
                limit: amount,
                raw: true,
            });

            const nonces = nfts.map(_ => _.nonce);

            while (true) {
                const nonceList = nonces.splice(0, 100_000);
                if (nonceList.length === 0) break;

                this._transactions.transferNftByValidationId.add({ from, to, amount, nonces: nonceList });
            }

            cb(null);
        } catch (e) {
            cb(e);
        }
    }
}

module.exports = EventsDB;