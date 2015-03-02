(function (app) {
    'use strict';

    app.controller('Dashboard.MenuController', [
        '$scope',
        '$state',
        function ($scope, $state) {
            $scope.links = [
                {name: 'Dashboard', state: '.index'},
                {name: 'Account', state: '.account'}
            ];

            $scope.isActive = function (link) {
                return 'dashboard' + link.state === $state.current.name;
            };
        }
    ]);
}(window.app.main));
