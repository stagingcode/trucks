(function (app) {
    app.controller('DashboardController', [
        '$scope',
        'Account',
        function ($scope, Account) {
            $scope.user = {};
            Account.getAccount(function (err, data) {
                $scope.user = data;
            });
        }
    ]);
}(window.app.main));
