angular.module('starter')

    .service('AuthService', function ($q, $http, USER_ROLES, $ionicPopup, CONFIG) {
        var LOCAL_TOKEN_KEY = 'yourTokenKey';
        var username = '';
        var isAuthenticated = false;
        var role = '';
        var authToken;
        var user;

        function loadUserCredentials() {
            var token = window.localStorage.getItem(LOCAL_TOKEN_KEY);
            if (token) {
                useCredentials(token);
            }
        }

        function storeUserCredentials(token) {
            window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
            useCredentials(token);
        }

        function useCredentials(token) {
            username = token.split('.')[1];
            user = token.split('.')[0];
            isAuthenticated = true;
            authToken = token;

            role = USER_ROLES.public


            // Set the token as header for your requests!
            $http.defaults.headers.common['X-Auth-Token'] = token;
        }

        function destroyUserCredentials() {
            authToken = undefined;
            username = '';
            user = '';
            isAuthenticated = false;
            $http.defaults.headers.common['X-Auth-Token'] = undefined;
            window.localStorage.removeItem(LOCAL_TOKEN_KEY);
        }

        var login = function (name, pw) {
            return $q(function (resolve, reject) {
                $.get(CONFIG.hostname + "/webservice/jar").then(function successCallback(response) {
                    var token = response;
                    var data = {login_pass: pw, login_string: name, login_token: token};

                    $.post(CONFIG.hostname + "/auth/ajax_attempt_login", data).then(function successCallback(response) {
                        if (response.status == 'success') {
                            // Make a request and receive your auth token from your server
                            storeUserCredentials(response.user_id + '.' + name + '.yourServerToken');
                            resolve('Login success.');

                        } else {
                            reject('Login Failed.');
                        }

                    }, function errorCallback(response) {
                        reject('Login Failed.');
                    });
                }, function errorCallback(response) {
                });
            });
        };
        var logout = function () {
            destroyUserCredentials();
            $.get(CONFIG.hostname + "/auth/logout").then(function successCallback(response) {
            }, function errorCallback(response) {
            });

        };

        var isAuthorized = function (authorizedRoles) {
            if (!angular.isArray(authorizedRoles)) {
                authorizedRoles = [authorizedRoles];
            }
            return (isAuthenticated && authorizedRoles.indexOf(role) !== -1);
        };

        loadUserCredentials();

        return {
            login: login,
            logout: logout,
            isAuthorized: isAuthorized,
            isAuthenticated: function () {
                return isAuthenticated;
            },
            username: function () {
                return username;
            },
            user: function () {
                return user;
            },
            role: function () {
                return role;
            }
        };
    })


    .factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        return {
            responseError: function (response) {
                $rootScope.$broadcast({
                    401: AUTH_EVENTS.notAuthenticated,
                    403: AUTH_EVENTS.notAuthorized
                }[response.status], response);
                return $q.reject(response);
            }
        };
    })

    .config(function ($httpProvider) {
        $httpProvider.interceptors.push('AuthInterceptor');
    });
