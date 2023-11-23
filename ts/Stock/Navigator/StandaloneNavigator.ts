import type { NavigatorOptions } from './NavigatorOptions';
import type ScrollbarOptions from '../Scrollbar/ScrollbarOptions';
import type PointerEvent from '../../Core/PointerEvent';
import type AxisOptions from '../../Core/Axis/AxisOptions';
import type { NavigatorAxisComposition } from '../../Core/Axis/NavigatorAxisComposition';
import Chart from '../../Core/Chart/Chart.js';
import Axis from '../../Core/Axis/Axis.js';
import Navigator from './Navigator.js';
import NavigatorComposition from './NavigatorComposition.js';
import NavigatorAxisAdditions from '../../Core/Axis/NavigatorAxisComposition.js';
import SVGRenderer from '../../Core/Renderer/SVG/SVGRenderer.js';
import Scrollbar from '../Scrollbar/Scrollbar.js';
import G from '../../Core/Globals.js';
import U from '../../Core/Utilities.js';
import Series from '../../Core/Series/Series.js';
const {
    addEvent,
    isNumber,
    merge,
    isString,
    pick,
} = U;
type ChartMock = Partial<Chart> & {
    navigator: StandaloneNavigator,
    renderTo: HTMLElement,
    isMock: true
}
type StandaloneNavigatorOptions = {
    navigator: NavigatorOptions,
    scrollbar: ScrollbarOptions,
    width: number,
    height: number,
    colors: []
}

const defaultNavOptions = {
	width: 400,
	height: 50,
    tooltip: {
        enabled: false
    },
	navigator: {
        enabled: true
    },
	scrollbar: {
        enabled: false
    },
    legend: {
        enabled: false
    },
    yAxis: {
        height: 0,
        visible: false
    },
    xAxis: {
        visible: false
    },
    title: {
        text: null
    },
    chart: {
        spacing: [0, 0, 0, 0],
        margin: [0, 0, 0, 0]
    }
};

declare module "../../Core/GlobalsLike.d.ts" {
	interface GlobalsLike {
		navigators: Array<StandaloneNavigator>;
	}
}
const forcedNavOptions = {
    navigator: {
        enabled: true
    },
    xAxis: {

    },
    yAxis: {

    }
}
class StandaloneNavigator {

    public time = G.time;
    public series: Array<Series>;
    public axes: Array<Axis>;
    public orderItems: () => void;
    public initSeries = (G as any).Chart.prototype.initSeries;
    public renderTo: any;
    public container:  any;
    public numberFormatter = (G as any).numberFormat;
    public plotLeft: number;
    public plotTop: number;
    public xAxis: Array<any>;
    public yAxis: Array<any>;
    public plotWidth: number;
    public renderer: SVGRenderer;
    public navigator: Navigator;
    public plotHeight: number;
    public sharedClips: Array<any>;
    public pointer = {
        normalize: (e: any) => {
            e.chartX = e.pageX;
            e.chartY = e.pageY;
            return e;
        }
    };
    public options: StandaloneNavigatorOptions;
    public userOptions = {}

    public static navigator(
        renderTo: (string|globalThis.HTMLElement),
        options: DeepPartial<StandaloneNavigatorOptions>
    ): StandaloneNavigator {
        const mergedOptions = merge(
        (G as any).getOptions(),
            defaultNavOptions,
            options,
            forcedNavOptions
        ) as StandaloneNavigatorOptions

        const element = isString(renderTo) ? document.getElementById(renderTo) : renderTo;

        if (!element) {
            throw new Error('wrong renderTo argument');
        }

        // const chartMock = StandaloneNavigator.getChartMock(element, mergedOptions)
        // chartMock
        let nav =  new StandaloneNavigator(element, mergedOptions);
        if (!G.navigators) {
            G.navigators = [nav]
        } else {
            G.navigators.push(nav);
        }
        return nav;

    }

    constructor(element: HTMLElement, options: StandaloneNavigatorOptions) {


        const WIDTH = options.width;
        const HEIGHT = options.height;
        // TODO: Figure out how to use the renderer below
        // const Renderer = options.renderer || !svg ?
        //     RendererRegistry.getRendererType(optionsChart.renderer) :
        //     SVGRenderer;
        const renderer = new SVGRenderer(
            element,
            WIDTH,
            HEIGHT
        ) as Chart.Renderer;


        // CONTANTS
           this.renderer = renderer;
           this.series= [];
           this.axes= [];
           this.orderItems= function () { };
           this.renderTo= renderer.box;
           this.container= renderer.box;
           this.plotLeft= 10;
           this.plotTop= 0;
           this.plotWidth= WIDTH - 20;

        // OPTIONS
        this.options = options;
        this.plotHeight = renderer.height;
        this.sharedClips = [];
        this.xAxis = [{
            len: WIDTH - 20,
            options: {
                // maxRange: 10000,
                width: WIDTH - 20
            },
            // minRange: 0.1,
            setExtremes: function (min: number, max: number) {
                console.log(min, max)
            },
        }];
        this.yAxis = [{
            options: {

            }
        }];
        const chart = new Chart(element, options);

        this.navigator = new Navigator(chart);
        chart.navigator = this.navigator;
        this.initNavigator();
    }

    public initNavigator() {
        const nav = this.navigator;
        nav.top = 0;
        nav.xAxis.setScale();
        nav.yAxis.setScale();
        nav.xAxis.render();
        nav.yAxis.render();
        nav.series?.forEach(s => {
            s.translate();
            s.render();
            s.redraw();
        });

        // TODO: Init some extremes, API method?
        let { min, max} = this.getNavigatorExtremes();
        nav.render(min, max);

    }

    public getNavigatorExtremes(){
        return {
            min: 2,
            max: 9
        }
    }



    // public init(chartMock: ChartMock|Chart) {
    //     const chart = chartMock;
    //     const chartOptions = chart.options,
    //         navigatorOptions = chartOptions?.navigator || {},
    //         navigatorEnabled = navigatorOptions.enabled,
    //         scrollbarOptions = chartOptions?.scrollbar || {},
    //         scrollbarEnabled = scrollbarOptions.enabled,
    //         height = navigatorEnabled && navigatorOptions.height || 0,
    //         scrollbarHeight = scrollbarEnabled && scrollbarOptions.height || 0,
    //         scrollButtonSize =
    //             scrollbarOptions.buttonsEnabled && scrollbarHeight || 0;
    //
    //     this.handles = [];
    //     this.shades = [];
    //
    //     this.chart = chart as Chart;
    //     this.setBaseSeries();
    //
    //     this.height = height;
    //     this.scrollbarHeight = scrollbarHeight;
    //     this.scrollButtonSize = scrollButtonSize;
    //     this.scrollbarEnabled = scrollbarEnabled;
    //     this.navigatorEnabled = navigatorEnabled as any;
    //     this.navigatorOptions = navigatorOptions;
    //     this.scrollbarOptions = scrollbarOptions;
    //
    //     this.opposite = pick(
    //         navigatorOptions.opposite,
    //         Boolean(!navigatorEnabled && chart.inverted)
    //     ); // #6262
    //
    //     const navigator = this,
    //         baseSeries = navigator.baseSeries;
    //
    //     chart.isDirtyBox = true;
    //
    //     // an x axis is required for scrollbar also
    //     navigator.xAxis = new Axis(chart as Chart, merge<DeepPartial<AxisOptions>>({
    //         // inherit base xAxis' break and ordinal options
    //         // breaks: baseXaxis.options.breaks,
    //         // ordinal: baseXaxis.options.ordinal
    //     }, navigatorOptions.xAxis, {
    //         id: 'navigator-x-axis',
    //         yAxis: 'navigator-y-axis',
    //         type: 'datetime',
    //         index: 0,
    //         isInternal: true,
    //         offset: 0,
    //         keepOrdinalPadding: true, // #2436
    //         startOnTick: false,
    //         endOnTick: false,
    //         minPadding: 0,
    //         maxPadding: 0,
    //         zoomEnabled: false
    //     }, chart.inverted ? {
    //         offsets: [scrollButtonSize, 0, -scrollButtonSize, 0],
    //         width: height
    //     } : {
    //         offsets: [0, -scrollButtonSize, 0, scrollButtonSize],
    //         height: height
    //     }), 'xAxis') as NavigatorAxisComposition;
    //
    //     navigator.yAxis = new Axis(chart as Chart, merge(
    //         navigatorOptions.yAxis,
    //         {
    //             id: 'navigator-y-axis',
    //             alignTicks: false,
    //             offset: 0,
    //             index: 0,
    //             isInternal: true,
    //             reversed: pick(
    //                 (
    //                     navigatorOptions.yAxis &&
    //                     navigatorOptions.yAxis.reversed
    //                 ),
    //                 false
    //             ), // #14060
    //             zoomEnabled: false
    //         }, chart.inverted ? {
    //             width: height
    //         } : {
    //             height: height
    //         }
    //     ), 'yAxis') as NavigatorAxisComposition;
    //
    //     // If we have a base series, initialize the navigator series
    //     if (baseSeries || (navigatorOptions.series as any).data) {
    //         navigator.updateNavigatorSeries(false);
    //
    //     // If not, set up an event to listen for added series
    //     }
    //
    //     navigator.reversedExtremes = (
    //         chart.inverted && !navigator.xAxis.reversed
    //     ) || (
    //         !chart.inverted && navigator.xAxis.reversed
    //     );
    //
    //     // Render items, so we can bind events to them:
    //     navigator.renderElements();
    //     // Add mouse events
    //     navigator.addMouseEvents();
    //
    // // in case of scrollbar only, fake an x axis to get translation
    // //  else {
    //         // navigator.xAxis = {
    //         //     chart,
    //         //     navigatorAxis: {
    //         //         fake: true
    //         //     },
    //         //     translate: function (value: number, reverse?: boolean): void {
    //         //         const axis = chart.xAxis[0],
    //         //             ext = axis.getExtremes(),
    //         //             scrollTrackWidth = axis.len - 2 * scrollButtonSize,
    //         //             min = numExt(
    //         //                 'min',
    //         //                 axis.options.min as any,
    //         //                 ext.dataMin
    //         //             ),
    //         //             valueRange = (numExt(
    //         //                 'max',
    //         //                 axis.options.max as any,
    //         //                 ext.dataMax
    //         //             ) as any) - (min as any);
    //
    //         //         return reverse ?
    //         //             // from pixel to value
    //         //             (value * valueRange / scrollTrackWidth) + (min as any) :
    //         //             // from value to pixel
    //         //             scrollTrackWidth * (value - (min as any)) / valueRange;
    //         //     },
    //         //     toPixels: function (
    //         //         this: NavigatorAxisComposition,
    //         //         value: number
    //         //     ): number {
    //         //         return this.translate(value);
    //         //     },
    //         //     toValue: function (
    //         //         this: NavigatorAxisComposition,
    //         //         value: number
    //         //     ): number {
    //         //         return this.translate(value, true);
    //         //     }
    //         // } as NavigatorAxisComposition;
    //
    //         // navigator.xAxis.navigatorAxis.axis = navigator.xAxis;
    //         // navigator.xAxis.navigatorAxis.toFixedRange = (
    //         //     NavigatorAxisAdditions.prototype.toFixedRange.bind(
    //         //         navigator.xAxis.navigatorAxis
    //         //     )
    //         // );
    //     // }
    //
    //
    //     // Initialize the scrollbar
    //     //if ((chart.options.scrollbar as any).enabled) {}
    //     //TODO: Figure out options of scrollbar
    //     if (true) {
    //
    //         const options = merge<DeepPartial<ScrollbarOptions>>(
    //             chart.options?.scrollbar,
    //             { vertical: chart.inverted }
    //         );
    //         if (!isNumber(options.margin) && navigator.navigatorEnabled) {
    //             options.margin = chart.inverted ? -3 : 3;
    //         }
    //         chart.scrollbar = navigator.scrollbar = new Scrollbar(
    //             chart.renderer!,
    //             options,
    //             chart as Chart
    //         );
    //         addEvent(navigator.scrollbar, 'changed', function (
    //             e: PointerEvent
    //         ): void {
    //             const range = navigator.size,
    //                 to = range * (this.to as any),
    //                 from = range * (this.from as any);
    //
    //             navigator.hasDragged = (navigator.scrollbar as any).hasDragged;
    //             navigator.render(0, 0, from, to);
    //
    //             if (this.shouldUpdateExtremes((e as any).DOMType)) {
    //                 setTimeout(function (): void {
    //                     navigator.onMouseUp(e);
    //                 });
    //             }
    //         });
    //     }
    //
    //     // // Add data events
    //     // navigator.addBaseSeriesEvents();
    //     // // Add redraw events
    //     // navigator.addChartEvents();
    //
    //     /* standalone code  */
    //     let nav = this as Navigator & StandaloneNavigator;
    //     chartMock.navigator = nav;
    // }

}
// function compose(navigatorClass: typeof Navigator) {
//     wrap(navigatorClass, 'init', () => {
//         // the same as above
//     })

// }

export default StandaloneNavigator;




/*
 * 
 *
 *
 * Standaleone Naviagor x extends
 * compose -> wrap on init (to not call some event on chart like ...)
 *
 * class StandaloneNavigator {
 * construcotr(options) {
 *
 * xAxis = {setExtremes => function() {}}
 * this.spacing = options.spacing;.....
 *
 *  this.navigator = new Navigator(this)
 * }
 *
 * }
 *
 *
 *----------
 chartMock = {,,,,,,,,}
 * StandaloneNavigator (extends navigator) -> chartMock -> axis, options, spacing, maring itp
 *
 * new Navigator (chartMock) -> navigator instance
 *
 *
 *
 *
 */
