/**
 iZ³ | Izzzio blockchain - https://izzz.io
 */

/**
 * IZ3 token standard
 * Basic token contract.
 */
class TokenNFTContract extends Contract {

    /**
     * Initialization method with emission
     * @param {BigNumber| Number| String} initialEmission Amount of initial emission
     * @param {Boolean} mintable  Can mintable by owner in feature?
     */
    init() {
        assert.false(contracts.isChild(), 'You can\'t call init method of another contract');

        this._contract = new BlockchainMap('contract');

        this._NftStorage = new NftStorage('NFT');
        
        this._ValidationEvent = new Event('Validation', 'string', 'string', 'string', 'string', 'string', 'string');
        this._TransferEvent = new Event('Transfer', 'string', 'string', 'number', 'string', 'string', 'string', 'number'); // from, to, amount, currency, transaction_type (Transfer between your wallets), comment, date 
        
        this._owner = new BlockchainMap('Owner');
        this._AdminsMap = new BlockchainArray('Admins');

        if (contracts.isDeploy()) {
            this.deploy();
        }

        this._nftToken = new NFTTokenRegister(this._contract['ticker']);
    }

    get superAdminInfo() {
        return {
            address: this._owner['address'],
        }
    }

    get adminInfo() {
        return {
            address: this._AdminsMap.toArray(),
        }
    }

    /**
     * First call
     */
    deploy() {
        this._changeOwner();

        this._contract['name'] = 'ERTC Token';
        this._contract['ticker'] = 'ERTC';
        this._contract['type'] = 'NFT Token';

        this._owner['backend'] = 'e.9BQ7pQtH79BUUL62bzWNBZvgZ3uhBZRC';
        this._owner['address'] = 'e.15wq66K6VPU6q821EGKU8TiWkmMTQpUb';
    }

    checkSuperAdminRights(address = this._getCaller()) {
        return this._owner['address'] === address;
    }

    checkAdminRights(address = this._getCaller()) {
        return this._AdminsMap.includes(address);
    }

    checkRights(address = this._getCaller(), rightsType) {
        switch (rightsType) {
            case 'admin':
                const isHasAdminRights = this.checkAdminRights(address) || this.checkSuperAdminRights(address);
                return isHasAdminRights;
            case 'superadmin':
                const isHasSuperAdminRights = this.checkSuperAdminRights(address);
                return isHasSuperAdminRights;
            default: 
                assert.true(false, 'Incurrect rights type');
        }
    }

    assertAdmin(address=this._getCaller()) {
        assert.true(this.checkAdminRights(address), 'User is not admin');
    }

    assertSuperAdmin(address=this._getCaller()) {
        assert.true(this.checkSuperAdminRights(address), 'User is not super admin');
    }

    assertBackend() {
        const address = this._getCaller();
        assert.true(this._owner['backend'] === address, 'User is not backend');
    }

    setAdminRights(address, status) {
        assert.true(typeof status === 'boolean', 'Status is not bool');
        
        this.assertSuperAdmin();

        if (status === true) {
            this._AdminsMap.push(address);   
        } else {
            const adminsList = this._AdminsMap.toArray().filter(_ => _ !== address);
            this._AdminsMap.applyArray(adminsList);
        }
    }

    getRights(address) {
        let isAdmin = this.checkAdminRights(address);
        let isSuperAdmin = this.checkSuperAdminRights(address);
        if (isSuperAdmin) {
            return 'superadmin';
        } else if (isAdmin) {
            return 'admin';
        }

        return 'user';
    }

    /**
     * Basic token info
     * @return {{owner: boolean, ticker: string, emission: (BigNumber|Number|String), name: string, type: string}}
     */
    get contract() {
        return {
            name: this._contract['name'],
            ticker: this._contract['ticker'],
            owner: this._contract['owner'],
            backend: this._owner['backend'],
            type: this._contract['type'],
        };
    }

    getBalance(address, isFreeze=false) {
        return this._nftToken.getBalance(address, isFreeze).toFixed();
    }

    validation(validationId, coords, excludes, cadastral_number, totalEmission, totalArea, timestamp, clientPublicKey) {
        this.assertBackend();

        if (typeof validationId === 'number') {
            validationId = String(validationId);
        }

        if (typeof coords === 'object') {
            coords = JSON.stringify(coords);
        }

        if (typeof excludes === 'object') {
            excludes = JSON.stringify(excludes);
        }

        if (typeof totalEmission === 'number') {
            totalEmission = String(totalEmission);
        }

        if (typeof totalArea === 'number') {
            totalArea = String(totalArea);
        }

        if (typeof timestamp === 'number') {
            timestamp = String(timestamp);
        }

        this._ValidationEvent.emit(validationId, coords, excludes, cadastral_number, totalEmission, totalArea, timestamp, clientPublicKey);
    }

    validationMint(address, validationId, nftsData, isFreeze) {
        this.assertBackend();
        
        const nftIds = this._nftToken.mint(address, nftsData.length, isFreeze);
        const nftArray = nftIds.map((nonce, index) => [nonce, address, validationId, JSON.stringify(nftsData[index]), isFreeze]);
        this._NftStorage.push(nftArray);

        this._TransferEvent.emit('', address, nftIds.length, this.contract.ticker, 
            'Validation mint', '', Date.now());
    }

    referralReward(items) {
        this.assertBackend();

        if (typeof items === 'string') {
            items = JSON.parse(items);
        }

        const from = this._owner['address'];
        
        for (const item of items) {
            const to = item.public_key;
            const amount = item.amount;
            const transactionType = item.transaction_type;
            const comment = item.comment;

            this.transferFromTo(from, to, amount, transactionType, comment);
        }
    }

    freezeNftByValidationId(amount, vaidationId, owner) {
        this.assertSuperAdmin();
        let nonces = this._NftStorage.freezeNftByValidationId(amount, vaidationId, owner);
        assert.assert(typeof nonces === 'string', 'Not enough tokens');
        nonces = JSON.parse(nonces);
        assert.assert(Array.isArray(nonces), 'Not enough tokens');
        this._nftToken.freeze(owner, nonces);
        this._TransferEvent.emit(owner, '', nonces.length, this.contract.ticker, `Freeze ERTC`, '', Date.now());
    }

    unFreezeNftByValidationId(amount, vaidationId, owner) {
        this.assertSuperAdmin();
        let nonces = this._NftStorage.unFreezeNftByValidationId(amount, vaidationId, owner);
        assert.assert(typeof nonces === 'string', 'Not enough tokens');
        nonces = JSON.parse(nonces);
        assert.assert(Array.isArray(nonces), 'Not enough tokens');
        this._nftToken.unfreeze(owner, nonces);
        this._TransferEvent.emit('', owner, nonces.length, this.contract.ticker, `Unfreeze ERTC`, '', Date.now());
    }

    _transferFromToByValidationId(validationId, isFreeze, from, to, amount, transactionType, comment) {
        this._nftToken.transfer(from, to, amount, isFreeze);
        this._TransferEvent.emit(from, to, amount, this.contract.ticker, transactionType, comment, Date.now());
        assert.true(this._NftStorage.transferNftByValidationId(validationId, isFreeze, from, to, amount), 'Amount is too big');
    }

    transferFromToByValidationId(validationId, isFreeze, from, to, amount, transactionType='Transfer between your wallets', comment='') {
        this.assertBackend();
        this._transferFromToByValidationId(validationId, isFreeze, from, to, amount, transactionType, comment);
    }

    _transferFromTo(from, to, amount, transactionType, comment) {
        this._nftToken.transfer(from, to, amount);
        this._TransferEvent.emit(from, to, amount, this.contract.ticker, transactionType, comment, Date.now());
        assert.true(this._NftStorage.transferNft(from, to, amount), 'Amount is too big');
    }

    transferFromTo(from, to, amount, transactionType='Transfer between your wallets', comment='') {
        this.assertBackend();
        this._transferFromTo(from, to, amount, transactionType, comment);
    }

    transfer(to, amount, transactionType='Transfer between your wallets', comment='') {
        const from = this._getCaller();
        this._transferFromTo(from, to, amount, transactionType, comment);
    }

    _getSender() {
        if(contracts.isChild()) {
            return String(contracts.caller());
        }
        const state = global.getState();
        return String(state.caller || state.from);
    }

    assertCaller(msg = 'Node can\'t be caller') {
        const state = global.getState();
        assert.assert(state.from != state.caller && state.caller, msg);
    }

    _getCaller() {
        this.assertCaller();
        const state = global.getState();
        return String(state.caller);
    }
}