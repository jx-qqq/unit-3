//wrap everything in a self-executing anonymous function to move to local scope

//pseudo-global variables
//list of attributes
var attrArray = ["Corn(1000Bushels)", "Wheat(1000Bushels)", "Oat(1000Bushels)", "Soybean(1000Bushels)", "Barley(1000Bushels)", "Cotton(1000Bales)"];
var expressed = attrArray[0]; //initial attribute
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //MAP, PROJECTION, PATH, AND QUEUE BLOCKS FROM MODULE 8
    //create new svg container for the map
    //map frame dimensions
    var width =  window.innerWidth * 0.6,
        height = 500;
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    //create Albers equal area conic projection centered on US
    var projection =  d3.geoAlbers()
        .scale(1050)
        .translate([width/2, height/2]);
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/USCropDataCSV.csv")); //load attributes from csv
    promises.push(d3.json("data/US_continent_4326.topojson")); //load spatial data
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        usPolygon = data[1];
        //place graticule on the map
        setGraticule(map, path);
        //translate TopoJSON file
        var us = topojson.feature(usPolygon, usPolygon.objects.US_continent_4326).features;
        //join csv data to GeoJSON enumeration units
        us = joinData(us, csvData);

        //create the color scale
        var colorScale = makeColorScale(csvData);
        //add enumeration units to the map
        setEnumerationUnits(us, map, path, colorScale);
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
    };

}; //end of setMap()


function setGraticule(map, path){
    //GRATICULE BLOCKS FROM MODULE 8
    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude
    //create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path); //project geoGraticule
    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
};


function joinData(us, csvData){
    //DATA JOIN LOOPS
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.States; //the CSV primary key
        //loop through geojson regions to find correct region
        for (var a=0; a<us.length; a++){
            var geojsonProps = us[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME; //the geojson primary key
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
         };
    };
    return us;
};


function setEnumerationUnits(us, map, path, colorScale){
    //add France regions to map
    var States = map.selectAll(".regions")
        .data(us)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "states " + d.properties.NAME;
        })
        .attr("d", path)
        .style("fill", function(d){
            if (d.properties[expressed]){
              return colorScale(d.properties[expressed]);
            } else {
              return "#CCC";
            }
        });
};

//function to create color scale generator
//natural break method
function makeColorScale(data){
    var colorClasses = [
        '#b2e2e2',
        '#66c2a4',
        '#2ca25f',
        '#006d2c'
    ];
    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);
    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        if (parseFloat(data[i][expressed])){
          var val = parseFloat(data[i][expressed]);
        } //deal with no data
        domainArray.push(val);
    };
    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 4);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
       return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();
    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);
    return colorScale;
};


//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth =  window.innerWidth * 0.35,
        chartHeight = 500;
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    var att = [];
    for (var i=0; i<csvData.length; i++){
        att.push(csvData[i][expressed]?csvData[i][expressed]:0);
    };
    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartHeight * 0.98])
        .domain([0, Math.max(...att)]); //find the max value
    //set bars for each state
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){ //rank from smallest to largest
            vA = a[expressed]?a[expressed]:0; //deal with no value
            vB = b[expressed]?b[expressed]:0;
            return vA - vB;
        })
        .attr("class", function(d){
            return "bars " + d.States;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d){
            return parseFloat(d[expressed])? parseFloat(d[expressed]):0; //deal with no value
        })
        .attr("y", function(d){
            return parseFloat(d[expressed])? chartHeight - yScale(parseFloat(d[expressed])):0;
        })
        .style("fill", function(d){
            return d[expressed]?colorScale(d[expressed]):"#CCC";
        });

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            vA = a[expressed]?a[expressed]:0; //deal with no value
            vB = b[expressed]?b[expressed]:0;
            return vA - vB;
        })
        .attr("class", function(d){
            return "numbers " + d.States;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction - (fraction - 1) / 6;
        })
        .attr("y", function(d){
            return parseFloat(d[expressed]) ? chartHeight - yScale(parseFloat(d[expressed])) : chartHeight;
        })
        .text(function(d){
            //format the text
            text = d[expressed] ? d[expressed] : 0;
            text = text>1000000 ? (text/1000000).toFixed(2) + 'M' : (text>1000 ? (text/1000).toFixed(0)+'K' : text);
            return text
        });
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("2018 Annual Yield of " + expressed + "in states of the US");
};
