#!/usr/bin/env node

/**
 Developed by GENESIS 2.0 LLC & IZZZIO LLC 
 ERTC blockchain - https://ertc.land
 Copyright © 2023 IZZZIO LLC
 
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
 http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */


 'use strict';

 const logger = new (require('./modules/logger'))();
 const version = require('./package.json').version;
 const _ = require('lodash');
 const { Sequelize } = require('sequelize');
 let program = require('commander');
 
 program
     .version(version)
     .description(' iZ3 - IZZZIO blockchain core.')
     .option('-a, --autofix', 'Fix saved chain if possible. WARNING: You can lose important data')
     .option('--clear', 'Clear all saved chain and deletes wallet. WARNING: You can lose important data')
     .option('--clear-db', 'Clear all saved chain and calculated wallets.')
     .option('-c, --config [path]', 'Core config path', 'config.json')
     .option('--write-config [path]', 'Save config in [path] file', false)
     .option('--work-dir [path]', 'Working directory', false)
     .option('--keyring-emission', 'Generate and deploy keyring', false)
     .option('--keypoa-emission', 'Generate and deploy keypoa', false)
     .option('--generate-wallets [keyring path]', 'Generate wallets from keyring file', false)
     .option('--new-chain', 'Starts new chain', false)
     .option('--fall-on-errors', 'Stops node with error code on uncaught exceptions', false)
     .option('--block-accept-count [count]', 'Number of blocks to confirm transaction')
     .option('--http-port [port]', 'Interface and RPC binding port')
     .option('--disable-rpc-password', 'Disable RPC password', false)
     .option('--disable-mining', 'Completely disables mining', false)
     .option('--fast-load', 'Don\'t checking saved blocks database on startup', false)
     .option('--verbose', 'More logging info', true)
     .option('--enable-address-rotation', 'Activates the rotation of the addresses', false)
     .option('--no-splash', 'Disable splash screen', false)
     .option('--leech-mode', 'Disable p2p server', false)
     .option('--auto-fix-blocks', 'Auto fix blocks in db', false)
     .parse(process.argv);
 
 const getid = require('./modules/getid');
 
 let config = {
 
    //Networking
    httpPort: 6801,                     //Порт биндинга RPC и интерфейса
    p2pPort: 6802,                      //Порт p2p (лучше везде оставить одинаковым)
    sslMode: false,                     //Включить режим SSL
    httpServer: '0.0.0.0',            //Адрес биндинга RPC и интерфейса
    rpcPassword: '', // getid() + getid(),
    initialPeers: [                     //Стартовые узлы, для синхронизации с сетью
    ],
    allowMultipleConnectionsFromIp: true,//False - если в сети много зацикливаний, True - если используется прокси для коннекта
    maxPeers: 250,                       //Рекомендуемое число 15-20
    upnp: {                              //Автоматическое обнаружение узлов сети
        enabled: true,                  //Включить автоматическое обнаружение нод в сети
        token: 'ERTCToken'                //Токен по которому нода будет искать другие ноды (должен быть уникальным для каждой цепочки)
    },
    networkPassword: '',                //"пароль" доступа к сети
    enableAddressRotation: false,
    maxPayload: 1024 * (1024 * 1024), 

    //Blockchain
    blockAcceptCount: 0,               //Количеств блоков подтверждения транзакции
    hearbeatInterval: 20 * 1000,             //Внутренний таймер ноды
    peerExchangeInterval: 5 * 1000,        //Частота обновления пиров
    maxBlockSend: 10,                  //Должно быть больше blockQualityCheck
    blockQualityCheck: 5,             //Количество блоков "сверх", которое мы запрашиваем для проверки валидности цепочки
    limitedConfidenceBlockZone: 100,    //Зона "доверия". Цепочку ранее этой зоны менять нельзя. Должно быть больше blockQualityCheck
    generateEmptyBlockDelay: 5 * 60 * 1000,//5 минут - С какой частотой необхдимо выпускать пустые блоки в сеть при простое сети
    blockHashFilter: {                  //Фильтр корректных блоков для LCPoA
        blockEndls: [                   //4 символа в коце блока. Сюда должен попасть Genesis
            'f3c8',
            'a000',
            '0000',
            '7027'
        ]
    },
    genesisTiemstamp: 1492004951 * 1000, //2017-07-23 01:00:00 blockchain first started
    newNetwork: false,                   //Если будет обнаружен запуск новой сети блокчейн, будет произведена автоматическая эмиссия ключей и денег
    lcpoaVariantTime: 1,                //Количество милилсекунд, требуемое на генерацию одного хеша блока
    validators: [                       //"Валидаторы" - дополнительные проверяющие блоков, для введения дополнительных консенсусов, кроме LCPoA
       //  'dlcpoa',
        //'lcpoa',                        //БЕЗ КОНСЕНСУСА БЕЗ КЛЮЧЕЙ АВТОМАТИЧЕСКАЯ ЭМИССИЯ НЕВОЗМОЖНА
        //'thrusted'
       'keypoa',
    ],
    emptyBlockInterval: 10 * 1000,          //Интервал проверки необходимости выпуска пустого блока
    blacklisting: false,
    maxTransactionAtempts: 5,           //Сколько попыток добавить блок мы предпренимаем
    keyringKeysCount: 5,                //Сколько генерировать ключей в связку при старте сети. Используется в Trusted консенсусе и  других
    checkExternalConnectionData: false, //Проверять внешние данные на соответствие
    transactionIndexEnable: true,

    //Messaging Bus
    enableMessaging: false,              //Разрешить использование шины сообщений (необходима для некоторых консенсусов)
    recieverAddress: getid() + getid() + getid(), //Адрес ноды в сети.
    messagingMaxTTL: 3,                 //Максимальный предел скачков сообщения
    //maximumInputSize: 15 * 1024 * 1024, //Максимальный объем сообщения (здесь 15 мегабайт)
    maximumInputSize: 500 * 1024 * 1024,
    allowMultipleSocketsOnBus: true, // разрешение на подключение сокетов с разными адресами на один адрес шины


    //Wallet
    walletFile: './runtime/wallet.json',         //Адрес файла кошелька
    workDir: './runtime',
    disableWalletDeploy: true,

    //Database
    blocksDB: 'blocks',                     // false - для хранения в ОЗУ, mem://blocks.json для хранения в ОЗУ и записи на ПЗУ при выгрузке
    blocksSavingInterval: 5 * 60 * 1000,            // false = для отключения автосохранения, или количество милилсекунд
    accountsDB: 'accounts',                 //Account manager database

    //Application
    appEntry: false,       //Точка входа в "приложение". False - если не требуется
    startMessage: false,   //Сообщение, которое выводится при запуске ноды

    //SmartContracts
    ecmaContract: {
        enabled: true,                          //Система обработки онтрактов включена
        allowDebugMessages: true,              //Разрешает вывод сообщений смарт окнтрактам
        contractInstanceCacheLifetime: 10 * 1000,   //Время жизни экземпляра виртуальной машины контракта
        //ramLimit: 32,                           //Макс. ограничение ОЗУ для контрактов. Может быть заменено @deprecated
        masterContract: false,                       //Главный контракт в системе. Реализует функционал токена
        maxContractLength: 10 * 1024 * 1024,      // Макс. размер добавляемого контракта
        defaultLimits: { 
            ram: 1024 * 4, 
            timeLimit: 2 * 60 * 1000, 
            callLimit: 40 * 1000 
        }
    },

    //Cryptography
    hashFunction: 'SHA256',                 //функция вычисления хэша
    signFunction: 'bitcore',                       //Функция вычисления цифровой подписи и генерации паролей(пустая-значит, по умолчанию используется), 'GOST' 'GOST256' 'NEWRSA'
    keyLength: 2048,                        //Key length for some algorithms
    generatorFunction: 'bitcore',            //Key generator function


    //Enabled plugins
    dbPlugins: [],                      //Database plugins list
    plugins: [                          //Crypto and other plugins
       "iz3-bitcore-crypto",
       "iz3-basic-crypto"
    ],
    appConfig: {                          //DApp config placement
    },

    blockCacheLifeTime: 50

};
 
 //*********************************************************************
 const fs = require('fs-extra');
 const Blockchain = require('./Blockchain');
 const path = require('path');
 Array.prototype.remove = function (from, to) {
     let rest = this.slice((to || from) + 1 || this.length);
     this.length = from < 0 ? this.length + from : from;
     return this.push.apply(this, rest);
 };
 
 global.PATH = {}; //object for saving paths
 global.PATH.configDir = path.dirname(program.config);
 let loadedConfig;
 
 try {
 
     config = _.defaultsDeep(JSON.parse(fs.readFileSync(program.config)), config);
 
 
 } catch (e) {
     logger.warning('No configure found. Using standard configuration.');
 }
 
 
 if(program.writeConfig) {
     try {
         fs.writeFileSync(program.writeConfig, JSON.stringify(config));
     } catch (e) {
         logger.warning('Can\'t save config');
     }
 }
 
 config.program = program;
 
 if(config.program.splash) {
     require('./modules/splash')();
 }
 
 
 if(program.clear) {
     logger.info('Clear up.');
     fs.removeSync('wallets');
     fs.removeSync('blocks');
     fs.removeSync(config.walletFile);
     logger.info('End');
 }
 
 if(program.newChain) {
     config.newNetwork = true;
 }
 
 if(program.httpPort) {
     config.httpPort = program.httpPort;
 }
 
 if(program.disableRpcPassword) {
     config.rpcPassword = '';
 }
 
 if(program.blockAcceptCount) {
     config.blockAcceptCount = program.blockAcceptCount;
 }
 
 if(program.workDir) {
     config.workDir = program.workDir;
     config.walletFile = config.workDir + '/wallet.json';
 }
 
 if(program.clearDb) {
     fs.removeSync(config.workDir + '/wallets');
     fs.removeSync(config.workDir + '/blocks');
     logger.info('DB cleared');
 }
 
 
 if(program.generateWallets) {
     const Wallet = require('./modules/wallet');
 
     logger.info('Generating wallets from keyring ' + program.generateWallets);
 
     fs.ensureDirSync(config.workDir + '/keyringWallets');
 
     let keyring = JSON.parse(fs.readFileSync(program.generateWallets));
     for (let i in keyring) {
         if(keyring.hasOwnProperty(i)) {
             let wallet = new Wallet(config.workDir + '/keyringWallets/wallet' + i + '.json');
             wallet.enableLogging = false;
             wallet.keysPair = keyring[i];
             wallet.createId();
             wallet.update();
             wallet.save();
         }
     }
 
     logger.info('Wallets created');
     process.exit();
 }
 
 global.PATH.mainDir = __dirname;
 
 if(global.PATH.configDir) {
     if(config.appEntry) {
         if(!fs.existsSync(config.appEntry)) {
             config.appEntry = global.PATH.configDir + path.sep + config.appEntry;
         } else {
             config.appEntry = (path.dirname(config.appEntry) + path.sep + path.basename(config.appEntry));
         }
         if(!fs.existsSync(config.appEntry)) {
             config.appEntry = global.PATH.mainDir + path.sep + config.appEntry;
         }
 
         config.appEntry = path.resolve(config.appEntry);
     }
 }
 
 if(!fs.existsSync(config.appEntry) && config.appEntry) {
     logger.fatalFall('App entry not found ' + config.appEntry);
 }
 
 if(config.startMessage) {
     console.log(config.startMessage);
 }
 
 async function start() {
    try {
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
        logger.info(`Connected to db!`);

        const blockchain = new Blockchain(config);
        await blockchain.start();
    } catch (e) {
        console.log(e);
        setTimeout(() => start(), 5_000);
    }
 }

 logger.info(`Connect to db...`);
 
 start();

 if(!program.fallOnErrors) {
     process.on('uncaughtException', function (err) {
         logger.error('Uncaught exception: ' + err);
     });
 }
 
