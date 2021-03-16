/*
 *    main.js
 *    Mastering Data Visualization with D3.js
 *    Project 3 - CoinStats
 */

const MARGIN = { LEFT: 100, RIGHT: 100, TOP: 50, BOTTOM: 100 };
const WIDTH = 800 - MARGIN.LEFT - MARGIN.RIGHT;
const HEIGHT = 500 - MARGIN.TOP - MARGIN.BOTTOM;

const svg = d3
	.select('#chart-area')
	.append('svg')
	.attr('width', WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
	.attr('height', HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);

const g = svg
	.append('g')
	.attr('transform', `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

const formattedData = {};
// const selectedVar = $('#var-select option:selected').text();

// time parser for x-scale
const parseTime = d3.timeParse('%d/%m/%Y');
const formatTime = d3.timeFormat('%d/%m/%Y');
// for tooltip
const bisectDate = d3.bisector((d) => d.date).left;
// for currency
const currFormat = d3.format('.2f');

// add the line for the first time
g.append('path')
	.attr('class', 'line')
	.attr('fill', 'none')
	.attr('stroke', 'grey')
	.attr('stroke-width', '3px');

// y-axis label
const xLabel = g
	.append('text')
	.attr('class', 'x axisLabel')
	.attr('y', HEIGHT + 50)
	.attr('x', WIDTH / 2)
	.attr('font-size', '20px')
	.attr('text-anchor', 'middle')
	.text('Time');
const yLabel = g
	.append('text')
	.attr('class', 'y axisLabel')
	.attr('transform', 'rotate(-90)')
	.attr('y', -65)
	.attr('x', -170)
	.attr('text-anchor', 'middle')
	.attr('fill', '#5D6971');

// scales
const x = d3.scaleTime().range([0, WIDTH]);
const y = d3.scaleLinear().range([HEIGHT, 0]);

// axis generators
const xAxisCall = d3.axisBottom();
const yAxisCall = d3
	.axisLeft()
	.ticks(6)
	.tickFormat((d) => `${parseInt(d / 1000)}k`);

// axis groups
const xAxis = g
	.append('g')
	.attr('class', 'x axis')
	.attr('transform', `translate(0, ${HEIGHT})`);
const yAxis = g.append('g').attr('class', 'y axis');

// event listeners
$('#coin-select').on('change', () => update(formattedData));
$('#var-select').on('change', () => update(formattedData));

d3.json('data/coins.json').then((data) => {
	// clean data
	Object.keys(data).forEach((crypto) => {
		return (formattedData[crypto] = data[crypto]
			.filter((dataPoint) => {
				const dataExists =
					dataPoint['24h_vol'] && dataPoint.market_cap && dataPoint.price_usd;
				return dataExists;
			})
			.map((dataP) => {
				dataP['cryptoType'] = crypto;
				dataP['24h_vol'] = Number(dataP['24h_vol']);
				dataP.market_cap = Number(dataP.market_cap);
				dataP.price_usd = Number(dataP.price_usd);
				dataP.date = parseTime(dataP.date);
				return dataP;
			}));
	});
	console.log(formattedData);

	update(formattedData);
});

// date slider
$('#date-slider').slider({
	range: true,
	min: parseTime('12/05/2013').getTime(),
	max: parseTime('31/10/2017').getTime(),
	step: 1,
	values: [
		parseTime('12/05/2013').getTime(),
		parseTime('31/10/2017').getTime(),
	],
	slide: (event, ui) => {
		// $('#amount').val(`${ui.values[0]} - ${ui.values[1]}`);
		$('#dateLabel1').text(`${formatTime(ui.values[0])}`);
		$('#dateLabel2').text(`${formatTime(ui.values[1])}`);
		update(formattedData);
	},
});

function update(inputData) {
	const t = d3.transition().duration(1000);
	const cryptoType = $('#coin-select').val();
	const macroData = inputData[cryptoType];
	const measureType = $('#var-select').val();
	const sliderValues = $('#date-slider').slider('values');
	console.log(formatTime(sliderValues[0]), formatTime(sliderValues[1]));
	const filteredData = macroData.filter((dataP) => {
		return dataP.date >= sliderValues[0] && dataP.date <= sliderValues[1];
	});
	const data = filteredData;

	$('#dateLabel1').text(formatTime(sliderValues[0]));

	yLabel.text($('#var-select option:selected').text());
	// set scale domains
	x.domain(d3.extent(data, (d) => d.date));
	y.domain([0, d3.max(data, (d) => d[measureType]) * 1.005]);

	// format values adjustments
	const formatSi = d3.format('.2s');
	function formatAbbreviation(x) {
		const s = formatSi(x);
		switch (s[s.length - 1]) {
			case 'G':
				return s.slice(0, -1) + 'B';
			case 'k':
				return s.slice(0, -1) + 'k';
		}
		return s;
	}

	// generate axes once scales have been set
	xAxis.transition(t).call(xAxisCall.scale(x));
	yAxis.transition(t).call(yAxisCall.tickFormat(formatAbbreviation).scale(y));

	/******************************** Tooltip Code ********************************/

	const focus = g.append('g').attr('class', 'focus').style('display', 'none');

	focus
		.append('line')
		.attr('class', 'x-hover-line hover-line')
		.attr('y1', 0)
		.attr('y2', HEIGHT);

	focus
		.append('line')
		.attr('class', 'y-hover-line hover-line')
		.attr('x1', 0)
		.attr('x2', WIDTH);

	focus.append('circle').attr('r', 7.5);

	focus.append('text').attr('x', 15).attr('dy', '.31em');

	g.append('rect')
		.attr('class', 'overlay')
		.attr('width', WIDTH)
		.attr('height', HEIGHT)
		.on('mouseover', () => focus.style('display', null))
		.on('mouseout', () => focus.style('display', 'none'))
		.on('mousemove', mousemove);

	function mousemove() {
		const x0 = x.invert(d3.mouse(this)[0]);
		const i = bisectDate(data, x0, 1);
		const d0 = data[i - 1];
		const d1 = data[i];
		const d = x0 - d0.date > d1.date - x0 ? d1 : d0;
		focus.attr('transform', `translate(${x(d.date)}, ${y(d[measureType])})`);
		focus.select('text').text(d.value);
		focus.select('.x-hover-line').attr('y2', HEIGHT - y(d[measureType]));
		focus.select('.y-hover-line').attr('x2', -x(d.date));
	}

	/******************************** Tooltip Code ********************************/

	// line path generator
	const line = d3
		.line()
		.x((d) => x(d.date))
		.y((d) => y(d[measureType]));

	g.select('.line').transition(t).attr('d', line(data));

	// $('#dateLabel1')[0].innerHTML = String(time + 1800);
	// $('#date-slider').slider('value', Number(time + 1800));
}
