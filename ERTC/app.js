
/**
 * Contract address
 * @type {string}
 */
const logger = new (require(global.PATH.mainDir + '/modules/logger'))("ERTC");
const storj = require(global.PATH.mainDir + '/modules/instanceStorage');
const DApp = require(global.PATH.mainDir + '/app/DApp');
const ContractConnector = require(global.PATH.mainDir + '/modules/smartContracts/connectors/ContractConnector');
const TokenContractConnector = require(global.PATH.mainDir + '/modules/smartContracts/connectors/TokenContractConnector');
const fs = require('fs');
const { Op, Sequelize } = require('sequelize');

/**
 * ERTC DApp
 * Provides API interface for DApp
 */
class App extends DApp {


    /**
     * Initialize
     */
    async init() {
        logger.info('ERTC DApp started');

        //Load contract address from config
        const config = this.getConfig();
        const appConfig = this.getAppConfig();

        this.deployedContractAddress = appConfig.deployedContractAddress;
        if (config.newNetwork) {
            if(this.deployedContractAddress) {
                if(!await this.contracts.ecmaPromise.contractExists(this.deployedContractAddress)) {
                    logger.error('No deployed contract found! Deploying...');
                    const ERTCContract = fs.readFileSync('contract.js').toString();
                    let newBlock = await this.contracts.ecmaPromise.deployContract(ERTCContract, 0);
                    console.log('!!!!!!!!!!!');
                    this.deployedContractAddress = newBlock.block.index;
                    logger.info('Contract deployed at ' + this.deployedContractAddress);
                }
            } else {
                logger.warning('Contract disabled');
            }
        }

        
        function checkLimit(limit, max, defaultValue) {
            if (!isFinite(limit)) {
                return defaultValue;
            }

            if (Number(limit) <= max) {
                return defaultValue;
            }

            return Number(limit);
        }

        
        function blockDataToEasyList(blockData) {
            const block = JSON.parse(blockData);
            const index = blockData.match(/"index":(\d+),/)[1];
            const type = block.data.match(/\"type\":\"(\w+)"/)?.[1] || 'Genesis';
            const timestamp = blockData.match(/"timestamp":(\d+),/)[1];
            const size = block.data.length;
            return {
                index,
                type,
                timestamp,
                size,
            }
        }

        const getValidationsByIds = async (validationIds) => {
            const eventsModel = this.events.eventsModel;
            const filterQuery = {
                where: { 
                    eventName: 'Validation',
                    v1: validationIds.map(_ => String(_)),
                },
            };

            const items = await eventsModel.findAll(filterQuery);
            return items;
        }

        const createPagination = (req, maxLimit, defaultLimit) => {
            const page = Number(req.query.page) || 1;
            const limit = checkLimit(req.query.limit, maxLimit, defaultLimit);
            const offset = isFinite(page) && page > 1 ? (page - 1) * limit : 0;
            return { page, limit, offset }
        }

        this.network.rpc.registerPostHandler('/contracts/events/transactions/', async (req, res) => {
            try {
                const search = req.query.search;
                const { page, limit, offset } = createPagination(req, 100, 11);
                const caller = req.query.public_key || req.publicKey;

                const eventsModel = this.events.eventsModel;
            
                const searchWhere = {
                    [Op.or]: [
                        { blockIndex: search },
                        { v1: { [Op.substring]: search } },
                        { v2: { [Op.substring]: search } },
                        { v3: { [Op.substring]: search } },
                        { v4: { [Op.substring]: search } },
                        { v5: { [Op.substring]: search } },
                        { v6: { [Op.substring]: search } },
                        { v7: { [Op.substring]: search } },
                    ],
                };

                const where = {
                    eventName: 'Transfer',
                    [Op.or]: [
                        { v1: caller },
                        { v2: caller },
                    ],
                };

                if (search) {
                    where[Op.or] = where[Op.or].map(_ => ({ ..._, ...searchWhere, }));
                }

                const attributes = [
                    ['v1', 'fromPublicKey'],
                    ['v2', 'toPublicKey'],
                    ['v3', 'amount'],
                    ['v4', 'currency'],
                    ['v5', 'transactionType'],
                    ['v6', 'comment'],
                    ['v7', 'timestamp'],
                    ['blockIndex', 'blockIndex']             
                ];

                const items = await eventsModel.findAll({
                    attributes,
                    where,
                    limit,
                    offset,
                    order: [
                        ['blockIndex', 'DESC']
                    ]
                });

                const itemsCount = await eventsModel.count({
                    where,
                })

                res.send({
                    result: {
                        items,
                        count: itemsCount,
                    }
                });
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        });

        this.network.rpc.registerPostHandler('/explorer/header/', async (req, res) => {
            try {
                const connectedPeers = this.network.getCurrentPeers();
                const peersCount = connectedPeers.length + 1;
                const blockHeight = storj.get('maxBlock');

                res.send({
                    result: {
                        peersCount,
                        blockHeight,
                    }
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        });

        this.network.rpc.registerPostHandler('/explorer/blocks/list', async (req, res) => {
            try {
                const { page, limit, offset } = createPagination(req, 100, 20);
                const hideEmptyBlock = req.query.hideEmptyBlock == 1;

                const blockModel = this.events.blockModel;

                const filterQuery = {
                    attributes: ['blockIndex'],
                };

                if (hideEmptyBlock) {
                    filterQuery['where'] = { type: { [Op.not]: 'Empty' } };
                }

                const count = await blockModel.count();
                const order = [
                    ['blockIndex', 'DESC']
                ];
                const blockHeaders = await blockModel.findAll({ ...filterQuery, limit, offset, order });

                const blocksId = blockHeaders.map(_ => _.blockIndex);
                this.blockchain.getBlocksByids(blocksId, (err, values) => {
                    values = values.map(blockData => blockDataToEasyList(blockData));

                    res.send({ 
                        result: {
                            items: values,
                            count
                        }
                    });
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        });

        this.network.rpc.registerPostHandler('/explorer/block/:blockIndex', async (req, res) => {
            try {
                const blockIndex = Number(req.params.blockIndex);
                this.blockchain.getBlockById(blockIndex, (err, block) => {
                    res.send({
                        result: block,
                    })
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        });

        this.network.rpc.registerPostHandler('/explorer/block/:blockIndex/nfts', async (req, res) => {
            try {
                const blockIndex = Number(req.params.blockIndex);
                const nftModel = this.events.nftModel;

                const { page, limit, offset } = createPagination(req, 300, 100);

                const filterQuery = { 
                    where: { 
                        blockIndex 
                    } 
                };

                const nfts = await nftModel.findAll({ ...filterQuery, limit, offset });
                const count = await nftModel.count({ ...filterQuery });
                res.send({ 
                    result: {
                        items: nfts,
                        count,
                    }
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        });

        this.network.rpc.registerPostHandler('/explorer/block/:blockIndex/validations', async (req, res) => {
            try {
                const blockIndex = Number(req.params.blockIndex);
                const nftModel = this.events.nftModel;

                const nfts = await nftModel.findAll({ where: { blockIndex } });
                if (nfts.length === 0) {
                    res.send({
                        result: [],
                    });
                    return;
                }
                const validationIds = [...new Set(nfts.map(_ => _.validationId))];
                const validations = await getValidationsByIds(validationIds);

                res.send({ 
                    result: validations,
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        });

        this.network.rpc.registerPostHandler('/explorer/nft/:nftId', async (req, res) => {
            try {
                const nftId = Number(req.params.nftId);
                const nftModel = this.events.nftModel;

                const nft = await nftModel.findOne({ where: { nonce: nftId } });
                res.send({ 
                    result: nft,
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        })

        this.network.rpc.registerPostHandler('/explorer/wallet/:address/nfts', async (req, res) => {
            try {
                const owner = req.params.address;

                const { page, limit, offset } = createPagination(req, 100, 13);

                const filterQuery = {
                    where: { owner },
                }

                const nftModel = this.events.nftModel;
                const nfts = await nftModel.findAll({ 
                    ...filterQuery, 
                    limit, 
                    offset, 
                    order: [
                        ['nonce', 'DESC']
                    ]
                });
                const nftsCounts = await nftModel.count({ ...filterQuery });
                
                res.send({
                    result: {
                        items: nfts,
                        count: nftsCounts,
                    }
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        })

        this.network.rpc.registerPostHandler('/explorer/search/:searchType', async (req, res) => {
            try {
                const searchType = req.params.searchType;
                const search = req.query.search;

                const { page, limit, offset } = createPagination(req, 100, 20);

                const nftModel = this.events.nftModel;
                const eventsModel = this.events.eventsModel;

                if (searchType === 'blockid') {
                    this.blockchain.getBlocksByids([search], (err, blockDatas) => {
                        blockDatas = blockDatas.map(_ => blockDataToEasyList(_));
                        res.send({ 
                            result: {
                                items: blockDatas,
                                count: 1
                            }
                        });
                    })
                } else if (searchType === 'squareid') {
                    const filterQuery = { 
                        attributes: ['blockIndex'], 
                        where: { 
                            nonce: search,
                        }, 
                        group: ['blockIndex'] 
                    };

                    // const counts = await nftModel.count({ where: filterQuery.where });
                    const count = await nftModel.count({ where: filterQuery.where });

                    const nftsInBlocks = await nftModel.findAll({ ...filterQuery, limit, offset });

                    const blockIds = nftsInBlocks.map(_ => _.blockIndex);
                    this.blockchain.getBlocksByids(blockIds, (err, blocksDatas) => {
                        blocksDatas = blocksDatas.map(_ => blockDataToEasyList(_));
                        res.send({
                            result: {
                                items: blocksDatas,
                                count,
                            }
                        })
                    })
                } else if (searchType === 'wallet') {
                    const filterQuery = {
                        attributes: ['blockIndex'], 
                        where: { 
                            [Op.or]: [ 
                                { v1: search }, 
                                { v2: search } 
                            ] 
                        }, 
                        group: ['blockIndex']
                    };

                    // const counts = await eventsModel.count({ where: filterQuery.where });
                    const count = await eventsModel.count({ where: filterQuery.where });

                    const walletActivities = await eventsModel.findAll({ ...filterQuery, limit, offset });
                    
                    const blockIds = walletActivities.map(_ => _.blockIndex);
                    this.blockchain.getBlocksByids(blockIds, (err, blocksDatas) => {
                        blocksDatas = blocksDatas.map(_ => blockDataToEasyList(_));
                        res.send({
                            result: {
                                items: blocksDatas,
                                count,
                            }
                        })
                    })
                } else if (searchType === 'validationid') {
                    const filterQuery = {
                        attributes: ['blockIndex'], 
                        where: { 
                            eventName: 'Validation',
                            v1: search,
                        }, 
                        group: ['blockIndex']
                    };
                    
                    // const counts = await eventsModel.count({ where: filterQuery.where });
                    const count = await eventsModel.count({ where: filterQuery.where });

                    const nftsInBlocks = await eventsModel.findAll({ ...filterQuery, limit, offset });
                    const blockIds = nftsInBlocks.map(_ => _.blockIndex);
                    this.blockchain.getBlocksByids(blockIds, (err, blocksDatas) => {
                        blocksDatas = blocksDatas.map(_ => blockDataToEasyList(_));
                        res.send({
                            result: {
                                items: blocksDatas,
                                count,
                            }
                        })
                    })
                } else if (searchType === 'hash') {
                    const blockModel = this.events.blockModel;
                    const filterQuery = {
                        attributes: ['blockIndex'],
                        where: {
                            hash: search
                        },
                        raw: true,
                    };
                    const blocks = await blockModel.findAll({ ...filterQuery });
                    const blockIds = blocks.map(_ => _.blockIndex);
                    this.blockchain.getBlocksByids(blockIds, (err, blocksDatas) => {
                        blocksDatas = blocksDatas.map(_ => blockDataToEasyList(_));
                        res.send({
                            result: {
                                items: blocksDatas,
                                count: blockIds.length,
                            }
                        })
                    })
                } else if (searchType === 'coords') {
                    const filterQuery = {
                        attributes: ['blockIndex'], 
                        where: { 
                            eventName: 'Validation',
                            v2: { [Op.substring]: search },
                        }, 
                        group: ['blockIndex']
                    };

                    // const counts = await eventsModel.count({ where: filterQuery.where });
                    const count = await eventsModel.count({ where: filterQuery.where });

                    const nftsInBlocks = await eventsModel.findAll({ ...filterQuery, limit, offset });
                    const blockIds = nftsInBlocks.map(_ => _.blockIndex);
                    this.blockchain.getBlocksByids(blockIds, (err, blocksDatas) => {
                        blocksDatas = blocksDatas.map(_ => blockDataToEasyList(_));
                        res.send({
                            result: {
                                items: blocksDatas,
                                count,
                            }
                        })
                    })
                } else if (searchType === 'cadastral_number') {
                    const filterQuery = {
                        attributes: ['blockIndex'], 
                        where: { 
                            eventName: 'Validation',
                            v4: search,
                        }, 
                        group: ['blockIndex']
                    };

                    // const counts = await eventsModel.count({ where: filterQuery.where });
                    const count = await eventsModel.count({ where: filterQuery.where });

                    const nftsInBlocks = await eventsModel.findAll({ ...filterQuery, limit, offset });
                    const blockIds = nftsInBlocks.map(_ => _.blockIndex);
                    this.blockchain.getBlocksByids(blockIds, (err, blocksDatas) => {
                        blocksDatas = blocksDatas.map(_ => blockDataToEasyList(_));
                        res.send({
                            result: {
                                items: blocksDatas,
                                count,
                            }
                        })
                    })
                } else {
                    res.send({ result: { error: { notFound: true } }});
                }
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        })

        this.network.rpc.registerPostHandler('/explorer/ertc/token/:owner/:isFreeze/', async (req, res) => {
            try {
                const owner = req.params.owner;
                const isFreeze = Boolean(Number(req.params.isFreeze));
                const nftModel = this.events.nftModel;

                const nfts = await nftModel.findAll({
                    attributes: [
                    'validationId',
                    'isFreeze',
                    [Sequelize.fn('COUNT', Sequelize.col('nonce')), 'amount']
                    ],
                    where: {
                        owner,
                        isFreeze,
                    },
                    group: ['validationId', 'isFreeze'],
                    raw: true
                });
                
                res.send({
                    result: nfts,
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        })

        this.network.rpc.registerPostHandler('/explorer/client/:owner/validation/:validationId/', async (req, res) => {
            try {
                const owner = req.params.owner;
                const validationId = Number(req.params.validationId);
                const nftModel = this.events.nftModel;

                const whereQuery = {
                    owner,
                    validationId
                }

                const frozenAmount = await nftModel.count({
                    where: {
                        ...whereQuery,
                        isFreeze: true
                    }
                });

                const unFrozenAmount = await nftModel.count({
                    where: {
                        ...whereQuery,
                        isFreeze: false
                    }
                });

                res.send({
                    result: {
                        validationId,
                        frozen: frozenAmount,
                        unFrozen: unFrozenAmount,
                        total: frozenAmount + unFrozenAmount,
                    }
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message
                })
            }
        })

        this.network.rpc.registerPostHandler('/explorer/mobule/list/', async (req, res) => {
            try {
                const { fromBlockIndex=0 } = req.query;
                let limit = req.query.limit || 100;
                if (limit > 100) {
                    limit = 10;
                }
                
                const eventsModel = this.events.eventsModel;
                const filterQuery = {
                    where: { 
                        eventName: 'Validation',
                        blockIndex: { [Op.gt]: fromBlockIndex },
                    },
                    limit,
                    order: [
                        ['blockIndex', 'ASC']
                    ],
                };

                const items = await eventsModel.findAll(filterQuery);

                res.send({
                    result: { items },
                })
            } catch (e) {
                console.error(e);
                res.send({
                    error: true,
                    message: e.message,
                })
            }
        });
    }
}

module.exports = App;