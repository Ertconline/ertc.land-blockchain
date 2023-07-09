
/**
 * NFT Token holders register for EcmaContracts
 */
(function (environment) {
    /**
     * Token Register
     * @param {string} name Token name
     * @return {environment.TokensRegister}
     * @constructor
     */
    environment.NFTTokenRegister = function (name) {
        const db = new KeyValue(name);

        const numberToBigNumber = (number, canBeZero=false) => {
            number = new BigNumber(number);
            assert.false(number.isNaN(), 'Invalid number');
            if (canBeZero) {
                assert.true(number.gte(0), 'Non-positive value');
            } else {
                assert.true(number.gt(0), 'Non-positive value');
            }
            return number;
        };

        const range = (size, start) => new Array(size).fill(0).map(_ => start++);

        class Account {
            constructor(address) {
                this.address = address;
                this.addressFreeze = `${address}_freeze`;
            }

            get(isFreeze=false) {
                const key = isFreeze ? this.addressFreeze : this.address;
                const balance = db.get(key);
                if (!balance) {
                    return new BigNumber(0);
                }
                return new BigNumber(balance);
            }

            set(amount, isFreeze=false) {
                amount = numberToBigNumber(amount, true);
                const key = isFreeze ? this.addressFreeze : this.address;
                db.put(key, amount.toFixed());
            }

            plus(amount, isFreeze=false) {
                amount = numberToBigNumber(amount, false);
                const balance = this.get(isFreeze);
                this.set(balance.plus(amount), isFreeze);
            }

            minus(amount, isFreeze=false) {
                amount = numberToBigNumber(amount, false);
                const balance = this.get(isFreeze);
                this.set(balance.minus(amount), isFreeze);
            }

            checkBalance(amount, isFreeze) {
                const balance = this.get(isFreeze);
                assert.true(balance.gte(amount), `Insufficient funds on ${this.address}, avaliable: ${balance.toFixed()}, need: ${amount.toFixed()}`);
            }
        }
        
        class Nonce {
            get() {
                const nonce = db.get('nonce');
                if (!nonce) {
                    return new BigNumber(1);
                }
                return new BigNumber(nonce);
            }

            set(amount) {
                amount = numberToBigNumber(amount, false);
                db.put('nonce', amount.toFixed());
            }

            plus(amount) {
                const nonce = this.get();
                this.set(nonce.plus(amount));
            }
        }

        this.getBalance = (address, isFreeze) => {
            const account = new Account(address);
            return account.get(isFreeze);
        }

        this.mint = (address, amount, isFreeze) => {
            amount = numberToBigNumber(amount, false);
            
            const nonce = new Nonce();
            const account = new Account(address);
            const nonceBefore = nonce.get().toNumber();
            
            account.plus(amount, isFreeze);
            nonce.plus(amount);
            
            const nonceAfter = nonce.get().toNumber();
             
            const mintedNonce = range(nonceAfter - nonceBefore, nonceBefore);            
            return mintedNonce;
        }

        this.transfer = (from, to, amount, isFreeze=false) => {
            amount = numberToBigNumber(amount);
            // const isFreeze = false;

            const accountFrom = new Account(from);
            accountFrom.checkBalance(amount, isFreeze);

            const accountTo = new Account(to);

            accountFrom.minus(amount, isFreeze);
            accountTo.plus(amount, isFreeze);
        
            return amount;
        }

        // this.transferWithFreeze = (from, to, amount) => {
        //     amount = numberToBigNumber(amount);

        //     const accountFrom = new Account(from);
        //     const frozenBalance = accountFrom.get(true);
            
        //     if (frozenBalance.lt(amount)) {
        //         const diff = amount.minus(frozenBalance);
        //         accountFrom.minus(diff, false);
        //         accountFrom.plus(diff, true);
        //     }

        //     const accountTo = new Account(to);

        //     accountFrom.minus(amount, true);
        //     accountTo.plus(amount, true);

        //     return amount
        // }

        this.freeze = (owner, nonces) => {
            const account = new Account(owner);
            const amount = nonces.length;

            account.minus(amount, false);
            account.plus(amount, true);
        }

        this.unfreeze = (owner, nonces) => {
            const account = new Account(owner);
            const amount = nonces.length;

            account.minus(amount, true);
            account.plus(amount, false);
        }

        return this;
    };
})(this);
