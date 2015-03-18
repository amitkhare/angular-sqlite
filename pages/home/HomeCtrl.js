/**
*/

'use strict';

angular.module('myApp').controller('HomeCtrl', ['$scope', '$sqlite' ,function($scope, $sqlite) {
	//TODO - put any directive code here

    $scope.results = [];

    $sqlite.createTable('test' , {name:'TEXT',desc: 'TEXT',created: 'DATETIME'})
            .then(function(result)
            {
                console.log(result);
            });

    $sqlite.create('test' , {name: 'Joel' , desc: 'sucker' , created: new Date()})
           .then(function(results)
                 {
                    console.log(results);
                });


}]);