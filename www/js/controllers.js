angular.module('starter')
    .controller('AppCtrl', function ($scope, $state, $ionicPopup, AuthService, AUTH_EVENTS) {
        $scope.username = AuthService.username();

        $scope.$on(AUTH_EVENTS.notAuthorized, function (event) {
            var alertPopup = $ionicPopup.alert({
                title: 'Unauthorized!',
                template: 'You are not allowed to access this resource.'
            });
        });

        $scope.$on(AUTH_EVENTS.notAuthenticated, function (event) {
            AuthService.logout();
            $state.go('login');
            var alertPopup = $ionicPopup.alert({
                title: 'Session Lost!',
                template: 'Sorry, You have to login again.'
            });
        });

        $scope.setCurrentUsername = function (name) {
            $scope.username = name;
        };
    })

    .controller('LoginCtrl', function ($scope, $state, $ionicPopup, AuthService) {
        $scope.data = {};

        $scope.login = function (data) {
            AuthService.login(data.username, data.password).then(function (authenticated) {
                $state.go('main.map', {}, {reload: true});
                $scope.setCurrentUsername(data.username);
            }, function (err) {
                var alertPopup = $ionicPopup.alert({
                    title: 'Login failed!',
                    template: 'Please check your credentials!'
                });
            });
        };
    })

    .controller('MapCtrl', function ($scope, $ionicPlatform, $state, AuthService, CONFIG, $ionicPopup, $cordovaNetwork, $cordovaGeolocation) {
        $ionicPlatform.ready(function () {

            $scope.logout = function () {
                AuthService.logout();
                $state.go('login');
            };

            if ($cordovaNetwork.isOnline()) {

                $scope.helpMe = function () {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Ajuda',
                        template: '-Duplo click no mapa para reportar posição <br/>' +
                        '-Clique no botão inferior direito para centrar mapa na posição aproximada'
                    });
                };

                var marker;

                var map = L.map('map', {
                    center: [CONFIG.map_center_lat, CONFIG.map_center_lng],
                    minZoom: 5,
                    zoom: CONFIG.map_zoom,
                });

                L.tileLayer('http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="http://osm.org/copyright" title="OpenStreetMap" target="_blank">OpenStreetMap</a> contributors | Tiles Courtesy of <a href="http://www.mapquest.com/" title="MapQuest" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png" width="16" height="16">',
                    subdomains: ['otile4']
                }).addTo(map);

                map.locate({setView: true, maxZoom: 18});

                // map.on('dblclick', onMapDblClick);
                map.on('dblclick', onMapClick);

                function onMapClick(e) {
                    if (marker == undefined) {
                        marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map)

                    } else {
                        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
                    }

                    map.panTo(e.latlng, {animate: true, duration: 5.0});

                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Reportar',
                        template: 'Confirma a posição?',
                        cssClass: 'customPopup',
                        okText: 'Confirmo', // String (default: 'OK'). The text of the OK button.
                    });

                    confirmPopup.then(function (res) {
                        if (res) {
                            window.location.reload(true);
                            window.location = "#/main/form/" + e.latlng.lat + '/' + e.latlng.lng;
                        }
                    });
                }

                $scope.reloadRoute = function () {
                    map.locate({setView: true, Zoom: 18});
                };
            }
            
            if ($cordovaNetwork.isOffline()) {
                var alertPopup = $ionicPopup.alert({
                    title: 'Offline',
                    template: 'Está em modo offline, não será reportado para o servidor'
                });

                var posOptions = {timeout: 10000, enableHighAccuracy: false};
                $cordovaGeolocation.getCurrentPosition(posOptions)
                    .then(function (position) {
                        var lat = position.coords.latitude
                        var long = position.coords.longitude
                        // window.location.reload(true);
                        window.location = "#/main/form/" + lat + '/' + long;
                    }, function (err) {

                        $timeout(function () {
                            $state.go('main.form', {}, {reload: true});
                        }, 8000);

                    });
            }
        });
    })

    .controller('FormCtrl', function ($scope, $ionicPlatform, $cordovaFile,
                                      $cordovaCamera, $cordovaFileTransfer,
                                      $ionicPopup, $http, $stateParams,
                                      $cordovaNetwork, $cordovaDialogs, CONFIG, AuthService, $cordovaNetwork, $state, $timeout) {
        $ionicPlatform.ready(function () {

            $scope.helpMe = function () {
                var alertPopup = $ionicPopup.alert({
                    title: 'Ajuda',
                    template: '-Permitido fazer upload 3 imagens pela aplicação, poderá posteriormente editar o evento e adicionar novas fotografias'
                });
            };
            $scope.photo = [];
            $scope.image = [];
            $scope.data = {};
            $scope.data.user = AuthService.user();
            if ($stateParams.lat != undefined) {
                $http.get('http://nominatim.openstreetmap.org/reverse?format=json&lat=' + $stateParams.lat + '&lon=' + $stateParams.lng + '&zoom=18&addressdetails=1')
                    .success(function (response) {
                        $scope.stories = angular.fromJson(response.address);
                        if ($scope.stories.road != undefined) {
                            $scope.data.address = $scope.stories.road;
                            $scope.data.address += ', ';
                        }
                        if ($scope.stories.city_district != undefined) {
                            $scope.data.address += $scope.stories.city_district;
                            $scope.data.address += ', ';
                        }
                        if ($scope.stories.county != undefined) {
                            $scope.data.address += $scope.stories.county;
                            $scope.data.address += ', ';
                        }
                        if ($scope.stories.postcode != undefined) {
                            $scope.data.address += $scope.stories.postcode;
                            $scope.data.address += ', ';
                        }
                        if ($scope.stories.country != undefined) {
                            $scope.data.address += $scope.stories.country;
                        }
                    });

                $scope.data.coordenadas = $stateParams.lat + ',' + $stateParams.lng;

            }

            $scope.takePhoto = function () {
                var options = {
                    quality: 50,
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType.CAMERA,
                    correctOrientation: true,
                    saveToPhotoAlbum: true,
                    targetWidth: 500,
                };
                $cordovaCamera.getPicture(options).then(function (imageFullPath) {

                    if ($scope.photo.length <= 3) {
                        $scope.image.push(imageFullPath);
                        $scope.photo.push('<img id="imageFile" src="' + imageFullPath + '" width="160px" height="auto"/>');
                    }


                }, function (error) {
                    console.warn("PICTURE ERROR: " + angular.toJson(error));
                });

            };
            $scope.submit = function () {
                //$scope.data.user = AuthService.user_id();
                // if ($scope.data.event == 0 || $scope.data.length <= 4 || $scope.photo.length != 0) {
                if ($scope.data.event == 0 || $scope.data.length <= 3) {

                    var alertPopup = $ionicPopup.alert({
                        title: 'Formulário',
                        template: 'Campos não preenchidos.'
                    });

                } else {
                    var isOnline = $cordovaNetwork.isOnline();
                    if (isOnline) {
                        $http({
                            method: 'get',
                            url: CONFIG.hostname + 'webservice/report',
                            params: $scope.data
                        }).then(function successCallback(response) {
                            if (response.data.status != 'FAIL') {
                                var id = response.data.event;

                                //uploadFile($scope.image, response.data.event);
                                angular.forEach($scope.image, function (value) {
                                    uploadFile(value, response.data.event);
                                });

                                var alertPopup = $ionicPopup.alert({
                                    title: 'Ocorrência',
                                    template: 'Foi reportado com sucesso a sua ocorrência'
                                });

                            } else {
                                var alertPopup = $ionicPopup.alert({
                                    title: 'Ocorrência',
                                    template: 'Erro ao reportar, preencha todo os campos'
                                });
                            }

                        }, function errorCallback(response) {
                            var alertPopup = $ionicPopup.alert({
                                title: 'Ocorrência',
                                template: 'Erro no servidor, tente novamente mais tarde'
                            });
                        });
                    } else {

                        $cordovaFile.checkFile(cordova.file.applicationStorageDirectory, "prevcrimeapp.txt")
                            .then(function (success) {
                                $cordovaFile.writeExistingFile(cordova.file.applicationStorageDirectory, "prevcrimeapp.txt", '\n' + angular.toJson($scope.data))
                                    .then(function (success) {
                                        console.log(success);
                                        var alertPopup = $ionicPopup.alert({
                                            title: 'Modo offline',
                                            template: 'A ocorrencia foi reportada em modo offline, quando tiver ligação será enviado para o servidor, onde terá de confirmar os dados'
                                        });
                                    }, function (error) {
                                        console.log(error);
                                        var alertPopup = $ionicPopup.alert({
                                            title: 'Modo offline',
                                            template: 'Erro ao reportar em modo offline, tente novamente 1'
                                        });
                                    });

                            }, function (error) {
                                $cordovaFile.createFile(cordova.file.applicationStorageDirectory, "prevcrimeapp.txt", true)
                                    .then(function (success) {
                                        $cordovaFile.writeFile(cordova.file.applicationStorageDirectory, "prevcrimeapp.txt", '\n' + angular.toJson($scope.data), true)
                                            .then(function (success) {
                                                console.log(success);
                                                var alertPopup = $ionicPopup.alert({
                                                    title: 'Modo offline',
                                                    template: error + 'A ocorrencia foi reportada em modo offline, quando tiver ligação será enviado para o servidor, onde terá de confirmar os dados'
                                                });
                                            }, function (error) {
                                                console.log(error);
                                                var alertPopup = $ionicPopup.alert({
                                                    title: 'Modo offline',
                                                    template: 'Erro ao reportar em modo offline, tente novamente 2'
                                                });
                                            });
                                    }, function (error) {
                                        var alertPopup = $ionicPopup.alert({
                                            title: 'Modo offline',
                                            template: 'Erro ao reportar em modo offline, tente novamente 3'
                                        });
                                    });
                            });
                    }
                }
                $timeout(function () {
                    $state.go('main.map');
                }, 8000);

            };

            function uploadFile(imageFullPath, id) {
                console.warn(imageFullPath);
                var options = {
                    fileKey: "image",
                    fileName: imageFullPath.substr(imageFullPath.lastIndexOf('/') + 1),
                    chunkedMode: false,
                    mimeType: "image/jpg"
                };

                $cordovaFileTransfer.upload(CONFIG.hostname + 'webservice/image/' + id, imageFullPath, options)
                    .then(function (result) {
                        deleteTemporaryImageFile(imageFullPath, options.fileName);

                    }, function (error) {

                        var alertPopup = $ionicPopup.alert({
                            title: 'Fotogafia',
                            template: 'Erro ao enviar imagem' + angular.toJson(error)
                        });
                    });
            }

            function deleteTemporaryImageFile(filePath, FileName) {
                var path = filePath.substring(0, filePath.lastIndexOf("/") + 1);
                $cordovaFile.removeFile(path, FileName)
                    .then(function (success) {
                    }, function (error) {
                    });
            };

            $("#categoria").change(function () {
                var categorie = $('#categoria').find(":selected").val();

                var acessibilidade = {
                    1: 'Estado dos arruamentos',
                    2: 'Estado dos passeios'
                };
                var ambiente = {
                    3: 'Lixo disperso',
                    4: 'Degradação habitacional',
                    5: 'Degradação das áreas públicas comuns',
                    6: 'Sinais de Vandalismo/Vandalismo'
                };

                var vigilancia = {
                    7: 'Camaras de Vigilância',
                    8: 'Patrulhamento',
                    9: 'Transeuntes',
                    10: 'Residentes/Moradores'
                };

                var espaco = {
                    11: 'Delimitação de passagens pedonais',
                    12: 'Areas/ Espaços de confinamento',
                    13: 'Becos sem saída'
                };

                var visibilidade = {
                    14: 'Iluminacao',
                    15: 'Barreiras Fisicas',
                    16: 'Esquinas cegas',
                    17: 'Locais cegos',
                    18: 'Distribuicao de luminacao'
                };
                switch (categorie) {
                    case '1':
                        addElementsSubcategorie(acessibilidade);
                        break;
                    case '2':
                        addElementsSubcategorie(ambiente);
                        break;
                    case '3':
                        addElementsSubcategorie(vigilancia);
                        break;
                    case '4':
                        addElementsSubcategorie(espaco);
                        break;
                    case '5':
                        addElementsSubcategorie(visibilidade);
                        break;
                }
            });

            function addElementsSubcategorie(categorie) {

                $('#subcategoria')
                    .find('option')
                    .remove()
                    .end();
                $('#subcategoria ')
                    .append($('<option>', {value: 0})
                        .text(''));

                $.each(categorie, function (key, value) {
                    $('#subcategoria ')
                        .append($('<option>', {value: key})
                            .text(value));
                });

            };

        });
    });