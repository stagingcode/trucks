var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var map;
var waypoints = [];

function initialize() {
  directionsDisplay = new google.maps.DirectionsRenderer();
  var mapOptions = {
    center: new google.maps.LatLng(59.4372, 24.7453),
    zoom: 8
  };
  map = new google.maps.Map(document.getElementById("map-canvas"),
    mapOptions);


  initWeather()


  google.maps.event.addListener(map, 'dblclick', function(e) {
    addMarker(e.latLng);
    waypoints.push({
      location: e.latLng,
      stopover: false
    })

    initDirection();
  });

}

function initWeather() {
  var weatherLayer = new google.maps.weather.WeatherLayer({
    temperatureUnits: google.maps.weather.TemperatureUnit.CELSIUS
  });
  weatherLayer.setMap(map);

  var cloudLayer = new google.maps.weather.CloudLayer();
  cloudLayer.setMap(map);
}

function addMarker(markerPos) {
  var marker = new google.maps.Marker({
    position: markerPos,
    map: map,
    title: 'Hello World!'
  });
}

function initDirection() {

  directionsDisplay.setMap(map);

  var start = 'Tallinn, Estonia';
  var end = 'Pärnu, Estonia';

  var request = {
    origin:start,
    destination:end,
    waypoints: waypoints,
    optimizeWaypoints: true,
    travelMode: google.maps.TravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
    console.log(response);
    if (status == google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
    }
  });
}

google.maps.event.addDomListener(window, 'load', initialize);