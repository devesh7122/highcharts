import type Chart from "../../Core/Chart/Chart.js";
import Navigator from "./Navigator.js";
import U from "../../Core/Utilities.js";
import Scrollbar from "../Scrollbar/Scrollbar.js";
import ScrollbarOptions from "../Scrollbar/ScrollbarOptions.js";
const { addEvent, correctFloat, defined, isNumber, pick, clamp, fireEvent } = U;

class ChartNavigator extends Navigator {

    public scrollbar?: Scrollbar;
    public scrollbarEnabled?: boolean;
    public scrollbarHeight = 0;
    public scrollButtonSize: number = void 0 as any;
    public scrollbarOptions?: ScrollbarOptions;

    public constructor(chart: Chart) {
        super(chart);
    }

    public initChartDepenencies(chart: Chart) {
        this.addChartEvents(chart);
    }

    public init(chart: Chart) {
        super.init.call(this, chart);
        this.initChartDepenencies(chart)
    }

    public render(
        min: number,
        max: number,
        pxMin?: number,
        pxMax?: number
    ): void {
        const navigator = this,
            chart = navigator.chart,
            xAxis = navigator.xAxis,
            pointRange = xAxis.pointRange || 0,
            scrollbarXAxis = xAxis.navigatorAxis.fake ? chart.xAxis[0] : xAxis,
            navigatorEnabled = navigator.navigatorEnabled,
            rendered = navigator.rendered,
            inverted = chart.inverted,
            minRange = chart.xAxis[0].minRange,
            maxRange = chart.xAxis[0].options.maxRange,
            scrollButtonSize = navigator.scrollButtonSize;

        let navigatorWidth,
            scrollbarLeft,
            scrollbarTop,
            scrollbarHeight = navigator.scrollbarHeight,
            navigatorSize,
            verb;

        // Don't redraw while moving the handles (#4703).
        if (this.hasDragged && !defined(pxMin)) {
            return;
        }

        min = correctFloat(min - pointRange / 2);
        max = correctFloat(max + pointRange / 2);

        // Don't render the navigator until we have data (#486, #4202, #5172).
        if (!isNumber(min) || !isNumber(max)) {
            // However, if navigator was already rendered, we may need to resize
            // it. For example hidden series, but visible navigator (#6022).
            if (rendered) {
                pxMin = 0;
                pxMax = pick(xAxis.width, scrollbarXAxis.width);
            } else {
                return;
            }
        }

        navigator.left = pick(
            xAxis.left,
            // in case of scrollbar only, without navigator
            chart.plotLeft + scrollButtonSize +
            (inverted ? chart.plotWidth : 0)
        );

        let zoomedMax = navigator.size = navigatorSize = pick(
            xAxis.len,
            (inverted ? chart.plotHeight : chart.plotWidth) -
            2 * scrollButtonSize
        );

        if (inverted) {
            navigatorWidth = scrollbarHeight;
        } else {
            navigatorWidth = navigatorSize + 2 * scrollButtonSize;
        }

        // Get the pixel position of the handles
        pxMin = pick(pxMin, xAxis.toPixels(min, true));
        pxMax = pick(pxMax, xAxis.toPixels(max, true));

        // Verify (#1851, #2238)
        if (!isNumber(pxMin) || Math.abs(pxMin as any) === Infinity) {
            pxMin = 0;
            pxMax = navigatorWidth;
        }

        // Are we below the minRange? (#2618, #6191)
        const newMin = xAxis.toValue(pxMin as any, true),
            newMax = xAxis.toValue(pxMax as any, true),
            currentRange = Math.abs(correctFloat(newMax - newMin));

        if (currentRange < (minRange as any)) {
            if (this.grabbedLeft) {
                pxMin = xAxis.toPixels(
                    newMax - (minRange as any) - pointRange,
                    true
                );
            } else if (this.grabbedRight) {
                pxMax = xAxis.toPixels(
                    newMin + (minRange as any) + pointRange,
                    true
                );
            }
        } else if (
            defined(maxRange) &&
            correctFloat(currentRange - pointRange) > (maxRange as any)
        ) {
            if (this.grabbedLeft) {
                pxMin = xAxis.toPixels(
                    newMax - (maxRange as any) - pointRange,
                    true
                );
            } else if (this.grabbedRight) {
                pxMax = xAxis.toPixels(
                    newMin + (maxRange as any) + pointRange,
                    true
                );
            }
        }

        // Handles are allowed to cross, but never exceed the plot area
        navigator.zoomedMax = clamp(
            Math.max(pxMin, pxMax as any),
            0,
            zoomedMax
        );
        navigator.zoomedMin = clamp(
            navigator.fixedWidth ?
                navigator.zoomedMax - navigator.fixedWidth :
                Math.min(pxMin, pxMax as any),
            0,
            zoomedMax
        );

        navigator.range = navigator.zoomedMax - navigator.zoomedMin;

        zoomedMax = Math.round(navigator.zoomedMax);
        const zoomedMin = Math.round(navigator.zoomedMin);

        if (navigatorEnabled) {
            navigator.navigatorGroup.attr({
                visibility: 'inherit'
            });
            // Place elements
            verb = rendered && !navigator.hasDragged ? 'animate' : 'attr';

            navigator.drawMasks(zoomedMin, zoomedMax, inverted, verb);
            navigator.drawOutline(zoomedMin, zoomedMax, inverted, verb);

            if ((navigator.navigatorOptions.handles as any).enabled) {
                navigator.drawHandle(zoomedMin, 0, inverted, verb);
                navigator.drawHandle(zoomedMax, 1, inverted, verb);
            }
        }

        if (navigator.scrollbar) {
            if (inverted) {
                scrollbarTop = navigator.top - scrollButtonSize;
                scrollbarLeft = navigator.left - scrollbarHeight +
                    (navigatorEnabled || !scrollbarXAxis.opposite ? 0 :
                        // Multiple axes has offsets:
                        (scrollbarXAxis.titleOffset || 0) +
                        // Self margin from the axis.title
                        (scrollbarXAxis.axisTitleMargin as any)
                    );
                scrollbarHeight = navigatorSize + 2 * scrollButtonSize;
            } else {
                scrollbarTop = navigator.top + (navigatorEnabled ?
                    navigator.height :
                    -scrollbarHeight);
                scrollbarLeft = navigator.left - scrollButtonSize;
            }
            // Reposition scrollbar
            navigator.scrollbar.position(
                scrollbarLeft,
                scrollbarTop,
                navigatorWidth as any,
                scrollbarHeight
            );
            // Keep scale 0-1
            navigator.scrollbar.setRange(
                // Use real value, not rounded because range can be very small
                // (#1716)
                navigator.zoomedMin / (navigatorSize || 1),
                navigator.zoomedMax / (navigatorSize || 1)
            );
        }
        navigator.rendered = true;
        fireEvent(this, 'afterRender');


    }

    public addChartEvents(chart: Chart): void {
        if (!this.eventsToUnbind) {
            this.eventsToUnbind = [];
        }

        this.eventsToUnbind.push(
            // Move the scrollbar after redraw, like after data updata even if
            // axes don't redraw
            addEvent(
                chart,
                'redraw',
                function (): void {
                    const navigator = this.navigator as Navigator,
                        xAxis = navigator && (
                            navigator.baseSeries &&
                            navigator.baseSeries[0] &&
                            navigator.baseSeries[0].xAxis ||
                            this.xAxis[0]
                        ); // #5709, #13114

                    if (xAxis) {
                        navigator.render(xAxis.min as any, xAxis.max as any);
                    }
                }
            ),
            // Make room for the navigator, can be placed around the chart:
            addEvent(
                chart,
                'getMargins',
                function (): void {
                    let chart = this,
                        navigator = chart.navigator as ChartNavigator,
                        marginName = navigator.opposite ?
                            'plotTop' : 'marginBottom';

                    if (chart.inverted) {
                        marginName = navigator.opposite ?
                            'marginRight' : 'plotLeft';
                    }

                    (chart as any)[marginName] =
                        ((chart as any)[marginName] || 0) + (
                            navigator.navigatorEnabled || !chart.inverted ?
                                navigator.height + navigator.scrollbarHeight :
                                0
                        ) + navigator.navigatorOptions.margin;
                }
            )
        );
    }
}

export default ChartNavigator;

