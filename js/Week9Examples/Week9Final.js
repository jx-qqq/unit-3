//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 900,
        height = 500;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on US
    var projection =  d3.geoAlbers()
      .scale(1000)
      .translate([480, 250]);

    //Interesting here: geoAlbers by default centered at US, which takes parameters as:
    // var projection =  d3.geoAlbers()
    //     .parallels([29.5, 45.5])
    //     .scale(1070)
    //     .translate([480, 250])
    //     .rotate([96, 0])
    //     .center([-0.6, 38.7]);


    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/USCropDataCSV.csv")); //load attributes from csv
    promises.push(d3.json("data/US_continent_4326.topojson")); //load spatial data
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        us = data[1];
        //translate TopoJSON file
        var usPolygon = topojson.feature(us, us.objects.US_continent_4326);

        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path); //project geoGraticule
        console.log(gratBackground);

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines

        //add background to map
        var country = map.append("path")
            .datum(usPolygon)
            .attr("class", "country")
            .attr("d", path);
        console.log(country);

        //add US states to map
        var states = map.selectAll(".states")
            .data(usPolygon.features) //this has to be .features to work
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.NAME;
            })
            .attr("d", path);
        console.log(states);

    };
};
