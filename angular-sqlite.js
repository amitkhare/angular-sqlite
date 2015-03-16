/* global window , Date */
/**
@fileOverview

@toc

*/

(function(window, angular, undefined) { 'use strict';

    var AngularSqliteCls = function($q , name)
    {
        var dbName = name;
        
        this.getName = function()
        {
            return dbName;
        };
        
        this.connect = function()
        {
            
        };
        
        this.query = function(sql)
        {
            
        }
    };
                                       
                                    
    /**
     * AngularJS module 
     */
    var app = angular.module('nbSqlite', []);
    app.provider('$sqlite', function()
    {
        var dbName = 'defaultDBName';

        this.setName = function (name) {
            dbName = name;
        };

        this.$get = ['$q' , function($q) {
            return new AngularSqliteCls($q , dbName);
        }];
    });
    
})(window, window.angular);