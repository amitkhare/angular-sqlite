/**
*/

'use strict';

angular.module('myApp').controller('HomeCtrl', ['$scope', '$sqlite' ,function($scope, $sqlite) {
	//TODO - put any directive code here
    
    
    $scope.dbName = $sqlite.getName() || 'crap'; //angularSqlite.getName();

    //warn.invoke($log);

    
    
}]);