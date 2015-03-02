(function (app) {
    app.controller('MainController', [
        '$scope',
        '$rootScope',
        '$state',
        function ($scope, $rootScope, $state) {

            var oldState = 'dashboard.index';
            $rootScope.$on('event:auth-loginConfirmed', function () {
                $state.go(oldState);
            });

            $rootScope.$on('event:auth-loginRequired', function () {
                oldState = $state.current.name;
                $state.go('home.login');
            });

            $rootScope.$on('event:server-error', function () {
                $state.go('error');
            });

            $scope.logout = function () {
                window.location.href = '/logout';
            };
        }
    ]);
}(window.app.main));
