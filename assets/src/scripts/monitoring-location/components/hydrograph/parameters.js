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

const OPEN_ICON_CLASS = 'fas fa-chevron-down expansion-toggle';
const CLOSE_ICON_CLASS = 'fas fa-chevron-up expansion-toggle';



/*
* Helper function that adds the on click open and close functionality. Stopping event propagation is needed to prevent
* clicks on the containing element from changing this elements behavior.
* @param {Object} element - the element to add the on click action
* @param {Object} parameter - Contains details about the current parameter code
* @param {String} type - Either 'desktop' or 'mobile'--indicates at what screen size the controls will show.
*/
const drawRowExpansionControl = function(element, parameter, type) {
    // Don't show the open/close controls, if there is nothing in the expansion row, such as WaterAlert links.
    if (parameter.waterAlert.hasWaterAlert) {
        element
            .append('i')
            .attr('id', `expansion-toggle-${type}-${parameter.parameterCode}`)
            .attr('class', 'fas fa-chevron-down expansion-toggle')
            .attr('aria-expanded', 'false')
            .on('click', function(event) {
                // Stop clicks on the main row from triggering the open/close toggle.
                event.stopPropagation();
                // Hide the expansion container on all rows except the clicked parameter row.
                selectAll('.expansion-container-row')
                    .filter(function() {
                        return this.id !== `expansion-container-row-${parameter.parameterCode}`;
                    })
                    .attr('hidden', 'true');
                // Allow the user to hide the expansion row even on the clicked parameter row.
                select(`#expansion-container-row-${parameter.parameterCode}`)
                    .attr('hidden', select(`#expansion-container-row-${parameter.parameterCode}`).attr('hidden') !== null ? null : 'true');
                console.log('this ', this.getAttribute('aria-expanded'))

                // If the clicked open/close icon is not the same row as the already clicked, set all other icons to 'closed'.
                console.log('this ', this.getAttribute('aria-expanded'))
                const clickedElement = select(this)
                console.log('clickedElement ', clickedElement)
                console.log('clickedElement attr ', clickedElement.attr('aria-expanded'))
                clickedElement.attr('aria-expanded') === 'true' ? console.log('this b true') : console.log('this be  false');
                clickedElement.attr('aria-expanded') === 'true' ? clickedElement.attr('aria-expanded', 'false') : clickedElement.attr('aria-expanded', 'true');
                clickedElement.attr('aria-expanded') === 'true' ? clickedElement.attr('class', CLOSE_ICON_CLASS ) : clickedElement.attr('class', OPEN_ICON_CLASS );

                // this.getAttribute('aria-expanded') ? this.setAttribute(): '';
                // selectAll('.expansion-toggle')
                //     .filter(function() {
                //
                //         return this.ariaExpanded === 'true';
                //     })
                //     .attr('class', 'fas fa-chevron-down expansion-toggle')
                //     .attr('aria-expanded', 'false');
                // const clickedElement = select(this);
                // clickedElement.attr('aria-expanded', `${clickedElement.attr('aria-expanded') === 'true' ? 'false' :'true'}`);

                // const isToggleSetToExpanded = select(`#expansion-toggle-desktop-${parameter.parameterCode}`).attr('aria-expanded');
                // if (isToggleSetToExpanded) {
                //     console.log('expanded ', isToggleSetToExpanded)
                //     clickedElement
                //         .attr('class', 'fas fa-chevron-down expansion-toggle')
                //         .attr('aria-expanded', '2boo');
                // } else {
                //     console.log('not expanded ', isToggleSetToExpanded)
                //     clickedElement.attr('class', 'fas fa-chevron-up expansion-toggle')
                //         .attr('aria-expanded', 'boo');
                // }

                    // if (toggleClassList.includes('fa-chevron-down')) {
                    //     select(`#expansion-toggle-desktop-${parameter.parameterCode}`).attr('class', 'fas fa-chevron-up expansion-toggle');
                    // } else {
                    //     select(`#expansion-toggle-desktop-${parameter.parameterCode}`).attr('class', 'fas fa-chevron-down expansion-toggle');
                    // }


                // select(`#expansion-toggle-mobile-${parameter.parameterCode}`).attr('class', 'fas fa-chevron-up expansion-toggle');
                // If the open/close icon clicked is already the active row, toggle the icon
                // const allExpansionToggles = selectAll('.expansion-toggle');
                //
                // allExpansionToggles.filter(function() {
                //     return this.id === `#expansion-toggle-desktop-${parameter.parameterCode}` && this.classList.contains('fa-chevron-up');
                // })
                // .attr('class', 'fas fa-chevron-down expansion-toggle');
                //

            });
    }
};

/*
* Helper function that draws the main containing rows. Note the 'parameter selection' is a nested USWD grid. This section of code
* creates the main grid rows for each parameter and adds on click functions. Later, another grid will be nested in these rows.
* @param {Object} Store - The application Redux state
* @param {String} siteno - A unique identifier for the monitoring location
* @param {Object} element - The target element to append the row
* @param {Object} parameter - Contains details about the current parameter code
*/
const drawContainingRow = function(store, siteno, element, parameter) {
    return element.append('div')
        .attr('id', `container-row-${parameter.parameterCode}`)
        .attr('class', 'grid-container grid-row-container-row')
        .attr('ga-on', 'click')
        .attr('ga-event-category', 'selectTimeSeries')
        .attr('ga-event-action', `time-series-parmcd-${parameter.parameterCode}`)
        .attr('role', 'option')
        .call(link(store, (elem, selectedParameterCode) => {
            elem.classed('selected', parameter.parameterCode === selectedParameterCode)
                .attr('aria-selected', parameter.parameterCode === selectedParameterCode);
        }, getSelectedParameterCode))
        .on('click', function() {
            selectAll('.fa-chevron-up')
                .attr('class', 'fas fa-chevron-down expansion-toggle')
                .attr('aria-expanded', 'false');
            select(`#expansion-toggle-desktop-${parameter.parameterCode}`)
                .attr('class', 'fas fa-chevron-up expansion-toggle')
                .attr('aria-expanded', 'true');
            select(`#expansion-toggle-mobile-${parameter.parameterCode}`)
                .attr('class', 'fas fa-chevron-up expansion-toggle')
                .attr('aria-expanded', 'true');

            selectAll('.expansion-container-row')
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
* @param {Object} Element - The target element to append the row
* @param {Object} parameter - Contains details about the current parameter code
* @return {Object} The HTML for the grid row
* */
const drawTopPeriodOfRecordRow = function(element, parameter) {
    const gridRowInnerTopPeriodOfRecord = element.append('div')
        .attr('class', 'grid-row grid-row-inner grid-row-period-of-record');
    gridRowInnerTopPeriodOfRecord.append('div')
        .attr('class', 'grid-col grid-offset-1')
        .text(`${parameter.periodOfRecord.begin_date} to ${parameter.periodOfRecord.end_date}`);
    const TopPeriodOfRecordRowExpansionControlDiv = gridRowInnerTopPeriodOfRecord.append('div')
        .attr('class', 'grid-col open-close-top-period-of-record');

    drawRowExpansionControl(TopPeriodOfRecordRowExpansionControlDiv, parameter, 'mobile');
};

/*
* Helper function that draws the row containing the radio button and parameter description.
* @param {Object} Store - The application Redux state
* @param {Object} Element - The target element to append the row
* @param {Object} parameter - Contains details about the current parameter code
*/
const drawRadioButtonRow = function(store, element, parameter) {
    const gridRowInnerWithRadioButton = element.append('div')
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
        .append('div')
        .text(`${parameter.description}`);
    gridRowInnerWithRadioButton.append('div')
        .attr('class', 'grid-col grid-col-auto period-of-record__param-select')
        .text(`${parameter.periodOfRecord.begin_date} to ${parameter.periodOfRecord.end_date}`);
    const radioRowExpansionControlDiv = gridRowInnerWithRadioButton.append('div')
        .attr('class', 'grid-col open-close-radio_button_row');
    drawRowExpansionControl(radioRowExpansionControlDiv, parameter, 'desktop');
};

/*
* Helper function that draws a row containing the controls for the WaterAlert subscription.
* @param {String} siteno - A unique identifier for the monitoring location
* @param {Object} Element - The target element to append the row
* @param {Object} parameter - Contains details about the current parameter code
*/
const drawWaterAlertRow = function(siteno, element, parameter) {
    const gridRowInnerWaterAlert = element.append('div')
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
* @param {Object} Store - The application Redux state
* @param {Object} Element - The target element to append the selection list
* @param {String} siteno - A unique identifier for the monitoring location
* */
export const drawSelectionList = function(container, store, siteno) {
    const parameters = getAvailableParameters(store.getState());

    if (!Object.keys(parameters).length) {
        return;
    }
    // Add the primary parameter selection container.
    container.append('div')
        .attr('id', 'parameter-selection-container')
        .append('h2')
        .text('Select Data to Graph');
    const selectionList = container.append('div')
        .attr('class', 'grid-container');

    parameters.forEach(parameter => {
        // Add the main grid rows
        const containerRow = drawContainingRow(store, siteno, selectionList, parameter);
        // Add the nested grid rows
        drawTopPeriodOfRecordRow(containerRow, parameter);
        drawRadioButtonRow(store, containerRow, parameter);
        // Add the expansion container in nested grid
        const expansionContainerRow = containerRow.append('div')
            .attr('id', `expansion-container-row-${parameter.parameterCode}`)
            .attr('class', 'expansion-container-row')
            .attr('hidden', 'true');
        // Add the rows nested in the expansion container
        if (parameter.waterAlert.hasWaterAlert) {
            drawWaterAlertRow(siteno, expansionContainerRow, parameter);
        }
    });

    // Activate the USWDS toolTips for WaterAlert subscriptions
    tooltip.on(container.node());
};