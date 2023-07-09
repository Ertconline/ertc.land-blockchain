
/**
 * Nft storage
 */
class NftStorage {
    storageType = 'nfts';

    constructor(name) {
        this.storage = name;
    }

    freezeNftByValidationId(amount, validationId, owner) {
        return NftStorages.freezeNftByValidationId(amount, validationId, owner);
    }
    
    unFreezeNftByValidationId(amount, validationId, owner) {
        return NftStorages.unFreezeNftByValidationId(amount, validationId, owner);
    }

    push(nfts) {
        return NftStorages.push(this.storage, this.storageType, nfts);
    }

    transferNft(from, to, amount) {
        return NftStorages.transferNft(this.storage, this.storageType, from, to, amount);
    }

    transferNftByValidationId(validationId, isFreeze, from, to, amount) {
        return NftStorages.transferNftByValidationId(this.storage, this.storageType, validationId, isFreeze, from, to, amount);
    }
}