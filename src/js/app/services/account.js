(function (app) {
    app.factory('Account', [
        '$http',
        function ($http) {
            var service = {};
            var sessionUser = null;
            var loggedIn = false;

            service.getAccount = function (soft, callback) {
                if(typeof soft === 'function') {
                    callback = soft;
                    soft = false;
                }
                var config = {};
                if(soft) {
                    config.ignoreAuthModule = true;
                }
                if(sessionUser) {
                    setTimeout(callback.bind(callback, null, sessionUser), 1);
                    return;
                }
                $http.get('/api/account', config).then(function (data) {
                    loggedIn = true;

                    sessionUser = data.data;
                    callback(null, data.data);
                }, callback);
            };

            service.isLoggedIn = function () {
                return loggedIn;
            };

            service.update = function (data, callback) {
                $http.post('/api/account/save', data).then(function () {
                    callback();
                }, callback);
            };

            return service;
        }
    ]);
}(window.app.main));