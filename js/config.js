var appConfig = new function() {

    this.Version = "v3.4.0 | 07/22/2014";

    this.jasonemail = "https://www.azmag.gov/EmailPages/JasonHoward.asp";

    //  layers
    this.wiBoundaryURL = "http://geo.azmag.gov/gismag/rest/services/maps/WI_Boundary/MapServer";
    this.coBoundaryURL = "http://geo.azmag.gov/GISMAG/rest/services/maps/MaricopaCountyBoundary/MapServer";
    this.wiFloodURL = "http://geo.azmag.gov/gismag/rest/services/maps/WI_Floodways/MapServer";
    this.wiZoningURL = "http://geo.azmag.gov/gismag/rest/services/maps/WI_Zoning/MapServer";

    this.wiEmployerURL = "http://geo.azmag.gov/gismag/rest/services/maps/WI_Employers/MapServer/0";


    this.mParcelsURL = "http://gis.mcassessor.maricopa.gov/ArcGIS/rest/services/Parcels/MapServer";
    this.yParcelsURL = "http://gis.yavapai.us/arcgis/rest/services/Property/MapServer/6";

    // total parcels a subset of Maricopa and Yavapi parcels
    this.tParcelsURL = "http://geo.azmag.gov/gismag/rest/services/maps/WI_Parcels/MapServer";
    this.aerialURL = "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
    this.streetsURL = "http://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer";

    this.MaricopaAssessor = "http://mcassessor.maricopa.gov/?s=";
    this.YavapaiAssessor = "http://gis.yavapai.us/v4/print_parcel.aspx?qs=";

    // this.GeometryService = "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer"; // Esri test service
    this.GeometryService = "http://geo.azmag.gov/gismag/rest/services/Utilities/Geometry/GeometryServer"; // MAGs service

    this.printUrl = "http://geo.azmag.gov/gismag/rest/services/gp/Wickenburg_Print/GPServer/Export%20Web%20Map"; // MAG Wickenburg Print service
    // "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task" // Esri test service


    this.initExtent = {
        "xmin": -12561509,
        "ymin": 4020496,
        "xmax": -12543164,
        "ymax": 4030003,
        "spatialReference": {
            "wkid": 102100
        }
    };

    this.center = [-112.343, 33.285]; // for Maricopa County
    //Lat, Long (33.969, -112.731) for wickenburg
    //Lat, Long (33.471, -112.115) for phoenix
}; //End Config