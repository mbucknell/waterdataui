/**
 * Hydrograph charting module.
 */
const { select } = require('d3-selection');
const { extent } = require('d3-array');
const { line } = require('d3-shape');
const { createSelector, createStructuredSelector } = require('reselect');

const { addSVGAccessibility, addSROnlyTable } = require('../../accessibility');
const { dispatch, link, provide } = require('../../lib/redux');

const { appendAxes, axesSelector } = require('./axes');
const { ASPECT_RATIO_PERCENT, MARGIN, CIRCLE_RADIUS, layoutSelector } = require('./layout');
const { drawSimpleLegend, legendDisplaySelector, createLegendMarkers } = require('./legend');
const { plotSeriesSelectTable, availableTimeseriesSelector } = require('./parameters');
const { xScaleSelector, yScaleSelector } = require('./scales');
const { Actions, configureStore } = require('./store');
const { currentVariableSelector, pointsSelector, lineSegmentsSelector, pointsTableDataSelector, isVisibleSelector, titleSelector, descriptionSelector, MASK_DESC, HASH_ID } = require('./timeseries');
const { createTooltipFocus, createTooltipText } = require('./tooltip');


const drawMessage = function (elem, message) {
    // Set up parent element and SVG
    elem.innerHTML = '';
    const alertBox = elem
        .append('div')
            .attr('class', 'usa-alert usa-alert-warning')
            .append('div')
                .attr('class', 'usa-alert-body');
    alertBox
        .append('h3')
            .attr('class', 'usa-alert-heading')
            .html('Hydrograph Alert');
    alertBox
        .append('p')
            .html(message);
};


const plotDataLine = function (elem, {visible, lines, tsDataKey, xScale, yScale}) {
    if (!visible) {
        return;
    }

    const tsLine = line()
        .x(d => xScale(d.dateTime))
        .y(d => yScale(d.value));

    for (let line of lines) {
        if (line.classes.dataMask === null) {
            elem.append('path')
                .datum(line.points)
                .classed('line', true)
                .classed('approved', line.classes.approved)
                .classed('estimated', line.classes.estimated)
                .classed(`ts-${tsDataKey}`, true)
                .attr('d', tsLine);
        } else {
            const maskCode = line.classes.dataMask.toLowerCase();
            const maskDisplayName = MASK_DESC[maskCode].replace(' ', '-').toLowerCase();
            const [xDomainStart, xDomainEnd] = extent(line.points, d => d.dateTime);
            const [yRangeStart, yRangeEnd] = yScale.domain();
            let maskGroup = elem.append('g')
                .attr('class', `${tsDataKey}-mask-group`);
            const xSpan = xScale(xDomainEnd) - xScale(xDomainStart);
            const rectWidth = xSpan > 0 ? xSpan : 1;

            maskGroup.append('rect')
                .attr('x', xScale(xDomainStart))
                .attr('y', yScale(yRangeEnd))
                .attr('width', rectWidth)
                .attr('height', Math.abs(yScale(yRangeEnd)- yScale(yRangeStart)))
                .attr('class', `mask ${maskDisplayName}-mask`);

            const patternId = HASH_ID[tsDataKey] ? `url(#${HASH_ID[tsDataKey]})` : '';

            maskGroup.append('rect')
                .attr('x', xScale(xDomainStart))
                .attr('y', yScale(yRangeEnd))
                .attr('width', rectWidth)
                .attr('height', Math.abs(yScale(yRangeEnd) - yScale(yRangeStart)))
                .attr('fill', patternId);
        }
    }
};


const plotDataLines = function (elem, {visible, tsLines, tsDataKey, xScale, yScale}) {
    const elemId = `ts-${tsDataKey}-group`;

    elem.selectAll(`#${elemId}`).remove();
    const tsLineGroup = elem
        .append('g')
        .attr('id', elemId)
        .classed('tsDataKey', true);

    for (const lines of tsLines) {
        plotDataLine(tsLineGroup, {visible, lines, tsDataKey, xScale, yScale});
    }
};


const plotSvgDefs = function(elem) {

    let defs = elem.append('defs');

    defs.append('mask')
        .attr('id', 'display-mask')
        .attr('maskUnits', 'userSpaceOnUse')
        .append('rect')
            .attr('x', '0')
            .attr('y', '0')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', '#0000ff');

    defs.append('pattern')
        .attr('id', HASH_ID.current)
        .attr('width', '8')
        .attr('height', '8')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)')
        .append('rect')
            .attr('width', '4')
            .attr('height', '8')
            .attr('transform', 'translate(0, 0)')
            .attr('mask', 'url(#display-mask)');

    defs.append('pattern')
        .attr('id', HASH_ID.compare)
        .attr('width', '8')
        .attr('height', '8')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(135)')
        .append('rect')
            .attr('width', '4')
            .attr('height', '8')
            .attr('transform', 'translate(0, 0)')
            .attr('mask', 'url(#display-mask)');
};


const plotLegend = function(elem, {displayItems, layout}) {
    elem.select('.legend').remove();
    let plotMarkers = createLegendMarkers(displayItems);
    drawSimpleLegend(elem, plotMarkers, layout);
};


const plotMedianPoints = function (elem, {visible, xscale, yscale, points, showLabel, variable}) {
    elem.select('#median-points').remove();

    if (!visible) {
        return;
    }

    const container = elem
        .append('g')
            .attr('id', 'median-points');

    container.selectAll('medianPoint')
        .data(points)
        .enter()
        .append('circle')
            .attr('class', 'median-data-series')
            .attr('r', CIRCLE_RADIUS)
            .attr('cx', function(d) {
                return xscale(d.dateTime);
            })
            .attr('cy', function(d) {
                return yscale(d.value);
            })
            .on('click', dispatch(function() {
                return Actions.showMedianStatsLabel(!showLabel);
            }));

    if (showLabel) {
        container.selectAll('medianPointText')
            .data(points)
            .enter()
            .append('text')
                .text(function(d) {
                    return `${d.value} ${variable.unit.unitCode}`;
                })
                .attr('x', function(d) {
                    return xscale(d.dateTime) + 5;
                })
                .attr('y', function(d) {
                    return yscale(d.value);
                });
    }
};

const timeSeriesGraph = function (elem) {
    elem.append('div')
        .attr('class', 'hydrograph-container')
        .style('padding-bottom', ASPECT_RATIO_PERCENT)
        .append('svg')
            .call(link((elem, layout) => elem.attr('viewBox', `0 0 ${layout.width} ${layout.height}`), layoutSelector))
            .call(link(addSVGAccessibility, createStructuredSelector({
                titleSelector,
                descriptionSelector,
                isInteractive: () => true
            })))
            .call(createTooltipText)
            .call(plotSvgDefs)
            .call(link(plotLegend, createStructuredSelector({
                displayItems: legendDisplaySelector,
                layout: layoutSelector
            })))
            .append('g')
                .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
                .call(link(appendAxes, axesSelector))
                .call(link(plotDataLines, createStructuredSelector({
                    visible: isVisibleSelector('current'),
                    tsLines: lineSegmentsSelector('current'),
                    xScale: xScaleSelector('current'),
                    yScale: yScaleSelector,
                    tsDataKey: () => 'current'
                })))
                .call(link(plotDataLines, createStructuredSelector({
                    visible: isVisibleSelector('compare'),
                    tsLines: lineSegmentsSelector('compare'),
                    xScale: xScaleSelector('compare'),
                    yScale: yScaleSelector,
                    tsDataKey: () => 'compare'
                })))
                .call(link(createTooltipFocus, createStructuredSelector({
                    xScale: xScaleSelector('current'),
                    yScale: yScaleSelector,
                    compareXScale: xScaleSelector('compare'),
                    currentTsData: pointsSelector('current'),
                    compareTsData: pointsSelector('compare'),
                    isCompareVisible: isVisibleSelector('compare')
                })))
                .call(link(plotMedianPoints, createStructuredSelector({
                    visible: isVisibleSelector('median'),
                    xscale: xScaleSelector('current'),
                    yscale: yScaleSelector,
                    points: pointsSelector('median'),
                    variable: currentVariableSelector,
                    showLabel: (state) => state.showMedianStatsLabel
                })));

    elem.call(link(plotSeriesSelectTable, createStructuredSelector({
        availableTimeseries: availableTimeseriesSelector
    })));

    elem.append('div')
        .call(link(addSROnlyTable, createStructuredSelector({
            columnNames: createSelector(
                titleSelector,
                (title) => [title, 'Time', 'Qualifiers']
            ),
            data: pointsTableDataSelector('current'),
            describeById: () => 'current-time-series-sr-desc',
            describeByText: () => 'current time series data in tabular format'
    })));
    elem.append('div')
        .call(link(addSROnlyTable, createStructuredSelector({
            columnNames: createSelector(
                titleSelector,
                (title) => [title, 'Time', 'Qualifiers']
            ),
            data: pointsTableDataSelector('compare'),
            describeById: () => 'compare-time-series-sr-desc',
            describeByText: () => 'previous year time series data in tabular format'
    })));
    elem.append('div')
        .call(link(addSROnlyTable, createStructuredSelector({
            columnNames: createSelector(
                titleSelector,
                (title) => [`Median ${title}`, 'Time']
            ),
            data: pointsTableDataSelector('median'),
            describeById: () => 'median-statistics-sr-desc',
            describeByText: () => 'median statistical data in tabular format'
    })));
};


const attachToNode = function (node, {siteno} = {}) {
    if (!siteno) {
        select(node).call(drawMessage, 'No data is available.');
        return;
    }

    let store = configureStore({
        width: node.offsetWidth
    });

    select(node)
        .call(provide(store))
        .call(timeSeriesGraph)
        .select('.hydrograph-last-year-input')
            .on('change', dispatch(function () {
                return Actions.toggleTimeseries('compare', this.checked);
            }));

    window.onresize = function() {
        store.dispatch(Actions.resizeTimeseriesPlot(node.offsetWidth));
    };
    store.dispatch(Actions.retrieveTimeseries(siteno));
};


module.exports = {attachToNode, timeSeriesGraph};
