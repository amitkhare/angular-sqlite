/**
@toc
1. setup - whitelist, appPath, html5Mode
*/

'use strict';

angular.module('myApp', [
'ngRoute', 
'ngSanitize',	//additional angular modules
'nbSqlite'
]).
config(['$routeProvider', '$locationProvider', '$compileProvider', '$sqliteProvider',
        function($routeProvider, $locationProvider, $compileProvider , $sqliteProvider) {
	/**
	setup - whitelist, appPath, html5Mode
	@toc 1.
	*/
	$locationProvider.html5Mode(false);		//can't use this with github pages / if don't have access to the server
	
	// var staticPath ='/';
	var staticPath;
	// staticPath ='/angular-services/angularSqlite/';		//local
	staticPath ='/';		//nodejs (local)
	// staticPath ='/angularSqlite/';		//gh-pages
	var appPathRoute ='/';
	var pagesPath =staticPath+'pages/';
	
	
	$routeProvider.when(appPathRoute+'home', {templateUrl: pagesPath+'home/home.html'});

	$routeProvider.otherwise({redirectTo: appPathRoute+'home'});
            
    // our own stuff
            
    $sqliteProvider.setName('differentName');
	
}]);