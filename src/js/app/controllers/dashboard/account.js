(function (app, ng) {
    'use strict';

    app.controller('Dashboard.AccountController', [
        '$scope',
        'Account',
        function ($scope, Account) {
            $scope.password = '';
            $scope.password2 = '';
            $scope.oldpassword = '';

            $scope.update = function () {
                $scope.invalid = {};
                $scope.missing = {};

                if($scope.passwordForm.$invalid) {
                    $scope.missing = {
                        password: !$scope.password,
                        password2: !$scope.password2
                    };
                    return;
                }

                if($scope.password !== $scope.password2) {
                    $scope.invalid = {
                        password: true,
                        password2: true
                    };
                    return;
                }
                $scope.error = false;
                $scope.success = false;
                $scope.inProgress = true;

                Account.update({
                    password: $scope.password,
                    password2: $scope.password2,
                    oldpassword: $scope.oldpassword
                }, function (err) {
                    console.log(arguments);
                    $scope.inProgress = false;
                    if(!err) {
                        $scope.success = true;
                        $scope.password = $scope.password2 = '';
                    } else {
                        $scope.invalid[err.data.field] = true;
                        $scope.errorMessage = err.data.message;
                        $scope.error = true;
                    }
                });
            };

            /*
            ng.element('.form').on('keyup', 'input', function (e) {
                if(e.keyCode === 13) {
                    $scope.update();
                }
            });
            */
        }
    ]);
}(window.app.main, window.angular));
