/* global window , Date , console, document , async */
/**
@fileOverview

Found myself keep doing the same thing over and over again.
Might as well create an angular module and share it. Hope it works for you :)

@toc

when set a query in loop (idea stage)

    $nbSqlite.start(); // generate a new id key
    // do what you need like

    $nbSqlite.find('someTable').then(function(data)
    {
        $nbSqlite.save('toSomeOtherTable' , data);
    });

    $nbSqlite.end(); // when this one it run inside one transaction, and we gain bettern speed

*/

(function(window, angular, undefined) { 'use strict';

    /**
     * This is an HTML5 implementation for the sqlite for use in mobile / desktop
     * But in our Mobile version, we could use another one call CordovaSqlite library.
     * This is why we must use the provider, so we could do a configuration before the init.
     * The HTML5 sqlite is really simple, only three things to know.
     * db = openDatabase([[params]]);
     * db.execute(function(tx)
     * {
     *     tx.executeSql(sql);
     * });
     * @param   {object} $q   angular.$q
     * @param   {string} name - name of the database
     * @param   {integer} size - size of the database - ignore in phonegap
     * @param   {string} ver  - currently support '1.0' or 'phonegap' to switch between library
     * @param   {string} desc - description of the database - ignore in phonegap
     * @param   {boolean} debug - turn on debug or not
     * @returns nil
     */
    var SqliteCls = function($q , name , size , ver , desc , debug)
    {
        var dbName = name;
        var dbSize = size;
        var dbVer  = ver;
        var dbDesc = desc;
        var debugMode = debug; // useful for seeing what is happening inside
        var db; // db object holder
        var self   = this;
        // For future feature - TODO
        var loop = {};
        var seriesTx = false; // when we execute series of query, this will hold the tx object

        var queriesObject = function()
        {
            this.executions = {};
        };

        /////////////////
        //// Private ////
        /////////////////

        /**
         * connect to the database (or create a new one)
         * 17 MAR 2015 - change it back to promise style for the phonegap version
         * @returns {object} database instance
         */
        var connect = function()
        {
            var defer = $q.defer();

            if (db===undefined || db===null) {
                if (dbVer==='phonegap') {
                    document.addEventListener("deviceready", function()
                    {
                        /**
                         * note here about the location
                         * For iOS
                         *
                         * 0 (default): Documents - will be visible to iTunes and backed up by iCloud
                         * 1: Library - backed up by iCloud, NOT visible to iTunes
                         * 2: Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
                         * set to 1 by default for the time being, might change in future release
                         */
                        db = window.sqlitePlugin.openDatabase({name: dbName + ".db" , location: 1});
                        defer.resolve(db);
                    },false);
                }
                else {
                    /**
                     * TODO: support sqliteCypher
                     */
                    db = window.openDatabase(dbName, dbVer, dbDesc, dbSize);
                    defer.resolve(db);
                }
            }
            else {
                defer.resolve(db);
            }

            return defer.promise;
        };


        /**
         * wrap the reject call and turn on/off the debug
         * @param {[[Type]]} error [[Description]]
         * @param {[[Type]]} defer [[Description]]
         */
        var errorHandler = function(error , defer)
        {
            defer.reject(error);
            if (debugMode===true)
            {
                console.log('error:' , error);
            }
        };

        /**
         * wrap the resolve call and turn on/off the debug
         * @param {[[Type]]} results [[Description]]
         * @param {[[Type]]} defer   [[Description]]
         */
        var successHandler = function(results , defer)
        {
            defer.resolve(results);
            if (debugMode===true) {
                console.log('success:' , results);
            }
        };

        /**
         * quick way to generate a bunch of ? as placeholder
         * @param   {integer} i [[Description]]
         * @returns {string} [[Description]]
         */
        var placeholder = function(i)
        {
            var p = [];
            for (var j=0; j<i; ++j) {
                p.push('?');
            }
            return p.join(',');
        };

        /**
         * internal key generator - todo
         */
        var internalkeyGenerator = function()
        {
            // later
            var d = new Date(),
                s = d.getSeconds(),
                n = d.getMilliseconds(),
                k = s + '-' + n;
            loop[k] = false; // not finish
            return k;
        };

        /**
         * execute a script and return a promise for $q.all to work
         * @param {object} tx   db transaction object
         * @param {string} sql  sql statement
         * @param {array} data (optional) array of data
         * @param {promise} _defer (optional) if we pass an outside defer, then we don't need to init it again.
         * @returns {object} promise
         */
        var execute = function(tx , sql , data , _defer)
        {
            data = data || [];
            var defer = _defer || $q.defer();
            tx.executeSql(sql , data , function(tx , results)
            {
                successHandler(results , defer);
            }, function(tx , error)
            {
                errorHandler(error , defer);
            });
            return defer.promise;
        };

        /**
         * @param {hash} obj
         * @returns {string} return the key
         */
        var getKey = function(obj)
        {
            for (var key in obj)
            {
                return key;
            }
        };

        /**
         * The trick is the last param in the series has this sinature
         * callback(nextCallback) <-- err === null (OK)
         * the result is what return from the last, so its a promise then we just deal with
         * result.then(function(data)) <-- our signature only return one thing anyway.
         * of course, you must know the data structure before hand and fit into your next call.
         * The advantage is - we wrap this call inside an execute (see execute for more)
         * get task from tasks for the series method
         * @param {array} tasks
         * @returns {array} series of executable task
         */
        var getTasks = function(tasks)
        {
            // for double checking the hash notation method name if it exsit
            var methods = ['create', 'find' , 'save' , 'del' , 'query'],
                funcs = [];
            if (!angular.isArray(tasks)) {
                throw 'Expecting series parameter is an array'; // critical throw and die
            }
            return tasks.map(function(task)
            {
                /**
                 * when you pass as hash you need to pass like this, for example
                 * {
                 *      methodName: __array_of_parameters__,
                 *      find: ['users']
                 * }
                 */
                if  (angular.isObject(task)) {
                    var methodName = getKey(task);
                    if (methods.indexOf(methodName)===-1) {
                        throw 'Unexpected ' + methodName + ' method call!'; // critical
                    }

                    return function(callback)
                    {
                        self[methodName].apply(task[methodName]).then(callback);
                    };
                }
                // if this is an function then execute `then` next callback
                else if (angular.isFunction(task)) {
                    return function(callback) {
                        task().then(callback);
                    };
                }
                else {
                    throw 'Unable to handle ' + (typeof _call) + ' type parameter!'; // critical throw and die
                }
            });
        };

        //////////////
        /// Public ///
        //////////////

        /***********
         ** UTILS **
         ***********/

        /**
         * parse the results object
         * this is what the results object looks like
         * {insertId: 0
         *  rows: SQLResultSetRowListlength: 0
         *  rowsAffected: 0}
         * @param {object} results
         * @param {string} type of call
         * @returns {mixed} make sure it at least return a null value
         */
        this.parse = function(results , type)
        {
            if (type) {
                type = type.toUpperCase();
            }
            switch (type)
            {
                case 'INSERT':
                    return (results) ? results.insertId : null; // avoid the undefined error
                case 'UPDATE':
                case 'DELETE':
                    return (results) ? results.rowsAffected : null;
                default:
                    if (results) {
                        var len = results.rows.length, i , data = [];
                        for (i=0; i<len; ++i) {
                            data.push(results.rows.item(i));
                        }
                        return data;
                    }
            }
            return null;
        };

        /**
         * convenience way to create a new table
         * @param {string} name  tableName
         * @param {hash} params {fieldName: fieldType}
         * @param {boolean} exists (add IF NOT EXISTS) default true
         */
        this.createTable = function(name , params, overwrite)
        {
            overwrite = overwrite || true;
            var sql = "CREATE TABLE ",
                fields = [];
            if (overwrite) {
                sql += " IF NOT EXISTS ";
            }
            sql += name + " (";
            angular.forEach(params , function(value , key)
            {
                fields.push( key + " " + value );
            });
            sql += fields.join(',') + ")";
            return self.query(sql);
        };

        /**
         * sometime we want to execute a bunch of statements one after the
         * other inside on single transaction. So this method only return
         * the tx object and let you implment your own logic inside
         * @param {function} rollback - if you provide this then when it fail, the db will get rollback
         * @returns {object} promise
         */
        this.getTransaction = function(rollback)
        {
            var defer = $q.defer();
            connect().then(function(db)
            {
                db.transaction(function(tx)
                {
                    defer.resolve(tx);
                },rollback);
            });
            return defer.promise;
        };

        /**
         * quick access to the tables, and format the data nicely
         * @returns {object} promise
         */
        this.listTables = function()
        {
            var defer = $q.defer();
            var sql = "SELECT * FROM sqlite_master WHERE type=?";

            self.query(sql , ['table']).then(function(results)
            {
                if (debugMode) {
                    console.log(results);
                }
                // filter out the built-in tables like __WebKit__ etc
                defer.resolve(
                    self.parse(results).filter(
                        function(table)
                        {
                            return (table.name.substr(0,2)==='__') ? false : true;
                        }
                    )
                );
            })['catch'](function(error) {
                defer.reject(error);
            });

            return defer.promise;
        };

        /**
         * Execute a single sql
         * @param {string} sql - sql statement
         * @return {object} database object
         */
        this.query = function(sql , data)
        {
            data = data || [];
            var defer = $q.defer();
            if (seriesTx!==false) // at this point the waterfallCall will hold the tx object
            {
                execute(seriesTx , sql , data , defer);
            }
            else {
                self.getTransaction().then(function(tx)
                {
                    execute(tx , sql , data , defer);
                })['catch'](defer.reject);
            }
            /**
             * if we add a second function to the transaction to catch the error function(err) then it will roll back
             * we do this when we use `set` call
             */
            return defer.promise;
        };

        /**
         * this will execute a sequence of query with rollback
         * @param {array} sqls  array of sql statements
         * @param {array} datas array of data [array]
         */
        this.transaction = function(sqls , datas)
        {
            var defer = $q.defer();

            self.getTransaction(function(err)
            {
                // just to make it clear to debug where is the problem. plus rolling the transaction back
                defer.reject({error: err , level: 'transaction level error'});
            }).then(function(tx)
            {
                var ctn = sqls.length, i , Ds=[];
                for (i=0; i<ctn; ++i) {
                    Ds.push(execute(tx , sqls[i] , datas[i]));
                }
                /**
                 * we are using the stock version of the Q.
                 * so there is no look inside when we use $q.all
                 * therefore this can only tell if all success of failed
                 */
                $q.all(Ds).then(function()
                {
                    defer.resolve(true);
                });
            })['catch'](defer.reject);

            return defer.promise;
        };

        /***********
         ** CRUD  **
         ***********/

        /**
         * INSERT
         * @param {string} tableName
         * @param {hash} fields:value
         */
        this.create = function(tableName, params)
        {
            var defer = $q.defer(),
                sql = "INSERT INTO " + tableName + " (",
                fields = [],
                data = [];
            angular.forEach(params, function(value,field)
            {
                fields.push(field);
                data.push(value);
            });

            sql += fields.join(',') + ") VALUES (" + placeholder(data.length) + ")";

            if (seriesTx!==false) // at this point the waterfallCall will hold the tx object
            {
                execute(seriesTx , sql , data , defer);
            }
            else {
                self.query(sql , data).then(function(results)
                {
                    defer.resolve(
                        self.parse(results , 'INSERT')
                    );
                })['catch'](function(error)
                {
                    defer.resolve(error);
                });
            }

            return defer.promise;
        };

        /**
         * READ - this will be very different from the other API
         * @param {string} tableName
         * @param {hash} params search params
         * @return {object} promise
         */
        this.find = function(tableName , params)
        {
            var defer = $q.defer(),
                sql = "SELECT ",
                data = [];
            params = params || {};
            if (params.fields) { // arrray
                sql += params.fields.join(',');
            }
            else {
                sql += " * ";
            }

            sql += " FROM " + tableName;
            // using GROUP BY then can't use WHERE
            if (params.groupby) {
                sql += " GROUP BY " + params.groupby;
                // you could pass the whole sql statement,
                // or break it down into having
                if (params.having) {
                    sql += " HAVING " + params.having;
                }
            } else if (params.where) { // string
                sql += " WHERE " + params.where;
            }
            // THE REST OF
            if (params.order) { // string
                sql += " ORDER BY " + params.order;
            }
            if (params.limit) { // string
                sql += " LIMIT " + params.limit;
            }
            if (seriesTx!==false) // at this point the waterfallCall will hold the tx object
            {
                execute(seriesTx , sql , data , defer);
            }
            else {
                self.query(sql , data).then(function(result)
                {
                    defer.resolve(
                        self.parse(result)
                    );
                })['catch'](function(error)
                {
                    defer.reject(error);
                });
            }
            return defer.promise;
        };

        /**
         * UPDATE
         * @param {string} tableName
         * @param {hash} field:value
         * @param {string} fragement of sql statement (no need to add where)
         */
        this.save = function(tableName, params , where)
        {
            var defer = $q.defer(),
                sql = "UPDATE " + tableName + " SET ",
                fields = [],
                data = [];
            angular.forEach(params, function(value , field)
            {
                fields.push(field + "=?");
                data.push(value);
            });
            sql += fields.join(',');
            if (where) {
                sql += " WHERE " + where;
            }
            if (seriesTx!==false) // at this point the waterfallCall will hold the tx object
            {
                execute(seriesTx , sql , data , defer);
            }
            else {
                self.query(sql , data).then(function(result)
                {
                    defer.resolve(
                        self.parse(result , 'UPDATE')
                    );
                })['catch'](function(error)
                {
                    defer.reject(error);
                });
            }
            return defer.promise;
        };

        /**
         * DELETE
         * @param {string} tableName
         * @param {string} where sql statement fragment
         * @param {array} data bind by the ?
         * @returns {promise}
         */
        this.del = function(tableName, where , data)
        {
            data = data || [];
            var defer = $q.defer(),
                sql = "DELETE FROM " + tableName;
            if (where) {
                sql += " WHERE " + where;
            }
            if (seriesTx!==false) // at this point the waterfallCall will hold the tx object
            {
                execute(seriesTx , sql , data , defer);
            }
            else {
                self.query(sql , data).then(function(result)
                {
                    defer.resolve(
                        self.parse(result , 'DELETE')
                    );
                })['catch'](function(error)
                {
                    defer.reject(error);
                });
            }
            return defer.promise;
        };

        /**
         * getting the config options back just for testing
         * @returns {hash}
         */
        this.getOptions = function()
        {
            return {
                'database name': dbName,
                'database size': dbSize,
                'database version': dbVer,
                'database description': dbDesc,
                'debug mode': debugMode
            };
        };

        /**
         * Async series method
         * @params {array} tasks - array of function or config object
         * @returns {promise}
         */
        this.series = function(tasks)
        {
            var defer = $q.defer();
            // run
            self.getTransaction(function(err)
            {
                defer.reject({errror: err , msg: 'transaction level error from series'});
            }).then(function(tx)
            {
                seriesTx = tx;
                // no need to check, if async is not install then it died anyway
                async.series(getTasks(tasks) , function(err , result)
                {
                    seriesTx = false; // unset it
                    if (err) {
                        defer.reject(err);
                    }
                    else {
                        defer.resolve(result);
                    }
                });
            });
            return defer.promise;
        };


    }; // EO SqliteCls


    /**
     * AngularJS module
     */
    var app = angular.module('nbSqlite', []);
    app.provider('$nbSqlite', function()
    {
        var dbName = 'defaultDBName';
        var dbSize = 5*1024*1024; // 5mb by default, ignore in phonegap version
        var dbVersions = ['1.0','phonegap']; // add new phonegap option
        var dbVer  = '1.0';
        var dbDesc = 'Angular Sqlite Database';
        var debug  = false;

        /**
         * configurate some parameters for database, note, we don't want you to change the version number.
         * Its better to leave it out because some browser support it and other don't
         * 17 MAR 2015 - add version and change the order of the parameters
         * @param {string} name [name of your database]
         * @param {boolean} debugMode [set debug mode on off]
         * @param {string} ver [version of your database for swtich different environment]
         * @param {number} size [size of your database]
         * @param {string} desc [text description of your database]
         */
        this.config = function (name  , debugMode , ver , size , desc)
        {
            dbName = name || dbName;
            debug  = debugMode || debug;
            dbSize = size || dbSize;
            dbDesc = desc || dbDesc;
            if (ver) {
                if (dbVersions.indexOf(ver)===-1) {
                    throw "The version your supplied " + ver + " is not support. Supported: ['1.0','phonegap']";
                }
                dbVer = ver;
            }
        };

        /**
         * init
         */
        this.$get = ['$q' , function($q) {
            return new SqliteCls($q , dbName , dbSize , dbVer , dbDesc , debug);
        }];
    });

})(window, window.angular);