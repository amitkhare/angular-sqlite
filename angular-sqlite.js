/* global window , Date , console */
/**
@fileOverview

Found myself keep doing the same thing over and over again. 
Might as well create an angular module and share it. Hope it works for you :) 

@toc

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
     * @param   {[[Type]]} $q   [[Description]]
     * @param   {[[Type]]} name [[Description]]
     * @param   {[[Type]]} size [[Description]]
     * @param   {[[Type]]} ver  [[Description]]
     * @param   {[[Type]]} desc
     * @param   {boolean}  debug - turn on debug or not 
     * @returns {[[Type]]} [[Description]]
     */
    var HTML5SqliteCls = function($q , name , size , ver , desc , debug)
    {
        var dbName = name;
        var dbSize = size;
        var dbVer  = ver;
        var dbDesc = desc;
        var debugMode = debug; // useful for seeing what is happening inside 
        var db; // db object holder
        var self   = this;
        
        /////////////////
        //// Private ////
        /////////////////
        
        /**
         * connect to the database (or create a new one) 
         * @returns {object} database instance
         */
        var connect = function()
        {
            if (db===undefined || db===null) {
                db = openDatabase(dbName, dbVer, dbDesc, dbSize);
            } 
            return db;
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
         * execute a script and return a promise for $q.all to work 
         * @param {object} tx   db transaction object
         * @param {string} sql  sql statement
         * @param {array} data (optional) array of data
         * @returns {object} promise                    
         */
        var execute = function(tx , sql , data)
        {
            data = data || [];
            var defer = $q.defer();    
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
         * Execute a single sql 
         * @param {string} sql - sql statement
         * @return {object} database object
         */
        var query = function(sql , data)
        {  
            data = data || [];
            var defer = $q.defer();
            db.transaction(function(tx)
            {
                tx.executeSql(sql , data , function(tx , results)
                {
                    successHandler(results , defer);
                },function(tx , error)
                {
                    errorHandler(error , defer);
                });
            }); 
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
        var transaction = function(sqls , datas)
        {
            var defer = $q.defer();
            db.transaction(function(tx)
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
            },function(err)
            {
                defer.reject(err);
            });
            
            return defer.promise;
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
         * @returns {mixed}
         */
        var parse = function(results , type)
        {
            if (type) {
                type = type.toUpperCase();
            }
            switch (type)
            {
                case 'INSERT':
                    return results.insertId;
                case 'UPDATE':
                case 'DELETE':
                    return results.rowsAffected;    
                default:
                    //console.log(results);
                    var len = results.rows.length, i , data = [];
                    for (i=0; i<len; ++i) {
                        //console.log(results.rows.item(i));
                        data.push(results.rows.item(i));
                    }
                    return data;
            }
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
            var sql = "CREATE TABLE " , fields = [];
            if (overwrite) {
                sql += " IF NOT EXISTS ";
            }
            sql += name + " (";
            angular.forEach(params , function(value , key)
            {
                fields.push( key + " " + value );
            });
            sql += fields.join(',') + ")";
            return query(sql);
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
            db.transaction(function(tx)
            {
                defer.resolve(tx);
            },rollback);
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
            
            query(sql , ['table']).then(function(results)
            {
                defer.resolve(parse(results));
            })['catch'](function(error) {
                defer.reject(error);
            }); 
            
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
                sql = "INSERT INTO " + tableName + "(",
                fields = [], 
                data = [];
            angular.forEach(params, function(value,field)
            {
                fields.push(field);
                data.push(value);
            });
            
            sql += fields.join(',') + ") VALUES (" + placeholder(data.length) + ")";
            
            query(sql , data).then(function(results)
            {
                defer.resolve(parse(results , 'INSERT'));    
            })['catch'](function(error)
            {
                defer.resolve(error);
            });
            
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
            if (params.fields) { // arrray
                sql += params.fields.join(',');
            }
            else {
                sql += " * ";
            }
            
            sql += " FROM " + tableName;
            
            if (params.where) { // string
                sql += " WHERE " + params.where;
            }
            if (params.order) { // string
                sql += " ORDER BY " + params.order;
            }
            if (params.limit) { // string 
                sql += " LIMIT " + params.limit;
            }
            
            query(sql , data).then(function(result)
            {
                defer.resolve(parse(result));
            })['catch'](function(error)
            {
                defer.reject(error);
            });
            
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
            query(sql , data).then(function(result)
            {
                defer.resolve(parse(result , 'UPDATE'));
            })['catch'](function(error)
            {
                defer.reject(error);
            });
        
            return defer.promise;
        };
        
        /**
         * DELETE 
         * @param {string} tableName
         * @param {string} where sql statement fragment
         */
        this.del = function(tableName, where)
        {
            var defer = $q.defer(),
                sql = "DELETE FROM " + tableName;
            if (where) {
                sql += " WHERE " + where;   
            }
            query(sql).then(function(result)
            {
                defer.resolve(parse(result , 'DELETE'));
            })['catch'](function(error)
            {
                defer.reject(error);
            });
            return defer.promise;
        };
        
        /**
         * export them back 
         */
        this.parse = parse;
        this.query = query;
        
        // execute the connect 
        connect();
    };
                                       
                                    
    /**
     * AngularJS module 
     */
    var app = angular.module('nbSqlite', []);
    app.provider('$sqlite', function()
    {
        var dbName = 'defaultDBName';
        var dbSize = 5*1024*1024; // 5mb by default
        var dbVer  = '1.0';
        var dbDesc = 'Angular Sqlite Database';
        var debug  = false;
        /**
         * configurate some parameters for database, note, we don't want you to change the version number. 
         * Its better to leave it out because some browser support it and other don't 
         * @param {string} name [[Description]]
         * @param {number} size [[Description]]
         * @param {string} desc [[Description]]
         */
        this.config = function (name , size , desc , debugMode) {
            dbName = name || dbName;
            dbSize = size || dbSize;
            dbDesc = desc || dbDesc;
            debug  = debugMode || debug;
        };
        
        /**
         * init 
         */
        this.$get = ['$q' , function($q) {
            return new HTML5SqliteCls($q , dbName , dbSize , dbVer , dbDesc , debug);
        }];
    });
    
})(window, window.angular);