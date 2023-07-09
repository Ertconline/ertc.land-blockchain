/**
 *
 * iZ³ | IZZZIO blockchain - https://izzz.io
 *
 */

class ERTTokenContract extends TokenNFTContract {

    /**
     * Contract info
     * @return {{name: string, type: string}}
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

    /**
     * Initialization
     */
    init() {
        //Initialize other params
        super.init();
    }

    /**
     * First call
     */
    deploy() {
        super.deploy();
    }
}

global.registerContract(ERTTokenContract);