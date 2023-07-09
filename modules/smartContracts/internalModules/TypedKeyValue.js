/**
 iZ³ | Izzzio blockchain - https://izzz.io
 */

/**
 * KeyValue that saves types
 */
class TypedKeyValue {

    constructor(name) {
        this.db = new KeyValue(name);
    }

    /**
     * Put value
     * @param key
     * @param value
     */
    put(key, value) {
        return this.db.put(key, value);
    }

    /**
     * Get value
     * @param key
     * @return {any}
     */
    get(key) {
        return this.db.get(key);
    }

}