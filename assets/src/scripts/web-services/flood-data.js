import {get} from 'ui/ajax';
import config from 'ui/config';

export const FLOOD_SITES_ENDPOINT = `${config.FIM_GIS_ENDPOINT}sites/MapServer/`;
export const FLOOD_EXTENTS_ENDPOINT = `${config.FIM_GIS_ENDPOINT}floodExtents/MapServer/`;

const WATERWATCH_URL = config.WATERWATCH_ENDPOINT;
const FORMAT = 'json';

/*
 * Determine if a site has public FIM data
 * @param {String} siteno
 * @return {Promise} resolves to a boolean, true if public, false otherwise
 */
export const fetchFIMPublicStatus = function(siteno) {
    const FIM_SITE_QUERY = `${FLOOD_SITES_ENDPOINT}/0/query?where=SITE_NO%3D%27${siteno}%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=PUBLIC%2CSITE_NO&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=pjson`;
    return get(FIM_SITE_QUERY)
        .then((response) => {
            const respJson = JSON.parse(response);
            return respJson.features[0].attributes.Public > 0;
        })
        .catch(reason => {
            console.log(`Unable to get FIM Public Status data for ${siteno} with reason: ${reason}`);
            return false;
        });
};

/*
 * Retrieve flood features if any for siteno
 * @param {String} siteno
 * @return {Promise} resolves to an array of features for the site
 */
export const fetchFloodFeatures = function(siteno) {
    const FIM_QUERY = `${FLOOD_EXTENTS_ENDPOINT}/0/query?where=USGSID+%3D+%27${siteno}%27&outFields=USGSID%2C+STAGE&returnGeometry=false&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=falsereturnDistinctValues=false&f=json`;

    return get(FIM_QUERY)
        .then((response) => {
            const respJson = JSON.parse(response);
            return respJson.features ? respJson.features : [];
        })
        .catch(reason => {
            console.log(`Unable to get FIM stages for ${siteno} with reason: ${reason}`);
            return [];
        });
};
/*
 * Retrieve the extent of the flood information for siteno
 * @param {String} siteno
 * @return {Promise} resolves to the extent Object or the empty object if an errors
 */
export const fetchFloodExtent = function(siteno) {
    const FIM_QUERY = `${FLOOD_EXTENTS_ENDPOINT}/0/query?where=USGSID+%3D+%27${siteno}%27&returnExtentOnly=true&outSR=4326&f=json`;
    return get(FIM_QUERY)
        .then((response) => {
            return JSON.parse(response);
        })
        .catch(reason => {
            console.log(`Unable to get FIM extents for ${siteno} with reason: ${reason}`);
            return {};
        });
};

/*
 * Retrieve waterwatch flood levels any for siteno
 * @param {String} siteno
 * @return {Promise} resolves to an array of features for the site
 */
const fetchWaterwatchData = function(waterwatchQuery, siteno) {
    return get(waterwatchQuery)
        .then((responseText) => {
            const response = JSON.parse(responseText);
            if (!response.sites || !response.sites.length) {
                return null;
            }
            return response.sites[0];
        })
        .catch(reason => {
            console.log(`Unable to get Waterwatch data for ${siteno} with reason: ${reason}`);
            return null;
        });
};

// waterwatch webservice calls
export const fetchWaterwatchFloodLevels = function(siteno) {
    const waterwatchQuery = `${WATERWATCH_URL}/floodstage?format=${FORMAT}&site=${siteno}`;
    return fetchWaterwatchData(waterwatchQuery, siteno);
};
