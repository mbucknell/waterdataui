import {brushX} from 'd3-brush';
import {event} from 'd3-selection';
import {createStructuredSelector} from 'reselect';

import {appendXAxis} from '../../../d3-rendering/axes';
import {link} from '../../../lib/d3-redux';
import {Actions} from '../../store/instantaneous-value-time-series-state';

import {getBrushXAxis} from './selectors/axes';
import {getCurrentVariableLineSegments} from './selectors/drawing-data';
import {getBrushLayout} from './selectors/layout';
import {getBrushXScale, getBrushYScale} from './selectors/scales';
import {isVisible} from './selectors/time-series-data';
import {drawDataLines} from './time-series-lines';
import {mediaQuery} from '../../../utils';
import config from '../../../config';

export const drawGraphBrush = function(container, store) {
    let customHandle;
    let layoutHeight;

    const brushed = function() {
        // if the user clicks a point in the brush area without making an actual selection, remove the custom handles
        if (event.selection == null) {
            customHandle.attr('display', 'none');            
        }
        customHandle.attr('transform', function(d, index) {
            const yPositionForCustomHandle = mediaQuery(config.USWDS_LARGE_SCREEN) ? layoutHeight / 3.3 * -1 : layoutHeight / 2.5 * -1;
            return 'translate(' + [event.selection[index], yPositionForCustomHandle] + ')';
        });

        if (!event.sourceEvent || event.sourceEvent.type === 'zoom') {
            return;
        }

        const xScale = getBrushXScale('current')(store.getState());
        const brushRange = event.selection || xScale.range();

        // Only adjust the main hydrograph when user is done adjusting the time range.
        if (event.sourceEvent.type === 'mouseup' || event.sourceEvent.type === 'touchend') {
            const adjustedBrush = brushRange.map(xScale.invert, xScale);

            store.dispatch(Actions.setIVGraphBrushOffset(
                adjustedBrush[0]- xScale.domain()[0],
                xScale.domain()[1] - adjustedBrush[1]));
        }
    };

    const div = container.append('div')
        .attr('class', 'hydrograph-container');
    div.append('svg')
        .classed('brush-svg', true)
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .call(link(store,(elem, layout) => {
                elem.attr('viewBox', `0 0 ${layout.width + layout.margin.left + layout.margin.right} ${layout.height + layout.margin.bottom + layout.margin.top}`);
            }, getBrushLayout
        ))
        .call(svg => {
            svg.append('text')
                .classed('brush-text-hint', true)
                .text('drag handles to change timeframe')
                .attr('text-anchor', 'middle')
                .attr('font-size', 'smaller')
                .call(link(store,(elem, layout) => elem.attr('transform', `translate(${(layout.width / 2) + (layout.margin.left / 2) },${layout.height + 10})`),
                    getBrushLayout
                ));
            svg.append('g')
                .call(link(store,(elem, layout) => elem.attr('transform', `translate(${layout.margin.left},${layout.margin.top})`),
                    getBrushLayout
                ))
                .call(link(store, appendXAxis, createStructuredSelector({
                    xAxis: getBrushXAxis,
                    layout: getBrushLayout
                })))
                .call(link(store, drawDataLines, createStructuredSelector({
                    visible: isVisible('current'),
                    tsLinesMap: getCurrentVariableLineSegments('current'),
                    xScale: getBrushXScale('current'),
                    yScale: getBrushYScale,
                    tsKey: () => 'current',
                    enableClip: () => false
                })));
        })
        .call(link(store, (svg, {layout, hydrographBrushOffset, xScale}) => {
            console.log('layout ', layout)
            let selection;
            layoutHeight = layout.height;

            const graphBrush = brushX()
                .on('brush end', brushed);

            svg.select('.brush').remove();

            const group = svg.append('g').attr('class', 'brush')
                .attr('transform', `translate(${layout.margin.left}, ${layout.margin.top})`);

            graphBrush.handleSize([1]); // make default handle 1px wide
            graphBrush.extent([[0, 0], [layout.width - layout.margin.right, layout.height - layout.margin.bottom - layout.margin.top]]);

            const brushResizePath = function(d) {
                let e = +(d.type == 'e'),
                    x = e ? 1 : -1,
                    y = layoutHeight / 2;
                return 'M' + (.5 * x) + ',' + y + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6) + 'V' + (2 * y - 6) + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y) + 'Z' + 'M' + (2.5 * x) + ',' + (y + 8) + 'V' + (2 * y - 8) + 'M' + (4.5 * x) + ',' + (y + 8) + 'V' + (2 * y - 8);
            };
            customHandle = group.selectAll('.handle--custom')
                .data([{type: 'w'}, {type: 'e'}])
                .enter().append('path')
                .attr('class', 'handle--custom')
                .attr('stroke', '#000')
                .attr('cursor', 'ew-resize')
                .attr('d', brushResizePath);

            // Creates the brush
            group.call(graphBrush);

            // Add a class so the default handles can have styling that won't conflict with the slider handle
            svg.selectAll('.handle').classed('standard-brush-handle', true);

            if (hydrographBrushOffset) {
                const [startMillis, endMillis] = xScale.domain();
                selection = [
                    xScale(startMillis + hydrographBrushOffset.start),
                    xScale(endMillis - hydrographBrushOffset.end)
                ];
            } else {
                selection = xScale.range();
            }
            if (selection[1] - selection[0] > 0) {
                group.call(graphBrush.move, selection);
            }

        }, createStructuredSelector({
            layout: getBrushLayout,
            hydrographBrushOffset: (state) => state.ivTimeSeriesState.ivGraphBrushOffset,
            xScale: getBrushXScale('current')
        })));
};