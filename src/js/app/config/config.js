window.app.main.config([
    '$locationProvider',
    '$stateProvider',
    '$urlRouterProvider',
    '$httpProvider',
    function ($locationProvider, $stateProvider, $urlRouterProvider, $httpProvider) {
        $locationProvider.html5Mode(true);
        //
        // For any unmatched url, redirect to /
        $urlRouterProvider.otherwise('/app/dashboard');
        //
        // Now set up the states
        $stateProvider
            .state('error', {
                url: '/app/error',
                templateUrl: 'error.html',
                controller: 'ErrorController'
            })
            .state('dashboard', {
                url: '/app',
                abstract: true,
                templateUrl: 'dashboard.html',
                controller: 'DashboardController'
            })
            .state('dashboard.index', {
                url: '/dashboard',
                templateUrl: 'dashboard-index.html',
                controller: 'Dashboard.IndexController'
            })
            .state('dashboard.account', {
                url: '/account',
                templateUrl: 'dashboard-account.html',
                controller: 'Dashboard.AccountController'
            });

        $httpProvider.interceptors.push(function ($q) {
            return {
                responseError: function (reason) {
                    if(reason.status === 401) {
                        window.location.href = '/login?return=' + encodeURIComponent(window.location.href);
                        return;
                    }
                    //TODO: Here we will put 401 interceptor
                    return $q.reject(reason);
                }
            };
        });
    }
]);