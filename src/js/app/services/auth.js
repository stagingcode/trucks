(function (app) {
    app.factory('Auth', [
        '$http',
        'authService',
        function ($http, authService) {
            var service = {};

            service.register = function (data, callback) {
                return $http.post('/api/auth/register', data).then(function () {
                    authService.loginConfirmed();
                    callback();
                }, callback);
            };

            service.login = function (data, callback) {
                $http.post('/api/auth/login', data).then(function () {
                    authService.loginConfirmed();
                    callback();
                }, callback);
            };

            service.recover = function (email, callback) {
                $http.post('/api/auth/recover', {email: email}).then(function () {
                    callback();
                }, callback);
            };

            service.setPassword = function(password, callback) {
                $http.post('/api/auth/setPassword', {password: password}).then(function (data) {
                    authService.loginConfirmed();
                    callback();
                }, callback);
            };

            return service;
        }
    ]);
}(window.app.main));