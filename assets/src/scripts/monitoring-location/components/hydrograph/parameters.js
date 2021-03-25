// Required to initialize USWDS components after page load (WaterAlert ToolTips)
import {tooltip} from 'uswds-components';

import {select, selectAll} from 'd3-selection';

import config from 'ui/config';
import {link} from 'ui/lib/d3-redux';

import {getInputsForRetrieval, getSelectedParameterCode} from 'ml/selectors/hydrograph-state-selector';

import {setSelectedParameterCode} from 'ml/store/hydrograph-state';
import {retrieveHydrographData} from 'ml/store/hydrograph-data';

import {getAvailableParameters} from './selectors/parameter-data';

import {showDataIndicators} from './data-indicator';

const ROW_TOGGLE_CLOSED_CLASS = 'fas fa-chevron-down expansion-toggle';
const ROW_TOGGLE_OPENED_CLASS = 'fas fa-chevron-up expansion-toggle';
const ROW_TOGGLE_ICON_TYPES = ['desktop', 'mobile'];



/*
* Helper function that adds the on click open and close functionality. Stopping event propagation is needed to prevent
* clicks on the containing element from changing this elements behavior.
* @param {Object} container - the element to add the on click action
* @param {D3 selection} parameter - Contains details about the current parameter code
* @param {String} type - Either 'desktop' or 'mobile'--indicates at what screen size the controls will show.
*/
const drawRowExpansionControl = function(container, parameter, type) {
    // Don't show the open/close controls, if there is nothing in the expansion row, such as WaterAlert links.
    if (parameter.waterAlert.hasWaterAlert) {
        container
            .append('i')
            .attr('id', `expansion-toggle-${type}-${parameter.parameterCode}`)
            .attr('class', ROW_TOGGLE_CLOSED_CLASS)
            .attr('aria-expanded', 'false')
            .on('click', function(event) {
                // Stop clicks on the toggle from triggering a change in selected parameter.
                event.stopPropagation();
                // Hide the expansion container on all rows on all rows except the clicked parameter row.
                select('#select-time-series').selectAll('.expansion-container-row')
                    .filter(function() {
                        return this.id !== `expansion-container-row-${parameter.parameterCode}`;
                    })
                    .attr('hidden', 'true');
                // Allow the user to hide the expansion row even on the clicked parameter row.
                select(`#expansion-container-row-${parameter.parameterCode}`)
                    .attr('hidden', select(`#expansion-container-row-${parameter.parameterCode}`).attr('hidden') !== null ? null : 'true');

                // If the icon is open, close it and vice versa
                // Note - there are two open/close icons for each parameter, but only one will show at a time at
                // any given screen size. Both icons need to be synced.
                ROW_TOGGLE_ICON_TYPES.forEach(typeOfIcon => {
                    const rowToggle = select(`#expansion-toggle-${typeOfIcon}-${parameter.parameterCode}`);
                    rowToggle.attr('aria-expanded') === 'true' ?
                        rowToggle.attr('class',  ROW_TOGGLE_CLOSED_CLASS) :
                        rowToggle.attr('class', ROW_TOGGLE_OPENED_CLASS);
                    rowToggle.attr('aria-expanded') === 'true' ?
                        rowToggle.attr('aria-expanded', 'false') :
                        rowToggle.attr('aria-expanded', 'true');
                });
            });
    }
};

/*
* Helper function that draws the main containing rows. Note the 'parameter selection' is a nested USWD grid.
* The grid has one 'container row' for each parameter (this function creates the 'container rows' for each parameter).
* As a side note - each container row will eventually contain three internal rows.
* 1) The 'Top Period Of Record Row' (shows only on mobile)
* 2) The 'Radio Button Row' (radio button and description show on mobile and desktop, toggle and period of record don't show mobile)
* 3) The 'Expansion Container Row' only shows when row clicked or toggled on. May act as a container for additional rows.
* @param {Object} container - The target element on which to append the row
* @param {Object} store - The application Redux state
* @param {String} siteno - A unique identifier for the monitoring location
* @param {D3 selection} parameter - Contains details about the current parameter code
*/
const drawContainingRow = function(container, store, siteno, parameter) {
    return container.append('div')
        .attr('id', `container-row-${parameter.parameterCode}`)
        .attr('class', 'grid-container grid-row-container-row')
        .attr('ga-on', 'click')
        .attr('ga-event-category', 'selectTimeSeries')
        .attr('ga-event-action', `time-series-parmcd-${parameter.parameterCode}`)
        .call(link(store, (container, selectedParameterCode) => {
            container.classed('selected', parameter.parameterCode === selectedParameterCode)
                .attr('aria-selected', parameter.parameterCode === selectedParameterCode);
        }, getSelectedParameterCode))
        .on('click', function() {
            select('#select-time-series').selectAll('.fa-chevron-up')
                .attr('class', ROW_TOGGLE_CLOSED_CLASS)
                .attr('aria-expanded', 'false');
            select(`#expansion-toggle-desktop-${parameter.parameterCode}`)
                .attr('class', 'fas fa-chevron-up expansion-toggle')
                .attr('aria-expanded', 'true');
            select(`#expansion-toggle-mobile-${parameter.parameterCode}`)
                .attr('class', 'fas fa-chevron-up expansion-toggle')
                .attr('aria-expanded', 'true');

            select('#select-time-series').selectAll('.expansion-container-row')
                .attr('hidden', 'true');
            select(`#expansion-container-row-${parameter.parameterCode}`).attr('hidden', null);

            const thisClass = select(this)
                .attr('class');
            if (!thisClass || !thisClass.includes('selected')) {
                store.dispatch(setSelectedParameterCode(parameter.parameterCode));
                showDataIndicators(true, store);
                store.dispatch(retrieveHydrographData(siteno, getInputsForRetrieval(store.getState())))
                    .then(() => {
                        showDataIndicators(false, store);
                    });
            }
        });
};

/*
* Helper function that creates the top row of each parameter selection. This row is hidden except on narrow screens
* and contains the period of record that appears above the parameter description.
* @param {Object} container - The target element to append the row
* @param {D3 selection} parameter - Contains details about the current parameter code
*/
const drawTopPeriodOfRecordRow = function(container, parameter) {
    const gridRowInnerTopPeriodOfRecord = container.append('div')
        .attr('class', 'grid-row grid-row-inner grid-row-period-of-record');
    gridRowInnerTopPeriodOfRecord.append('div')
        .attr('class', 'grid-col-10 grid-offset-1')
        .text(`${parameter.periodOfRecord.begin_date} to ${parameter.periodOfRecord.end_date}`);
    const TopPeriodOfRecordRowExpansionControlDiv = gridRowInnerTopPeriodOfRecord.append('div')
        .attr('class', 'grid-col-1 open-close-top-period-of-record');

    drawRowExpansionControl(TopPeriodOfRecordRowExpansionControlDiv, parameter, 'mobile');
};

/*
* Helper function that draws the row containing the radio button and parameter description.
* @param {Object} elem - The target element to append the row
* @param {D3 selection} parameter - Contains details about the current parameter code
* @param {Object} store - The application Redux state
*/
const drawRadioButtonRow = function(container, parameter, store) {
    const gridRowInnerWithRadioButton = container.append('div')
        .attr('class', 'grid-row grid-row-inner');
    const radioButtonDiv = gridRowInnerWithRadioButton.append('div')
        .attr('class', 'grid-col-1 radio-button__param-select')
        .append('div')
        .attr('class', 'usa-radio');
    radioButtonDiv.append('input')
        .attr('class', 'usa-radio__input')
        .attr('id', `radio-${parameter.parameterCode}`)
        .attr('type', 'radio')
        .attr('name', 'parameter-selection')
        .attr('value', `${parameter.parameterCode}`)
        .call(link(store, (inputElem, selectedParameterCode) => {
            inputElem.property('checked', parameter.parameterCode === selectedParameterCode ? true : null);
        }, getSelectedParameterCode));
    radioButtonDiv.append('label')
        .attr('class', 'usa-radio__label')
        .attr('for', `radio-${parameter.parameterCode}`);
    gridRowInnerWithRadioButton.append('div')
        .attr('class', 'grid-col-7 description__param-select')
        .text(`${parameter.description}`);
    const periodOfRecordToggleContainer = gridRowInnerWithRadioButton.append('div')
        .attr('id', 'period-of-record-and-toggle-container')
        .attr('class', 'grid-col period-of-record__param-select');
    periodOfRecordToggleContainer.append('div')
        .attr('id', 'period-of-record-text')
        .attr('class', 'period-of-record__param-select')
        .text(`${parameter.periodOfRecord.begin_date} to ${parameter.periodOfRecord.end_date}`);
    const radioRowExpansionControlDiv = periodOfRecordToggleContainer.append('div')
        .attr('id', 'expansion-toggle')
        .attr('class', 'toggle-radio_button_row');
    drawRowExpansionControl(radioRowExpansionControlDiv, parameter, 'desktop');
};

/*
* Helper function that draws a row containing the controls for the WaterAlert subscription.
* @param {Object} container- The target element to append the row
* @param {String} siteno - A unique identifier for the monitoring location
* @param {D3 selection} parameter - Contains details about the current parameter code
*/
const drawWaterAlertRow = function(container, siteno, parameter) {
    const gridRowInnerWaterAlert = container.append('div')
        .attr('class', 'grid-row grid-row-inner');

        gridRowInnerWaterAlert.append('div')
            .attr('id', `wateralert-row-${parameter.parameterCode}`)
            .attr('class', 'grid-col grid-offset-1 wateralert-row')
            .append('a')
            .attr('href', `${config.WATERALERT_SUBSCRIPTION}/?site_no=${siteno}&parm=${parameter.parameterCode}`)
            .attr('target', '_blank')
            .attr('class', 'water-alert-cell usa-tooltip')
            .attr('data-position', 'left')
            .attr('data-classes', 'width-full tablet:width-auto')
            .attr('title', parameter.waterAlert.tooltipText)
            .text(parameter.waterAlert.displayText);
};

/*
* A main function that creates the parameter selection list
* @param {Object} container - The target element to append the selection list
* @param {Object} store - The application Redux state
* @param {String} siteno - A unique identifier for the monitoring location
* */
export const drawSelectionList = function(container, store, siteno) {
    const parameters = getAvailableParameters(store.getState());

    if (!Object.keys(parameters).length) {
        return;
    }
    // Add the primary parameter selection container.
    container.append('p')
        .attr('id', 'parameter-selection-title')
        .attr('class', 'usa-prose')
        .text('Select Data to Graph');
    const selectionList = container.append('div')
        .attr('id', 'select-time-series')
        .attr('class', 'grid-container');

    parameters.forEach(parameter => {
        // Add the main grid rows
        const containerRow = drawContainingRow(selectionList, store, siteno, parameter);
        // Add the nested grid rows
        drawTopPeriodOfRecordRow(containerRow, parameter);
        drawRadioButtonRow(containerRow, parameter, store);
        // Add the expansion container in nested grid
        const expansionContainerRow = containerRow.append('div')
            .attr('id', `expansion-container-row-${parameter.parameterCode}`)
            .attr('class', 'expansion-container-row')
            .attr('hidden', 'true');
        // Add the rows nested in the expansion container
        if (parameter.waterAlert.hasWaterAlert) {
            drawWaterAlertRow(expansionContainerRow, siteno, parameter);
        }
    });

    // Activate the USWDS toolTips for WaterAlert subscriptions
    tooltip.on(container.node());
};