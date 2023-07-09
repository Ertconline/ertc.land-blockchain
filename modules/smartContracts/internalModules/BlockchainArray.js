/**
 iZ³ | Izzzio blockchain - https://izzz.io
 */
 const range = (size, start) => new Array(size).fill(0).map(_ => start++);

/**
 * Abstract
 */
class _BlockchainArray extends KeyValue {
    constructor(name) {
        super(name);
        //Iterator
        this[Symbol.iterator] = this.iterator;

        /**
         * Proxify some items calls
         */
        return new Proxy(this, {
            /**
             * Replace getters
             * @param target
             * @param item
             * @return {*}
             */
            get(target, item) {
                if(typeof target[item] !== 'undefined') {
                    return target[item];
                }

                let getValue = target.get(item);
                if(!getValue) {
                    return undefined;
                }
                return getValue;
            },
            /**
             * Replace setters
             * @param target
             * @param item
             * @param value
             */
            async set(target, item, value) {
                if(item === 'length') {
                    target._setLength(value);
                    return target.length;
                }

                if(typeof target[item] !== 'undefined') {
                    if(!value) {
                        return true;
                    }
                    return value;
                }


                let getValue = target.get(String(item));
                if(getValue === null && item <= target.length) {
                    target._setLength(target.length + 1);
                }

                if(item > target.length) {
                    target._setLength(target.length + (item - target.length) + 1);
                }
                
                target.put(String(item), value);

                if(!value) {
                    return true;
                }

                return value;
            }
        });
    }

    /**
     * Get array length
     * @return {*}
     */
    get length() {
        let length = this.get('length');
        if(!length) {
            return 0
        }
        return Number(length);
    }

    /**
     * Set new array length
     * @param length
     * @protected
     */
    _setLength(length) {
        this.put('length', length);
    }


    /**
     * Array iterator
     * @return {IterableIterator<*>}
     */
    * iterator() {
        for (let a = 0; a < this.length; a++) {
            yield this[a];
        }
    }
}


/**
 * Memory-safe version of BlockchainArray
 * Without memory-unsafe methods
 */
class BlockchainArraySafe extends _BlockchainArray {
    /**
     * Creates BlockchainArraySafe
     * @param {string} name Storage name
     */
    constructor(name) {
        super(name);
    }

    /**
     * Create BlockchainArray from array-like object
     * @param {Array} arrayLikeObject
     * @param {string} storageName Name of storage
     * @param {Boolean} replaceExcists Replace exsists storage data or load
     * @return {BlockchainArray}
     */
    static from(arrayLikeObject, storageName, replaceExcists = false) {
        let obj = new this(storageName);
        if(obj.length === 0) {
            obj.applyArray(arrayLikeObject);
        }
        return obj;
    }

    /**
     * Push to array
     * @param values
     * @return {Number}
     */
    push(...values) {
        return this.pushMany(values);
    }

    pushMany(values) {
        let length = this.length;
        // console.log('values', values, length);
        
        const batches = values.map(value => ({ type: 'put', key: length++, value }));
        console.log('batches for push', batches);
        this.batch(batches);
        this._setLength(length);

        return this.length;
    }

    /**
     * Pop from array
     * @return {*}
     */
    pop() {
        if(this.length === 0) {
            return undefined;
        }

        let key = this.length - 1;
        let element = this[key];
        this._setLength(key);
        this.put(String(key), false);
        return element;
    }


    /**
     * Index of element
     * @param element
     * @param fromIndex From index.
     * @return {number}
     */
    indexOf(element, fromIndex = 0) {
        for (let a = fromIndex; a < this.length; a++) {
            if(String(this[a]) === String(element)) {
                return a;
            }
        }

        return -1;
    }


    /**
     * Lst element index
     * @param element
     * @param fromIndex
     * @return {*}
     */
    lastIndexOf(element, fromIndex = this.length) {
        for (let a = fromIndex; a >= 0; a--) {
            if(String(this[a]) === String(element)) {
                return a;
            }
        }

        return -1;
    }

    /**
     * Like Array.forEach
     * @param callback
     * @param thisArg
     */
    forEach(callback, force=false) {
        const keys = [...Array(this.length).keys()];
        console.log('foreach', { force });
        const items = JSON.parse(this.getMany(keys, force));
        for (let i = 0; i < items.length; i++) {
            callback.apply(null, [items[i], i, items]);
        }

        // for (let a = 0; a < this.length; a++) {
        //     callback.apply(thisArg, [this[a], a, this]);
        // }
    }

    /**
     * indexOf wrap
     * @param element
     * @param fromIndex
     * @return {boolean}
     */
    includes(element, fromIndex = 0) {
        return this.indexOf(element, fromIndex) !== -1;
    }

    /**
     * Returns iterator
     * @return {_BlockchainArray.iterator}
     */
    values() {
        return this.iterator;
    }

    /**
     * Keys iterator
     * @return {IterableIterator<number>}
     */
    * keys() {
        for (let a = 0; a < this.length; a++) {
            yield a;
        }
    }

    /**
     * Entries iterator
     * @return {IterableIterator<number>}
     */
    * entries() {
        for (let a = 0; a < this.length; a++) {
            yield [a, this[a]];
        }
    }


    /**
     * Find. Mozilla polyfill
     * @param predicate
     * @return {*}
     */
    find(predicate) {
        if(this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if(typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = this;
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if(predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    }


    /**
     * FindIndex polyfill
     * @param predicate
     * @return {number}
     */
    findIndex(predicate) {
        if(this == null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if(typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = (this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if(predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Every polyfill
     * @param callbackfn
     * @param thisArg
     * @return {boolean}
     */
    every(callbackfn, thisArg) {
        'use strict';
        var T, k;

        if(this == null) {
            throw new TypeError('this is null or not defined');
        }
        var O = this;
        var len = O.length >>> 0;
        if(typeof callbackfn !== 'function') {
            throw new TypeError();
        }
        if(arguments.length > 1) {
            T = thisArg;
        }

        k = 0;

        while (k < len) {
            var kValue;
            kValue = O[k];
            var testResult = callbackfn.call(T, kValue, k, O);
            if(!testResult) {
                return false;
            }
            k++;
        }
        return true;
    }


    /**
     * Some function polyfill
     * @param fun
     * @return {boolean}
     */
    some(fun) {
        'use strict';

        if(this == null) {
            throw new TypeError('Array.prototype.some called on null or undefined');
        }

        if(typeof fun !== 'function') {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;

        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if(fun.call(thisArg, t[i], i, t)) {
                return true;
            }
        }

        return false;
    }


    /**
     * Replace elements in BlockchainArray from Array
     * @param array
     */
    applyArray(array) {
        if(!Array.isArray(array)) {
            return false;
        }

        const batches = [];

        for (let i = 0; i < array.length; i++) {
            batches.push({ type: 'put', key: i, value: array[i] });
        }

        this.batch(batches);
        this._setLength(array.length);

        return this;
    }

    /**
     * Check is Blockchain or basic Array
     * @param obj
     * @return {boolean}
     */
    static isArray(obj) {
        return !!(obj.constructor.name === 'Array' || obj.constructor.name === 'BlockchainArray' || obj.constructor.name === 'BlockchainArraySafe' || Array.isArray(obj));
    }

    /**
     * Is blockchain array
     * @param obj
     * @return {boolean}
     */
    static isBlockchainArray(obj) {
        return !!(obj.constructor.name === 'BlockchainArray');
    }

    /**
     * Is BlockchainArraySafe
     * @param obj
     * @return {boolean}
     */
    static isBlockchainArraySafe(obj) {
        return !!(obj.constructor.name === 'BlockchainArraySafe');
    }

    /**
     * Is b
     * @param obj
     * @return {boolean}
     */
    static isBlockchainArrayType(obj) {
        return !!(obj.constructor.name === 'BlockchainArray' || obj.constructor.name === 'BlockchainArraySafe');
    }

}

/**
 * Blockchain storable pseudo-array. Based on wrapping KeyValue methods
 * Some methods of the standard array can not be implemented, because the EcmaContract VM has memory or time limits
 * Bear in mind the length of the array can be very large.
 * See EcmaContract recommendations guide
 * Supports only number indexes
 */
class BlockchainArray extends BlockchainArraySafe {


    /**
     * To array converter
     * return {Array}
     */
    toArray() {
        const rangeItems = [...Array(this.length).keys()];
        if (rangeItems.length === 0) return [];
        const items = this.getMany(rangeItems);
        return JSON.parse(items);
    }


    /**
     * Map method. Returns fair array as result. Using this method may cause RAM overflow
     * @param callback
     * @param thisArg
     * @return {any[]}
     */
    map(callback, thisArg) {
        var T, A, k;
        if(this == null) {
            throw new TypeError(' this is null or not defined');
        }

        var O = Object(this);
        var len = O.length >>> 0;
        if(typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }

        if(arguments.length > 1) {
            T = thisArg;
        }
        A = new Array(len);
        k = 0;

        while (k < len) {
            var kValue, mappedValue;
            kValue = O[k];
            mappedValue = callback.call(T, kValue, k, O);
            A[k] = mappedValue;
            k++;
        }

        return A;
    }

    /**
     * Sort method. Returns fair array but can cause RAM or time limit overflow
     * @param args
     * @return {(compareFn?: (a: T, b: T) => number) => (compareFn?: (a: T, b: T) => number) => this}
     */
    sort(...args) {
        return Array.prototype.sort.call(this.toArray(), args);
    }

    /**
     * Join
     * @param separator
     * @return {string}
     */
    join(separator) {
        if(typeof separator === 'undefined') {
            separator = ',';
        }
        return Array.prototype.join.call(this, [separator]);
    }

    /**
     * Like Array.toString
     * @return {string}
     */
    toString() {
        return this.join();
    }

    /**
     * Fair Array.toLocaleString
     * @return {string}
     */
    toLocaleString() {
        return this.toArray().toLocaleString();
    }

    /**
     * To JSON like array
     * @return {string}
     */
    toJSON() {
        return this.toArray();
    }

    /**
     * Slice
     * @param args
     * @return {*[]}
     */
    slice(...args) {
        return this.toArray().slice(...args);
    }

    /**
     * Splice
     * @param args
     * @return {*[]}
     */
    splice(from, to) {
        const array = this.toArray();
        const spliced = array.splice(from, to);

        this.applyArray(array);

        return spliced;
    }

    /**
     * Shift
     * @return {*}
     */
    shift() {
        let A = this.toArray();
        let result = A.shift();
        this.applyArray(A);
        return result;
    }

    /**
     * Unshift
     * @param args
     * @return {number}
     */
    unshift(...args) {
        let A = this.toArray();
        let result = A.unshift(...args);
        this.applyArray(A);
        return result;
    }


    /**
     * Reduce
     * @param args
     * @return {*}
     */
    reduce(...args) {
        let A = this.toArray();
        let result = A.reduce(...args);
        this.applyArray(A);
        return result;
    }

    /**
     * Reduce right
     * @param args
     * @return {*}
     */
    reduceRight(...args) {
        let A = this.toArray();
        let result = A.reduceRight(...args);
        this.applyArray(A);
        return result;
    }

    /**
     * Reverse
     * @return {*[]}
     */
    reverse() {
        let A = this.toArray();
        let result = A.reverse();
        this.applyArray(A);
        return result;
    }
}