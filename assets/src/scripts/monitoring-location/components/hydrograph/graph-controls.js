
import {link} from 'ui/lib/d3-redux';

import {getInputsForRetrieval} from 'ml/selectors/hydrograph-state-selector';

import {getSelectedParameterCode} from 'ml/selectors/hydrograph-state-selector';
import {getTimeRange} from 'ml/selectors/hydrograph-data-selector';

import {retrieveMedianStatistics, retrievePriorYearIVData} from 'ml/store/hydrograph-data';
import {setCompareDataVisibility, setMedianDataVisibility} from 'ml/store/hydrograph-state';

import {isVisible} from './selectors/time-series-data';

/*
 * Create the show audible toggle, last year toggle, and median toggle for the time series graph.
 * @param {Object} elem - D3 selection
 */
export const drawGraphControls = function(elem, store, siteno) {

    const graphControlDiv = elem.append('ul')
        .classed('usa-fieldset', true)
        .classed('usa-list--unstyled', true)
        .classed('graph-controls-container', true);

    const compareControlDiv = graphControlDiv.append('li')
        .classed('usa-checkbox', true);

    compareControlDiv.append('input')
        .classed('usa-checkbox__input', true)
        .attr('type', 'checkbox')
        .attr('id', 'last-year-checkbox')
        .attr('aria-labelledby', 'last-year-label')
        .attr('ga-on', 'click')
        .attr('ga-event-category', 'TimeSeriesGraph')
        .attr('ga-event-action', 'toggleCompare')
        .on('click', function() {
            const state = store.getState();
            const currentTimeRange = getTimeRange('current')(state);
            store.dispatch(setCompareDataVisibility(this.checked));
            store.dispatch(retrievePriorYearIVData(siteno, {
                parameterCode: getSelectedParameterCode(state),
                startTime: currentTimeRange.start,
                endTime: currentTimeRange.end
            }));
        })
        // Sets the state of the toggle
        .call(link(store,function(elem, checked) {
            elem.property('checked', checked);
        }, isVisible('compare')));
    compareControlDiv.append('label')
        .classed('usa-checkbox__label', true)
        .attr('id', 'last-year-label')
        .attr('for', 'last-year-checkbox')
        .text('Compare to last year');

    const medianControlDiv = graphControlDiv.append('li')
        .classed('usa-checkbox', true);

    medianControlDiv.append('input')
        .classed('usa-checkbox__input', true)
        .attr('type', 'checkbox')
        .attr('id', 'median-checkbox')
        .attr('aria-labelledby', 'median-label')
        .attr('ga-on', 'click')
        .attr('ga-event-category', 'TimeSeriesGraph')
        .attr('ga-event-action', 'toggleMedian')
        .on('click', function() {
            store.dispatch(setMedianDataVisibility(this.checked));
            store.dispatch(retrieveMedianStatistics(siteno, getSelectedParameterCode(store.getState())));
        })
        // Sets the state of the toggle
        .call(link(store,function(elem, checked) {
            elem.property('checked', checked);
        }, isVisible('median')));

    medianControlDiv.append('label')
        .classed('usa-checkbox__label', true)
        .attr('id', 'median-label')
        .attr('for', 'median-checkbox')
        .text('Display median');
};
