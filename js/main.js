var Heatmap = (function(window,d3) {

	var userW, userH, margin, h, w, xSc, xAxis, xDomArr = [], xAxBot, ySc, yAxis, yDomArr, yAxLft, colSc, colDomArr, legend, legAxis, legPosX, legPosY, legDomArr = [], chartSvg, path, tlTp, minTemp, maxTemp, baseEl, legStep, minDispDim;

	d3.json("./res/us-heat.json", function(error, data) {
		if (error) throw error;
		init(data);
	});

	d3.xml("./res/github-corner.svg").mimeType("image/svg+xml").get(function(error, xml) {
		if (error) throw error;
		var link = document.createElement("a");
		link.setAttribute("href", "https://github.com/DavOnGit/heatmap-us-d3");
		link.appendChild(xml.documentElement);
		document.body.appendChild(link).setAttribute("id","link-ghub");
	});

	function init(jdata) {
		data = jdata;

		//format data
		data.monthlyVariance.forEach(function(d, i) {
			d.year = +d.year;
			d.month = +d.month;
			d.base = +data.baseTemperature;
			if (d.month == 1) xDomArr.push(d.year);
		});

		// build scale's domain array
		yDomArr = new Array(12).fill(0);
		yDomArr.forEach(function(d, i) {
			somedate = new Date(1970, i, 1);
			return yDomArr[i] = d3.timeFormat("%b")(somedate);
		});
		colDomArr = d3.extent(data.monthlyVariance, function(d) { return d.variance });

		minTemp = (data.baseTemperature + colDomArr[0]).toFixed(2);
		maxTemp = (data.baseTemperature + colDomArr[1]).toFixed(2);
		baseEl = ~~minTemp + 1;	//~~ stands for Math.floor()
		legDomArr.push(minTemp);
		for (var i = baseEl; i < ~~maxTemp; i++) legDomArr.push(i);
		if (maxTemp % 1) legDomArr.push(maxTemp);

		//initialize scales and scales.domain

		xSc = d3.scaleBand().domain(xDomArr);
		ySc = d3.scaleBand().domain(yDomArr);
		colSc = d3.scaleLinear().domain(colDomArr);
		legSc = d3.scaleBand().domain(legDomArr);

		//initialize axis
		//xAxis = d3.axisTop().tickSize(4).tickSizeOuter(0);
		yAxis = d3.axisLeft().tickSize(4).tickSizeOuter(0);
		xAxBot = d3.axisBottom().tickSize(4).tickSizeOuter(0);
		//yAxLft = d3.axisRight().tickSize(4).tickSizeOuter(0);
		legAxis = d3.axisBottom().tickSize(0).tickSizeOuter(0);

		//initialize svg elements
		chartSvg = d3.select("#chart").append("svg").classed("chart", true).classed("no-select", true);
		chartWrapper = chartSvg.append("g");

		path = chartWrapper.append("g").classed("dataset", true).selectAll("rect")
			.data(data.monthlyVariance).enter().append("rect");

		chartWrapper.append("g").classed("x axis", true);
		chartWrapper.append("g").classed("y axis", true);
		chartWrapper.append("g").classed("x2 axis", true);
		chartWrapper.append("g").classed("y2 axis", true);

		legend = d3.select(".chart").append("g").classed("legend", true);
		legend.append("g").selectAll("rect")
			.data(legDomArr).enter().append("rect").classed("data", true);
		legend.append("g").classed("l axis", true);
		legend.append("text").classed("cels-sym", true).text("℃");

		chartSvg.append("text").attr("class", "title")
			.text("Land-Surface Temperature U.S.A. 1753 - 2015");
		chartSvg.append("text").attr("class", "subtitle")
			.text("All temperatures are in Celsius. Estimated Jan 1951-Dec 1980 absolute mean temperature: 8.66 +/- 0.07 ℃");

		tlTp = d3.select("#chart").append("div").classed("tlTp", true);
		tlTp.append("h4");
		tlTp.append("p").attr("id", "temp");
		tlTp.append("p").attr("id", "deltaT");

		// render the chart
		render();
	}

	function render() {

		//get dimensions based on window size
		updateDimensions(window.innerWidth, window.innerHeight);

		//update x and y scales to new dimensions
		xSc.range([0, w]);
		ySc.range([0, h]);
		colSc.range([1, 0]);
		legSc.range([0, w]);

		//update svg elements to new dimensions
		chartSvg.attr("width", userW).attr("height", userH)
		chartWrapper.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		chartSvg.select(".title").attr("x", userW / 2)
			.attr("y", margin.top / 2)//.attr("dy", 16)
			.style("font-size", (userW < 1000 ? 22 : 34) + "px");
		chartSvg.select(".subtitle").attr("x", userW / 2)
			.attr("y", margin.top / 2 +24)//.attr("dy", 6)
			.style("font-size", (userW < 1000 ? 10 : 12) + "px");

		//update axis, rect and legend
		//xAxis.scale(xSc);
		yAxis.scale(ySc);
		xAxBot.scale(xSc);
		//yAxLft.scale(ySc);
		legAxis.scale(legSc);

		//chartSvg.select(".x.axis").attr("transform", "translate(0, " + -1 + ")").call(xAxis)
			//.selectAll("g").attr("opacity", "0").filter(":nth-child(20n+9)").attr("opacity", "1");
		chartSvg.select(".y.axis").attr("transform", "translate(" + 0 + " 0)").call(yAxis);
		chartSvg.select(".x2.axis").attr("transform", "translate(0, " + h  + ")").call(xAxBot)
			.selectAll("g").attr("opacity", "0").filter(":nth-child(20n+9)").attr("opacity", "1");
		//chartSvg.select(".y2.axis").attr("transform", "translate(" + w + " 0)").call(yAxLft);

		path.attr("x", function(d) { return xSc(d.year); })
			.attr("y", function(d) { return ySc(yDomArr[d.month - 1]); })
			.attr("width", function(d) { return xSc.bandwidth(); })
			.attr("height", function(d) { return ySc.bandwidth(); })
			.attr("fill", function(d) { return d3.interpolateSpectral(colSc(d.variance)); })
			.on("mouseenter", showTp)
			.on("mouseleave", hideTp);

		legPosX = margin.left;
		legPosY = userH - margin.bot / 1.8;
		legend.select(".l.axis").attr("transform", "translate(" + legPosX + ", " + (legPosY + 1) + ")").call(legAxis);
		legend.selectAll(".data")
			.attr("x", function(d, i) { return legSc.bandwidth() * i + legPosX; })
			.attr("y", function(d) { return legPosY; })
			.attr("width", function(d) { return legSc.bandwidth(); })
			.attr("height", function(d) { return 15; })
			.attr("fill", function(d, i) { return d3.interpolateSpectral(colSc(d - data.baseTemperature)); });
		legend.select(".cels-sym").attr("x", margin.left + w + 10).attr("y", legPosY + 12);
	}

	function updateDimensions(uW, uH) {
		userW = uW < 500 ? 500 : uW;
		userH = uH < 500 ? 500 : uH;
		margin = {
			top: 100,
			right: userW * 0.07,
			bot: 80,
			left: userW * 0.08
		};
		w = userW - margin.left - margin.right;
		h = userH - margin.top - margin.bot;
		minDispDim = (userW > userH) ? userH : userW;
	}

	function showTp(d) {
		var self = d3.select(this);
		var xPos = ~~self.attr("x") + margin.left - tlTp.style("width").replace(/\D+/,'') / 2;
		var yPos = ~~self.attr("y") + margin.top - 65;
		var temp = (d.base + d.variance).toFixed(3);

		tlTp.style("left", xPos + "px").style("top", yPos + "px")
			.style("background-color", self.attr("fill"));
		tlTp.select("h4").text(yDomArr[d.month - 1] + " " + d.year);
		tlTp.select("#temp").text(temp + " ℃ temp.");
		tlTp.select("#deltaT").text(d.variance + " ℃ variation");
		tlTp.style("display", "block");
	}

	function hideTp() {
		tlTp.style("display", "none");
	}

	d3.select(window).on("resize", render);
	var resizeTimeId;

	function resize() {
		clearTimeout(resizeTimeId);
		resizeTimeId = window.setTimeout(function () {
			render();
		}, 500);
	}

//window.addEventListener('resize', resize);
})(window,d3);
