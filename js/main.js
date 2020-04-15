//wrap everything in a self-executing anonymous function to move to local scope

//pseudo-global variables
//list of attributes
var attrArray = ["Corn(1000Bushels)", "Wheat(1000Bushels)", "Oat(1000Bushels)", "Soybean(1000Bushels)", "Barley(1000Bushels)", "Cotton(1000Bales)"];
var expressed = attrArray[0]; //initiate an attribute
//chart frame dimensions
var chartWidth =  window.innerWidth * 0.35,
    chartHeight = 500,
    leftPadding = 45,
    rightPadding = 5,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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
    var projection =  d3.geoAlbersUsa()
        .scale(1000)
        .translate([width/2, height/2]);
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/USCropDataCSV.csv")); //load attributes from csv
    promises.push(d3.json("data/tl_2017_us_state.topojson")); //load spatial data
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        usPolygon = data[1];
        //place graticule on the map
        setGraticule(map, path);
        //translate TopoJSON file
        var us = topojson.feature(usPolygon, usPolygon.objects.tl_2017_us_state).features;
        //join csv data to GeoJSON enumeration units
        us = joinData(us, csvData);
        //create the color scale
        var colorScale = makeColorScale(expressed, csvData);
        //add enumeration units to the map
        setEnumerationUnits(us, map, path, colorScale);
        //add coordinated visualization to the map
        setChart(csvData, colorScale);
        createDropdown();
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
        var csvState = csvData[i]; //the current region
        var csvKey = csvState.NAME; //the CSV primary key
        //loop through geojson regions to find correct region
        for (var a=0; a<us.length; a++){
            var geojsonProps = us[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME; //the geojson primary key
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvState[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
         };
    };
    return us;
};


//function to create color scale generator
//natural break method
function makeColorScale(expressed, data){
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


function setEnumerationUnits(us, map, path, colorScale){
    //add France regions to map
    var states = map.selectAll(".states")
        .data(us)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "states " + d.properties.NAME.replace(/\s/g, ''); //avoid space in the class name, such as "New Jersey" to "NewJersey"
        })
        .attr("d", path)
        .style("fill", function(d){
            if (d.properties[expressed]){ //deal with no value data
              return colorScale(d.properties[expressed]);
            } else {
              return "#CCC";
            }
        })
        .on("mouseover", function(d){
           highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
    //add style descriptor to each path
    var desc = states.append("desc")
        .text('{"stroke": "#666", "stroke-width": "1px"}');
};


//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    //set bars for each state
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){ //rank from smallest to largest
            vA = a[expressed]?a[expressed]:0; //deal with no value
            vB = b[expressed]?b[expressed]:0;
            return vB - vA;
        })
        .attr("class", function(d){
            return "bars " + d.NAME.replace(/\s/g, ''); //remove space in class name, the same to above
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    //add style descriptor to each rect
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
    //place an empty axis
    var axis = d3.select('.chart')
       .append("g")
       .attr("class", "axis")
       .attr("transform", translate);
    updateChart(bars, csvData.length, colorScale);
    //create frame for chart border
    var chartFrame = chart.append("rect")
       .attr("class", "chartFrame")
       .attr("width", chartInnerWidth)
       .attr("height", chartInnerHeight)
       .attr("transform", translate);
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 80)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("2018 Annual Yield of " + expressed + " in states of the US");
};


//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.NAME.replace(/\s/g, ''))
        .style("stroke", "orange")
        .style("stroke-width", "3");
    setLabel(props);
};
//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.NAME.replace(/\s/g, ''))
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    d3.select(".infolabel")
        .remove();
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();
        var styleObject = JSON.parse(styleText);
        return styleObject[styleName];
    };
};


//function to create dynamic label
function setLabel(props){
    //label content
    var pop = props[expressed]? props[expressed]: "Not Available"
    var labelAttribute = "<h2>" + pop +
        "</h2><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.NAME + "_label")
        .html(labelAttribute);

    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME);
};
//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;
    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 30 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

//function to create a dropdown menu for attribute selection
function createDropdown(){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");
    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};


//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    //recreate the color scale
    var colorScale = makeColorScale(expressed, csvData);
    //recolor enumeration units
    var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(value);
            } else {
            	return "#ccc";
            }
        });
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            vA = a[expressed]?a[expressed]:0; //deal with no value
            vB = b[expressed]?b[expressed]:0;
            return vB - vA;
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);;
    updateChart(bars, csvData.length, colorScale);
    //add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text("2018 Annual Yield of " + expressed + " in states of the US");
};


//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    var att = [];
    for (var i=0; i<n; i++){
        att.push(csvData[i][expressed]?csvData[i][expressed]:0);
    };
    //update yScale
    var yScale = d3.scaleLinear()
        .range([chartInnerHeight, 0])
        .domain([0, Math.max(...att)]); //find the max value
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //resize bars
        .attr("height", function(d, i){
            return parseFloat(d[expressed])? chartInnerHeight - yScale(parseFloat(d[expressed])): 0; //deal with no value
        })
        .attr("y", function(d, i){
            return parseFloat(d[expressed])? yScale(parseFloat(d[expressed])) + topBottomPadding : chartInnerHeight + topBottomPadding;
        })
        //recolor bars
        .style("fill", function(d){
            return d[expressed]?colorScale(d[expressed]):"#CCC";
        });
    //update vertical axis
    var yAxis = d3.axisLeft()
       .scale(yScale);
    //place axis
    var axis = d3.select('.axis')
        .call(yAxis);
};
