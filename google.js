var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var map, directionStart, directionEnd;
var waypoints = [];
var waypointsLatLng = [];

function initialize() {
  directionsDisplay = new google.maps.DirectionsRenderer();
  var mapOptions = {
    center: new google.maps.LatLng(59.4372, 24.7453),
    zoom: 8
  };
  map = new google.maps.Map(document.getElementById("map-canvas"),
    mapOptions);


  initWeather();
  initDirection('Tallinn, Estonia', 'Pärnu, Estonia');
  setTimeout(function() {
    map.reload(true);
    google.maps.event.trigger(map, 'resize');
  }, 1000);

  google.maps.event.addListener(map, 'dblclick', function(e) {
    addMarker(e.latLng);
    waypoints.push({
      location: e.latLng,
      stopover: false
    });
    waypointsLatLng.push(e.latLng);
    initDirection(directionStart, directionEnd);
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

function getElevation(start, end, steps) {
  var path = waypointsLatLng;
  path.push(end);
  path.unshift(start);

  // Create a PathElevationRequest object using this array.
  // Ask for 256 samples along that path.
  var pathRequest = {
    'path': path,
    'samples': steps
  };

  // Initiate the path request.
  var elevator = new google.maps.ElevationService();
  elevator.getElevationAlongPath(pathRequest, function(results, status) {
    // make values for the chart
    var values = [];
    for(var result in results) {
      if(results.hasOwnProperty(result) && result && results[result].elevation) {
        values.push({x: result, y: results[result].elevation});
      }
    }

    console.log(values);
    // draw
    vg.parse.spec({
      "width": 900,
      "height": 200,
      "padding": {"top": 10, "left": 20, "bottom": 20, "right": 10},
      "data": [
        {
          "name": "table",
          "values": values
        }
      ],
      "scales": [
        {"name":"x", "type":"ordinal", "range":"width", "domain":{"data":"table", "field":"data.x"}},
        {"name":"y", "range":"height", "nice":true, "domain":{"data":"table", "field":"data.y"}}
      ],
      "axes": [
        {"type":"x", "scale":"x", "title": "Elevation", "values": []},
        {"type":"y", "scale":"y"}
      ],
      "marks": [
        {
          "type": "area",
          "from": {"data":"table"},
          "properties": {
            "enter": {
              "x": {"scale":"x", "field":"data.x"},
              "width": {"scale":"x", "band":true, "offset":-1},
              "y": {"scale":"y", "field":"data.y"},
              "y2": {"scale":"y", "value":0}
            },
            "update": { "fill": {"value":"seagreen"} },
            "hover": { "fill": {"value":"darkseagreen "} }
          }
        }
      ]
    }, function(chart) { chart({el:"#elevation-chart"}).update().on("mouseover", function(event, item) { console.log(item); }); });
  });
}

function initDirection(start, end) {
  directionStart = start;
  directionEnd = end;

  directionsDisplay.setMap(map);

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
      // calculate how many steps we'll do (1, 512)
      var steps = Math.floor((response.routes[0].legs[0].distance.value / 1000));
      getElevation(response.routes[0].legs[0].start_location, response.routes[0].legs[0].end_location, (steps < 512 && steps > 1 ? steps : '256'));
    }
  });
}

google.maps.event.addDomListener(window, 'load', initialize);