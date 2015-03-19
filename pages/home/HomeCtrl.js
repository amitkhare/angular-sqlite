/**
*/

'use strict';

angular.module('myApp').controller('HomeCtrl', ['$scope', '$nbSqlite' ,function($scope, $nbSqlite) {
	//TODO - put any directive code here

    $scope.results = [];

    $scope.result = null;

    $scope.hasDb = false;

    $scope.tables = [];

    $nbSqlite.listTables().then(function(tables)
    {
        $scope.tables = tables;
        if (tables.length>0) {
            $scope.hasDb = true;
            getData();
        }
    });

    var getData = function()
    {
        var params = {fields: ['rowid' , 'name' , 'desc','created']};
        $nbSqlite.find('test' , params).then(function(data)
        {
            $scope.results = data;
        });
    };


    $scope.call = function(what)
    {
        switch (what)
        {
            case 'create':
                $nbSqlite.createTable('test' , {name:'TEXT',desc: 'TEXT',created: 'DATETIME'})
                .then(function(result)
                {
                    console.log(result);
                });
            break;
            case 'save':
                $nbSqlite.create('test' , {name: $scope.user.name , desc: $scope.user.desc , created: new Date()})
                       .then(function(result)
                        {
                            $scope.user = {};
                            getData();
                        });
            break;
            case 'get':
                getData();
            break;
            case 'del':
                $nbSqlite.del('test').then(function(result)
                {
                    $scope.result = result;
                });
            break;
        }
    };







}]);