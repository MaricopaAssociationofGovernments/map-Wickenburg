/*! main.js | Wickenburg Zoning Website @ MAG */

require([
        "dojo/dom-construct",
        "dojo/dom",
        "dojo/on",
        "dojo/parser",
        "dojo/query",
        "dojo/keys",
        "esri/sniff",
        "esri/map",
        "esri/SnappingManager",
        "esri/dijit/Measurement",
        "esri/dijit/Scalebar",
        "esri/dijit/HomeButton",
        "esri/dijit/LocateButton",
        "esri/dijit/Geocoder",
        "esri/graphic",
        "esri/geometry/Multipoint",
        "esri/symbols/PictureMarkerSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/tasks/IdentifyTask",
        "esri/tasks/IdentifyParameters",
        "esri/dijit/Popup",
        "dojo/_base/array",
        "dojo/_base/Color",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/dijit/Legend",
        "dijit/form/CheckBox",
        "dijit/form/HorizontalSlider",
        "dijit/form/HorizontalRule",
        "dijit/form/HorizontalRuleLabels",
        "js/vendor/bootstrapmap.min.js",
        "esri/dijit/BasemapToggle",

        "esri/layers/FeatureLayer",
        "esri/dijit/PopupTemplate",
        "esri/InfoTemplate",
        "esri/symbols/SimpleMarkerSymbol",

        "esri/dijit/Print",
        "esri/tasks/PrintTemplate",
        "esri/request",
        "esri/config",

        "dojo/domReady!"
    ],

    function(dc, dom, on, parser, query, keys, has, Map, SnappingManager, Measurement, Scalebar, HomeButton, LocateButton, Geocoder,
        Graphic, Multipoint, PictureMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, IdentifyTask, IdentifyParameters, Popup, arrayUtils, Color, ArcGISDynamicMapServiceLayer, Legend, CheckBox, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, BootstrapMap, BasemapToggle, FeatureLayer, PopupTemplate, InfoTemplate, SimpleMarkerSymbol, Print, PrintTemplate, esriRequest, esriConfig) {

        parser.parse();

        esri.config.defaults.io.proxyUrl = "proxy/proxy.ashx";
        esri.config.defaults.io.alwaysUseProxy = false;

        // add version and date to about.html, changed in config.js
        dom.byId("version").innerHTML = appConfig.Version;

        // var identifyParams;
        var tocLayers = [];
        var legendLayers = [];

        // line set up for measurement tool
        var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([0, 128, 255]), 3), null);

        // create a popup to replace the map's info window
        var fillSymbol3 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([0, 255, 255]), 2), new Color([0, 255, 255, 0.25]));

        var pointSymbol = new SimpleMarkerSymbol("circle", 26, null,
            new Color([0, 0, 0, 0.25]));

        var popup = new Popup({
            fillSymbol: fillSymbol3,
            // lineSymbol:
            markerSymbol: pointSymbol
        }, dc.create("div"));

        // create the map and specify the custom info window as the info window that will be used by the map
        // <!-- Get a reference to the ArcGIS Map class -->
        var map = BootstrapMap.create("mapDiv", {
            extent: new esri.geometry.Extent(appConfig.initExtent),
            lods: appConfig.lods,
            basemap: "streets",
            showAttribution: false,
            logo: false,
            infoWindow: popup,
            sliderPosition: "top-right",
            scrollWheelZoom: true
        });

        map.on("load", mapReady);

        var identifyHandler = map.on("click", executeIdentifyTask);
        // remove event listener on map close
        map.on("unload", executeIdentifyTask);

        var scalebar = new Scalebar({
            map: map,
            // scalebarUnit: "dual"
            scalebarUnit: "english"
        });

        // create div for homebutton
        var homeButton = new HomeButton({
            map: map,
            visible: true //show the button
        }, dc.create("div", {
            id: "HomeButton"
        }, "mapDiv", "last"));
        homeButton._homeNode.title = "Original Extent";
        homeButton.startup();

        // create div for geolocatebutton
        var geoLocateButton = new LocateButton({
            map: map,
            visible: true,
        }, dc.create("div", {
            id: "LocateButton"
        }, "mapDiv", "last"));
        geoLocateButton.startup();

        var toggle = new BasemapToggle({
            // theme: "basemapToggle",
            map: map,
            visible: true,
            basemap: "satellite"
        }, dc.create("div", {
            id: "BasemapToggle"
        }, "mapDiv", "last"));
        toggle.startup();

        // trying to add to geocoder widget?
        // var geocoders = [{
        //     url: "http://geo.azmag.gov/gismag/rest/services/maps/WI_Employers/MapServer/0",
        //     name: "employers"
        //     singleLineFieldName:
        // }];

        // create geosearch widget
        var geocoder = new Geocoder({
            value: "",
            zoomScale: 10,
            maxLocations: 10,
            autoComplete: true,
            // arcgisGeocoder: true,
            arcgisGeocoder: {
                sourceCountry: "USA",
                placeholder: "155 N Tegner St, Wickenburg, AZ"
            },
            // geocoders:
            map: map
        }, "geosearch");
        geocoder.startup();
        geocoder.on("select", geocodeSelect);
        geocoder.on("findResults", geocodeResults);
        geocoder.on("clear", clearFindGraphics);

        // Print Functions for Print dijit
        //=================================================================================>
        // get print templates from the export web map task
        var printInfo = esriRequest({
            "url": appConfig.printUrl,
            "content": {
                "f": "json"
            }
        });
        printInfo.then(handlePrintInfo, handleError);

        function handlePrintInfo(resp) {
            var layoutTemplate, templateNames, mapOnlyIndex, templates;

            layoutTemplate = arrayUtils.filter(resp.parameters, function(param, idx) {
                return param.name === "Layout_Template";
            });

            if (layoutTemplate.length === 0) {
                console.log("print service parameters name for templates must be \"Layout_Template\"");
                return;
            }
            templateNames = layoutTemplate[0].choiceList;

            // // remove the MAP_ONLY template then add it to the end of the list of templates
            // mapOnlyIndex = arrayUtils.indexOf(templateNames, "MAP_ONLY");
            // if ( mapOnlyIndex > -1 ) {
            //     var mapOnly = templateNames.splice(mapOnlyIndex, mapOnlyIndex + 1)[0];
            //     templateNames.push(mapOnly);
            // }

            // remove the MAP_ONLY template from the dropdown list
            mapOnlyRemove = arrayUtils.indexOf(templateNames, "MAP_ONLY");
            if (mapOnlyRemove > -1) {
                templateNames.splice(mapOnlyRemove, mapOnlyRemove);
            }

            // create a print template for each choice
            templates = arrayUtils.map(templateNames, function(ch) {
                var plate = new PrintTemplate();
                plate.layout = plate.label = ch;
                plate.format = "PDF";
                plate.layoutOptions = {
                    // "authorText": "Made by:  MAG's JS API Team",
                    // "copyrightText": "<copyright info here>",
                    // "legendLayers": [],
                    "titleText": "Wickenburg Zoning"
                    // "scalebarUnit": "Miles"
                };
                return plate;
            });

            // create the print dijit
            printer = new Print({
                "map": map,
                "templates": templates,
                url: appConfig.printUrl
            }, dom.byId("printButton"));
            printer.startup();
        }

        function handleError(err) {
            console.log("Something broke: ", err);
        }


        //=================================================================================>
        // add layers to map

        var wiZoningURL = appConfig.wiZoningURL;
        var wiZoning = map.addLayer(new ArcGISDynamicMapServiceLayer(wiZoningURL, {
            id: "wiZoning",
            visible: true,
            opacity: 0.65
        }));

        var wiFloodURL = appConfig.wiFloodURL;
        var wiFlood = map.addLayer(new ArcGISDynamicMapServiceLayer(wiFloodURL, {
            id: "wiFlood",
            visible: false,
            opacity: 0.65
        }));

        var tParcelsURL = appConfig.tParcelsURL;
        var tParcels = map.addLayer(new ArcGISDynamicMapServiceLayer(tParcelsURL, {
            id: "tParcels",
            visible: false,
            opacity: 1
        }));

        var coBoundaryURL = appConfig.coBoundaryURL;
        var coBoundary = map.addLayer(new ArcGISDynamicMapServiceLayer(coBoundaryURL, {
            id: "coBoundary",
            visible: true,
            opacity: 1
        }));

        var wiBoundaryURL = appConfig.wiBoundaryURL;
        var wiBoundary = map.addLayer(new ArcGISDynamicMapServiceLayer(wiBoundaryURL, {
            id: "wiBoundary",
            visible: true,
            opacity: 1
        }));

        // add new info window for employers
        var empTemplate = new InfoTemplate();
        empTemplate.setTitle("${EMPNAME}");
        empTemplate.setContent("${ADDRESS}</br>" +
            "${CITY}, ${STATE} ${ZIP}</br>" +
            "Type:  ${CLUSTER}"
        );

        var wiEmployerURL = appConfig.wiEmployerURL;
        var wiEmployers = map.addLayer(new FeatureLayer(wiEmployerURL, {
            id: "wiEmployers",
            visible: false,
            opacity: 1,
            mode: FeatureLayer.MODE_ONDEMAND,
            infoTemplate: empTemplate,
            outFields: ["*"]
        }));

        // Measurement Tool
        //=================================================================================>
        //dojo.keys.copyKey maps to CTRL on windows and Cmd on Mac., but has wrong code for Chrome on Mac
        var snapManager = map.enableSnapping({
            snapKey: has("mac") ? keys.META : keys.CTRL
        });
        var layerInfos = [{
            layer: tParcels
        }];
        snapManager.setLayerInfos(layerInfos);

        var measurement = new Measurement({
            map: map,
            lineSymbol: sfs
            // pointSymbol: ,
        }, dom.byId("measurementDiv"));
        measurement.startup();
        on(measurement.area, "click", killPopUp);
        on(measurement.distance, "click", killPopUp);
        on(measurement.location, "click", killPopUp);

        function killPopUp() {
            var toolName = this.dojoAttachPoint;
            var activeTool = measurement[toolName].checked;
            if (activeTool === true) {
                // kill the popup
                identifyHandler.remove();
            }
            if (activeTool !== true) {
                // turn popups back on
                identifyHandler = map.on("click", executeIdentifyTask);
            }
        }

        // toggleMTool.on("click", killMeasureTool);
        // function killMeasureTool () {
        //     console.log("Done");
        // }


        //TOC Layers
        // tocLayers.push({layer: aerial, title: "Aerial Imagery"});
        tocLayers.push({
            layer: tParcels,
            id: "tParcels",
            title: "Wickenburg Parcels"
        });
        tocLayers.push({
            layer: wiBoundary,
            id: "wiBoundary",
            title: "Wickenburg Boundary"
        });
        tocLayers.push({
            layer: wiFlood,
            id: "wiFlood",
            title: "Wickenburg Flood Zone"
        });
        tocLayers.push({
            layer: wiZoning,
            id: "wiZoning",
            title: "Wickenburg Zoning"
        });
        tocLayers.push({
            layer: wiEmployers,
            id: "wiEmployers",
            title: "Wickenburg Employers, 5+ employees"
        });

        // Legend Layers
        // legendLayers.push({layer: wiEmployers, title: "Wickenburg Employers"});
        legendLayers.push({
            layer: tParcels,
            id: "tParcels",
            title: "Wickenburg Parcels"
        });
        legendLayers.push({
            layer: coBoundary,
            id: "coBoundary",
            title: "Maricopa County Boundary"
        });
        legendLayers.push({
            layer: wiBoundary,
            id: "wiBoundary",
            title: "Wickenburg Town Boundary"
        });
        legendLayers.push({
            layer: wiFlood,
            id: "wiFlood",
            title: "Wickenburg Flood Zone"
        });
        legendLayers.push({
            layer: wiZoning,
            id: "wiZoning",
            title: "Wickenburg Zoning"
        });

        // create legend dijit
        var legend = new Legend({
            map: map,
            layerInfos: legendLayers
        }, "legendDiv");
        legend.startup();

        //add check boxes
        arrayUtils.forEach(tocLayers, function(layer) {
            var layerName = layer.title;
            var checkBox = new CheckBox({
                name: "checkBox" + layer.layer.id,
                value: layer.layer.id,
                checked: layer.layer.visible,
                onChange: function() {
                    var clayer = map.getLayer(this.value);
                    clayer.setVisibility(!clayer.visible);
                    this.checked = clayer.visible;
                    console.log(clayer.id + " = " + clayer.visible);
                }
            }); //end CheckBox
            console.log(layer.layer.id);
            console.log(layer.layer.visible);

            //add the check box and label to the toc
            dc.place(checkBox.domNode, dom.byId("toggleDiv"));
            var checkLabel = dc.create("label", {
                "for": checkBox.name,
                innerHTML: "&nbsp;&nbsp;" + layerName
            }, checkBox.domNode, "after");
            dc.place("<br>", checkLabel, "after");

        });

        // wiFlood Transparency Slider
        var slider1 = new HorizontalSlider({
            name: "slider1",
            value: wiFlood.opacity,
            minimum: 0,
            maximum: 1,
            intermediateChanges: true,
            discreteValues: 11,
            style: "width:250px;",
            onChange: function(value1) {
                wiFlood.setOpacity(value1);
            }
        }, "slider1");

        // wiZoning Transparency Slider
        var slider2 = new HorizontalSlider({
            name: "slider2",
            value: wiZoning.opacity,
            minimum: 0,
            maximum: 1,
            intermediateChanges: true,
            discreteValues: 11,
            style: "width:250px;",
            onChange: function(value2) {
                wiZoning.setOpacity(value2);
            }
        }, "slider2");

        //=================================================================================>
        // Start Geocode Section

        function geosearch() {
            var def = geocoder.find();
            def.then(function(res) {
                geocodeResults(res);
            });
        }

        function geocodeSelect(item) {
            var g = (item.graphic ? item.graphic : item.result.feature);
            g.setSymbol(sym);
            addPlaceGraphic(item.result, g.symbol);
        }

        function geocodeResults(places) {
            places = places.results;
            if (places.length > 0) {
                clearFindGraphics();
                var symbol = sym;
                // Create and add graphics with pop-ups
                for (var i = 0; i < places.length; i++) {
                    addPlaceGraphic(places[i], symbol);
                }
                zoomToPlaces(places);
            } else {
                alert("Sorry, address or place not found.");
            }
        }

        function addPlaceGraphic(item, symbol) {
            var place = {};
            var attributes, infoTemplate, pt, graphic;
            pt = item.feature.geometry;
            place.address = item.name;
            place.score = item.feature.attributes.Score;
            // Graphic components
            attributes = {
                address: place.address,
                score: place.score,
                lat: pt.getLatitude().toFixed(2),
                lon: pt.getLongitude().toFixed(2)
            };
            infoTemplate = new InfoTemplate("${address}", "Latitude: ${lat}<br/>Longitude: ${lon}<br/>Score: ${score}");
            graphic = new Graphic(pt, symbol, attributes, infoTemplate);
            // Add to map
            map.graphics.add(graphic);
        }

        function zoomToPlaces(places) {
            var multiPoint = new Multipoint(map.spatialReference);
            for (var i = 0; i < places.length; i++) {
                //multiPoint.addPoint(places[i].location);
                multiPoint.addPoint(places[i].feature.geometry);
            }
            map.setExtent(multiPoint.getExtent().expand(2.0));
        }

        function clearFindGraphics() {
            map.infoWindow.hide();
            map.graphics.clear();
        }

        function createPictureSymbol(url, xOffset, yOffset) {
            return new PictureMarkerSymbol({
                "angle": 0,
                "xoffset": xOffset,
                "yoffset": yOffset,
                "type": "esriPMS",
                "url": url,
                "contentType": "image/png",
                "width": 12,
                "height": 24
            });
        }

        var sym = createPictureSymbol("img/blue-pin.png", 0, 12, 35);

        // End Geocode Section
        //=================================================================================>

        //create a link in the popup window.
        var link = dc.create("a", {
            "class": "action",
            "id": "infoLink",
            "innerHTML": "Assessor Info", //text that appears in the popup for the link
            "href": "javascript: void(0);"
        }, query(".actionList", map.infoWindow.domNode)[0]);

        on(link, "click", function() {
            var feature = map.infoWindow.getSelectedFeature();
            // console.log(feature.attributes);
            var url = window.location;
            var link = "";
            if (feature.attributes.COUNTY_FIPS === "13") {
                link = appConfig.MaricopaAssessor + feature.attributes.PARCEL;
                window.open(link);
            }
            if (feature.attributes.COUNTY_FIPS === "25") {
                link = appConfig.YavapaiAssessor + feature.attributes.PARCEL;
                window.open(link);
            } else {
                // *** do nothing ***
            }

        });

        // Identify Features
        //=================================================================================>

        function mapReady() {

            //create identify tasks and setup parameters
            identifyTask1 = new IdentifyTask(wiZoningURL);
            identifyTask2 = new IdentifyTask(tParcelsURL);
            identifyTask3 = new IdentifyTask(wiFloodURL);

            identifyParams = new IdentifyParameters();
            identifyParams.tolerance = 3;
            identifyParams.returnGeometry = true;
            // identifyParams.layerIds = [0];
            identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
            identifyParams.width = map.width;
            identifyParams.height = map.height;

        } // end mapReady

        function executeIdentifyTask(event) {
            var layers = map.layerIds;
            console.log(layers);
            // var visible = [];
            var vis = tocLayers;
            console.log(vis);
            // console.log(vis.id);
            // if (vis.layers.visible = true) {
            //     visible.push(vis.layer.id)
            // }
            // console.log(visible);





            identifyParams.geometry = event.mapPoint;
            identifyParams.mapExtent = map.extent;

            var deferred1 = identifyTask1
                .execute(identifyParams)
                .addCallback(function(response) {
                    // response is an array of identify result objects
                    // Let's return an array of features.
                    return arrayUtils.map(response, function(result) {
                        var feature = result.feature;
                        feature.attributes.layerName = result.layerName;

                        if (feature.attributes.OBJECTID !== 0) {
                            var template = new InfoTemplate();

                            //wickenburg zoning
                            template.setTitle("Wickenburg Zoning");
                            template.setContent("Zoning Code: ${CODE}" + "<br>Zoning Description: ${Description}");
                            feature.setInfoTemplate(template);

                        } // end if
                        return feature;
                    });
                }); //end addCallback

            var deferred2 = identifyTask2
                .execute(identifyParams)
                .addCallback(function(response) {
                    // response is an array of identify result objects
                    // Let's return an array of features.
                    return arrayUtils.map(response, function(result) {
                        var feature = result.feature;
                        feature.attributes.layerName = result.layerName;

                        if (feature.attributes.OBJECTID !== 0) {
                            var template = new InfoTemplate();

                            template.setTitle("County Parcels");
                            template.setContent("County: ${COUNTY}<br>" + "Parcel: ${PARCEL_LABEL}<br>" + "Address: ${PHYSICAL_ADDRESS}");
                            feature.setInfoTemplate(template);

                        } // end if
                        return feature;
                    });
                }); //end addCallback

            var deferred3 = identifyTask3
                .execute(identifyParams)
                .addCallback(function(response) {
                    // response is an array of identify result objects
                    // Let's return an array of features.
                    return arrayUtils.map(response, function(result) {
                        var feature = result.feature;
                        feature.attributes.layerName = result.layerName;

                        if (feature.attributes.OBJECTID !== 0) {
                            var template = new InfoTemplate();

                            // Wickenburg zoning
                            template.setTitle("Flood Zone");
                            template.setContent("Flood Zone: ${ZONE}");
                            feature.setInfoTemplate(template);
                        } // end if
                        return feature;
                    });
                }); //end addCallback

            // InfoWindow expects an array of features from each deferred
            // object that you pass. If the response from the task execution
            // above is not an array of features, then you need to add a callback
            // like the one above to post-process the response and return an
            // array of features.
            map.infoWindow.setFeatures([deferred1, deferred2, deferred3]);
            map.infoWindow.show(event.mapPoint);

        } // end executeIdentifyTask





    }); // end Main Function

// contents open
//=================================================================================>
function toggleContent() {
    if ($("#legend").is(":hidden")) {
        $("#legend").slideDown();
        $("#legend").draggable({
            containment: "#mapDiv"
        });
        $("#contentsOpen");
    } else {
        $("#legend").slideUp();
        $("#contentsOpen");
    }
}

$(document).ready(function() {
    $("#contentsOpen").fadeTo("slow");
    $("#legend").fadeTo("slow");
    contentsOpen = $("#contentsOpen").height();
    $("#legend").css("top", contentsOpen);
    $("#contentsOpen").click(function() {
        toggleContent();
    });
});

//sets original position of dropdown
// $(document).ready(function() {
//     $("#legend").hide();
// });

// Measurement Tool open
//=================================================================================>
function toggleMTool() {
    if ($("#mTool").is(":hidden")) {
        $("#mTool").slideDown();
        $("#mTool").draggable({
            containment: "#mapDiv"
        });
        $("#measureOpen");
    } else {
        $("#mTool").slideUp();
        $("#measureOpen");
    }
}

$(document).ready(function() {
    $("#measureOpen").fadeTo("slow");
    $("#mTool").fadeTo("slow");
    measureOpen = $("#measureOpen").height();
    $("#mTool").css("top", measureOpen);
    $("#measureOpen").click(function() {
        toggleMTool();
    });
});

//sets original position of dropdown for measurement tool
$(document).ready(function() {
    $("#mTool").hide();
});

// Print Tool open
//=================================================================================>
function togglePrint() {
    if ($("#printTool").is(":hidden")) {
        $("#printTool").slideDown();
        $("#printTool").draggable({
            containment: "#mapDiv"
        });
        $("#printOpen");
    } else {
        $("#printTool").slideUp();
        $("#printOpen");
    }
}

$(document).ready(function() {
    $("#printOpen").fadeTo("slow");
    $("#printTool").fadeTo("slow");
    printOpen = $("#printOpen").height();
    $("#printTool").css("top", printOpen);
    $("#printOpen").click(function() {
        togglePrint();
    });
});

//sets original position of dropdown for measurement tool
$(document).ready(function() {
    $("#printTool").hide();
});
// Bindings
//=================================================================================>
//
$(document).ready(function() {
    //*** Content binding
    $("#legend").load("views/contents.html");
    //*** Content Help modal binding
    $("#helpContent").load("views/helpContent.html");
    //*** About modal binding
    $("#aboutInfo").load("views/about.html");
    //*** Legal Disclaimer modal binding
    $("#legalDisclaimer").load("views/legalDisclaimer.html");
    //*** Definitions modal binding
    $("#definitions").load("views/definitions.html");
    //*** Measurement Tool binding
    $("#mTool").load("views/measureTool.html");
    //*** Measurement Tool Help modal binding
    $("#helpTool").load("views/helpTool.html");
    // *** Print Tool modal binding
    $("#printTool").load("views/printTool.html");
    //*** Print Tool Help modal binding
    $("#helpPrint").load("views/helpPrint.html");
});