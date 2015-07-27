# Angular Sqlite service

AngularJS service to access the HTML5 sqlite API or Phonegap sqlite plugin.

## Dependencies
- required:
	1. angularjs (latest)
    2. async (latest) for the series call

## Install

1. download the files

    1. Bower
        This module is not register with bower but you can install it directly from github

            bower install git@github.com:joelchu/angular-sqlite.git

2. include the files in your app

    1. `<script src="bower_components/angular-sqlite/angular-sqlite.min.js">`

3. include the module in angular (i.e. in `app.js`) - `nbSqlite`

    `angular.module('yourApp' , ['nbSqlite']);`

## Documentation

1. Include the module as show in `Install no.3`

2. You can configurate the module before use during the config phrase


        angular.module('yourApp' , ['nbSqlite'])
               .config(['$nbSqliteProvider' , function($nbSqliteProvider)
               {

                    $nbSqliteProvider.config(name , debugMode , ver , size , desc);
               }]);


    1. name - the database name
    2. debugMode - boolean, set to true then you can see console.log output
    3. ver - this is important to know, if you supply "1.0" it will use native HTML5 sqlite feature. If you are in phonegap and use this plugin (https://github.com/brodysoft/Cordova-SQLitePlugin) it will switch to support it. Just pass "phonegap" as version
    4. size - the size of the database by default its 5mb (5*1024*1024) - this value will be ignore if you are using ver:phonegap
    5. desc - description of the database, really don't need to set it. Keep it here just to be nice. Might remove in future reelase.


3. Then in your controller, you will get a `$nbSqlite` service

        angular.module('yourApp').controller(['$scope','$nbSqlite' , function($scope, $nbSqlite)
        {
            // implment whatever you need.
            // for example
            $nbSqlite.listTables().then(function(tables)
            {
                angular.forEach(tables, function(table) {
                    // key value pair of table info
                });
            });
        });

4. Almost all the public API return a promise from the angular stock version `$q.promise`. The only one which is the `$nbSqlite.parse` method.

5. The CRUD methods

    1. `$nbSqlite.create(tableName , params).then(callback)`
        This method expects the tableName, and hash of {fieldName: fieldValue} etc.

        The method will get the `insertId` which is the sqlite built-in `rowid` (its auto increment, so no need to set id field like mysql)

    2. `$nbSqlite.find(tableName, params).then(callback)`
        This method expects the tableName, and a collection of search parameters
        1. fields - an array of field names, by default it will be `*`
        2. where - (string) sql where statement (without the keyword WHERE)
        3. order - (string) sql order by statement (without the keyword ORDER BY)
        4. limit - (string) sql limit statement (without the keyword LIMIT) mostly you could just put {limit:1}

        The callback method will get the full set of data return in array

    3. `$nbSqlite.save(tableName, params , where).then(callback)`
        This method expects table name, hash of {fieldName: fieldValue} and a fragment of sql where statement
        The callback method will get the `rowAffected`

    4. `$nbSqlite.del(tableName, where).then(callback)`
        This method expects table name, and a fragment of where cause
        becareful - if you dont put the where, it will delete everything from the table.
        The callback method will get the `rowAffected`

6. Some extra util methods

    1. `$nbSqlite.createTable(tableName, params , overwrite)`
        Quick and easy method to generate table, pass a table name, hash of {fieldName, fieldType}
        by default the overwrite is false, pass true if you want to wipe the existing table

    2. `$nbSqlite.listTables().then(callback)`
        quick method to query the sqlite_master table and list all the type="table"


    3. `$nbSqlite.parse(results, type)`
        This is the only method that is not return a `$q.promise` it just a quick way to get the property
        from the sqlite database result object.
        If you dont' pass the type, then it will try to get the rows into an array and return it.
        pass it as `INSERT` then you will get the `insertId`
        pass `UPDATE` or `DELETE` then you will get the `rowsAffected`

7. More methods, sometime you might want to write big query, or need to access some lower levels.

    1. `$nbSqlite.query(sql ,data).then(callback)`
        sql statement, if you use placeholder `?` then pass array of data in the second parameters
        The callback method will the raw results object back. You can use the `$nbSqlite.parse` method to
        turn it into an array (or access other properties)


    2. `$nbSqlite.transaction(sqls, datas)`
        This will execute an array of sqls, and the array of data array (in the same order)
        note that we are using the stock version of angular $q. so the return promise ($q.all) can only tell you
        if they are all OK, or failed. One more thing is, the error handler is in the transaction level.
        What that mean is , if one of the query failed, it will rollback.

## Development

1. `git checkout gh-pages`
	1. run `npm install && bower install`
	2. write your code then run `grunt`
	3. git commit your changes
2. copy over core files (.js and .css/.less for directives) to master branch
	1. `git checkout master`
	2. `git checkout gh-pages angular-sqlite.js angular-sqlite.min.js`
3. update README, CHANGELOG, bower.json, and do any other final polishing to prepare for publishing
	1. git commit changes
	2. git tag with the version number, i.e. `git tag v1.0.0`
4. create github repo and push
	1. [if remote does not already exist or is incorrect] `git remote add origin [github url]`
	2. `git push origin master --tags` (want to push master branch first so it is the default on github)
	3. `git checkout gh-pages`
	4. `git push origin gh-pages`
5. (optional) register bower component
	1. `bower register angularSqlite [git repo url]`
