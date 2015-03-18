/**
 * runnnig test with jasmine
 */

 'use strict';


describe('angular-sqlite test', function()
{
    // first config the provider

    describe('Start the service with $config', function()
    {

        beforeEach(function() {
            angular.module('testApp');
        });

        it('should contain a nbSqlite service', inject(function(nbSqlite)
        {
            expect(nbSqlite).not.to.equal(null);
        }));

    }); // end Start the service with $config

}); // end angular-sqlite test