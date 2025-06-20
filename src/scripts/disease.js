// disease.js: Generic for any disease, expects ?disease=DISEASE_NAME in URL
function getDiseaseFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('disease') || 'Cancer';
}

function updateTitles(disease) {
    document.getElementById('disease-title').textContent = `${disease} Data Analysis`;
    document.getElementById('gender-title').textContent = `Gender Distribution in ${disease} Patients`;
    document.getElementById('age-title').textContent = `Age Distribution of ${disease} Patients`;
    document.getElementById('coxcomb-title').textContent = `Age Group Distribution (${disease}) (Coxcomb Plot)`;
    document.getElementById('cases-title').textContent = `${disease} Cases Over Time (Line Chart)`;
    document.getElementById('area-title').textContent = `Age Group Distribution Over Time (${disease}) (Area Chart)`;
    document.getElementById('bubble-title').textContent = `Critical Health Indicators (${disease}) (Bubble Chart)`;
}

document.addEventListener('DOMContentLoaded', function() {
    const disease = getDiseaseFromURL();
    updateTitles(disease);
    d3.csv("../data/healthcare_dataset.csv").then(data => {
        // Filter data for the selected disease (case-insensitive, check common keys)
        const filtered = data.filter(d => d["Medical Condition"] === disease);
        if (filtered.length === 0) {
            d3.select('.container').append('div').attr('class', 'alert').text(`No data found for ${disease}`);
            return;
        }
        createGenderPieChart(filtered);
        createAgeLineChart(filtered);
        createAgeGroupCoxcombPlot(filtered);
        createCasesOverTimeLineChart(filtered);
        createAgeGroupAreaChart(filtered);
        createCriticalIndicatorsBubbleChart(filtered);
        createTestResultsBarChart(filtered);
        createAdmissionTypePieChart(filtered);
        createMedicationUsageBarChart(filtered);
        createAvgBillingBarChart(data, disease);
        createGenderAdmissionStackedBarChart(filtered);
    }).catch(error => {
        d3.select('.container').append('div').attr('class', 'alert').text('Error loading data.');
    });
});

function extractYearFromAdmission(dateStr) {
    // Expects format DD-MM-YYYY
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    return parts.length === 3 ? +parts[2] : null;
}

function createGenderPieChart(data) {
    const width = 450;
    const height = 450;
    const radius = Math.min(width, height) / 2;

    // Count gender distribution
    const genderCount = {};
    data.forEach(d => {
        genderCount[d.Gender] = (genderCount[d.Gender] || 0) + 1;
    });

    const svg = d3.select("#genderPieChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    // Add drop shadow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("height", "130%");
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 5)
        .attr("result", "blur");
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 0)
        .attr("dy", 8)
        .attr("result", "offsetBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Add radial gradients for 3D effect
    const colors = ["#00e0d3", "#ff69b4"];
    Object.keys(genderCount).forEach((gender, i) => {
        const grad = defs.append("radialGradient")
            .attr("id", `grad-${gender}`)
            .attr("cx", "50%")
            .attr("cy", "50%")
            .attr("r", "70%")
            .attr("fx", "50%")
            .attr("fy", "40%");
        grad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d3.color(colors[i]).brighter(1));
        grad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d3.color(colors[i]).darker(1.5));
    });

    const color = d3.scaleOrdinal()
        .domain(Object.keys(genderCount))
        .range(Object.keys(genderCount).map(g => `url(#grad-${g})`));

    const pie = d3.pie()
        .value(d => d[1]);

    const data_ready = pie(Object.entries(genderCount));

    const arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    // Create tooltip
    const tooltip = d3.select("#genderPieChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");

    // Add interactive slices with 3D look
    const slices = svg.selectAll('path')
        .data(data_ready)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', d => color(d.data[0]))
        .attr("stroke", "#18181b")
        .style("stroke-width", "2px")
        .style("opacity", 0.85)
        .style("filter", "url(#drop-shadow)")
        .style("transition", "all 0.3s")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .style("opacity", 1)
                .attr("transform", function(d) {
                    const centroid = arcGenerator.centroid(d);
                    const midAngle = Math.atan2(centroid[1], centroid[0]);
                    const x = Math.cos(midAngle) * 10;
                    const y = Math.sin(midAngle) * 10;
                    return 'translate(' + x + ',' + y + ')';
                });
            
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            const percentage = ((d.data[1] / data.length) * 100).toFixed(1);
            tooltip.html(`Gender: ${d.data[0]}<br>Count: ${d.data[1]}<br>Percentage: ${percentage}%`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            d3.select(this)
                .style("opacity", 0.85)
                .attr("transform", "translate(0,0)");
            
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Update labels
    const labels = svg.selectAll('.label')
        .data(data_ready)
        .join('text')
        .attr('class', 'label')
        .attr("transform", d => `translate(${arcGenerator.centroid(d)})`)
        .style("text-anchor", "middle")
        .style("font-size", 14)
        .style("fill", "#111")
        .style("opacity", 0.9)
        .html(d => {
            const percentage = ((d.data[1] / data.length) * 100).toFixed(1);
            return `${d.data[0]}: ${percentage}%`;
        });
}

function createAgeLineChart(data) {
    const margin = {top: 30, right: 30, bottom: 50, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Group by age and count
    const ageCount = {};
    data.forEach(d => {
        ageCount[d.Age] = (ageCount[d.Age] || 0) + 1;
    });

    // Convert to array and sort by age
    const ageData = Object.entries(ageCount)
        .map(([age, count]) => ({age: +age, count}))
        .sort((a, b) => a.age - b.age);

    const svg = d3.select("#ageLineChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleLinear()
        .domain(d3.extent(ageData, d => d.age))
        .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(ageData, d => d.count)])
        .range([height, 0]);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(10))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);

    // Add the line
    svg.append("path")
        .datum(ageData)
        .attr("fill", "none")
        .attr("stroke", "#00e0d3")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x(d.age))
            .y(d => y(d.count))
        );

    // Add the points with interaction
    const dots = svg.selectAll("circle")
        .data(ageData)
        .join("circle")
        .attr("cx", d => x(d.age))
        .attr("cy", d => y(d.count))
        .attr("r", 5)
        .attr("fill", "#00e0d3")
        .style("opacity", 0.7)
        .style("transition", "all 0.3s")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("r", 8)
                .style("opacity", 1)
                .style("fill", "#ff69b4");

            tooltip.transition()
                .duration(200)
                .style("opacity", .9);

            tooltip.html(`Age: ${d.age}<br>Patients: ${d.count}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("r", 5)
                .style("opacity", 0.7)
                .style("fill", "#00e0d3");

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // X axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.bottom - 10)
        .text("Age")
        .style("fill", "#111")
        .style("font-size", 14);

    // Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Number of Patients")
        .style("fill", "#111")
        .style("font-size", 14);

    // Add chart title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Age Distribution of Cancer Patients");
}

function createAgeGroupCoxcombPlot(data) {
    // Define age groups
    const ageGroups = [
        { label: '0-9', min: 0, max: 9 },
        { label: '10-19', min: 10, max: 19 },
        { label: '20-29', min: 20, max: 29 },
        { label: '30-39', min: 30, max: 39 },
        { label: '40-49', min: 40, max: 49 },
        { label: '50-59', min: 50, max: 59 },
        { label: '60-69', min: 60, max: 69 },
        { label: '70-79', min: 70, max: 79 },
        { label: '80+', min: 80, max: 200 }
    ];

    // Count patients in each age group
    const groupCounts = ageGroups.map(g => ({
        label: g.label,
        count: data.filter(d => +d.Age >= g.min && +d.Age <= g.max).length
    }));

    const width = 450, height = 450, innerRadius = 60, outerRadius = Math.min(width, height) / 2 - 20;
    const svg = d3.select("#ageGroupCoxcomb")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    // Scale for the radius
    const maxCount = d3.max(groupCounts, d => d.count);
    const radius = d3.scaleLinear()
        .domain([0, maxCount])
        .range([innerRadius, outerRadius]);

    // Angle for each group
    const angle = d3.scaleBand()
        .domain(groupCounts.map(d => d.label))
        .range([0, 2 * Math.PI])
        .align(0);

    // Arc generator
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(d => radius(d.count))
        .startAngle(d => angle(d.label))
        .endAngle(d => angle(d.label) + angle.bandwidth())
        .padAngle(0.03)
        .padRadius(innerRadius);

    // Color scale
    const color = d3.scaleSequential(d3.interpolateCool)
        .domain([0, groupCounts.length]);

    // Draw arcs
    svg.selectAll("path")
        .data(groupCounts)
        .join("path")
        .attr("fill", (d, i) => color(i))
        .attr("d", arc)
        .style("stroke", "#fff")
        .style("opacity", 0.9)
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 1);
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Age Group: ${d.label}<br>Patients: ${d.count}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 0.9);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Tooltip
    const tooltip = d3.select("#ageGroupCoxcomb")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");

    // Add labels
    svg.selectAll("text")
        .data(groupCounts)
        .join("text")
        .attr("text-anchor", "middle")
        .attr("x", d => Math.cos(angle(d.label) + angle.bandwidth()/2 - Math.PI/2) * (outerRadius + 20))
        .attr("y", d => Math.sin(angle(d.label) + angle.bandwidth()/2 - Math.PI/2) * (outerRadius + 20))
        .text(d => d.label)
        .style("fill", "#111")
        .style("font-size", 13);

    // Title
    svg.append("text")
        .attr("x", 0)
        .attr("y", -height/2 + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Coxcomb Plot: Age Group Distribution");
}

function createCasesOverTimeLineChart(data) {
    // Use 'Date of Admission' to extract year
    let yearCounts = {};
    data.forEach(d => {
        let year = extractYearFromAdmission(d["Date of Admission"]);
        if (!year) return;
        yearCounts[year] = (yearCounts[year] || 0) + 1;
    });
    if (Object.keys(yearCounts).length === 0) {
        d3.select('#casesOverTimeLineChart').append('div').text('No admission date data available.');
        return;
    }
    const yearData = Object.entries(yearCounts)
        .map(([year, count]) => ({ year: +year, count }))
        .sort((a, b) => a.year - b.year);

    const margin = {top: 30, right: 30, bottom: 50, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#casesOverTimeLineChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleLinear()
        .domain(d3.extent(yearData, d => d.year))
        .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(yearData, d => d.count)])
        .range([height, 0]);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);

    // Add the line
    svg.append("path")
        .datum(yearData)
        .attr("fill", "none")
        .attr("stroke", "#ff69b4")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x(d.year))
            .y(d => y(d.count))
        );

    // Add points
    svg.selectAll("circle")
        .data(yearData)
        .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 5)
        .attr("fill", "#00e0d3");

    // Tooltip
    const tooltip = d3.select("#casesOverTimeLineChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");

    svg.selectAll("circle")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#ff69b4");
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Year: ${d.year}<br>Cases: ${d.count}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#00e0d3");
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // X axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.bottom - 5)
        .text("Year")
        .style("fill", "#111")
        .style("font-size", 13);

    // Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Number of Cases")
        .style("fill", "#111")
        .style("font-size", 13);

    // Chart title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Cancer Cases Over Time");
}

function createAgeGroupAreaChart(data) {
    const ageGroups = [
        { label: '0-9', min: 0, max: 9 },
        { label: '10-19', min: 10, max: 19 },
        { label: '20-29', min: 20, max: 29 },
        { label: '30-39', min: 30, max: 39 },
        { label: '40-49', min: 40, max: 49 },
        { label: '50-59', min: 50, max: 59 },
        { label: '60-69', min: 60, max: 69 },
        { label: '70-79', min: 70, max: 79 },
        { label: '80+', min: 80, max: 200 }
    ];
    let yearAgeGroupCounts = {};
    data.forEach(d => {
        let year = extractYearFromAdmission(d["Date of Admission"]);
        if (!year) return;
        let age = +d.Age;
        let group = ageGroups.find(g => age >= g.min && age <= g.max);
        if (!group) return;
        if (!yearAgeGroupCounts[year]) yearAgeGroupCounts[year] = {};
        yearAgeGroupCounts[year][group.label] = (yearAgeGroupCounts[year][group.label] || 0) + 1;
    });
    const years = Object.keys(yearAgeGroupCounts).map(Number).sort((a, b) => a - b);
    if (years.length === 0) {
        d3.select('#ageGroupAreaChart').append('div').text('No admission date data available.');
        return;
    }
    const stackedData = years.map(year => {
        let entry = { year };
        ageGroups.forEach(g => {
            entry[g.label] = yearAgeGroupCounts[year] ? (yearAgeGroupCounts[year][g.label] || 0) : 0;
        });
        return entry;
    });
    const margin = {top: 30, right: 30, bottom: 50, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const svg = d3.select("#ageGroupAreaChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);
    const y = d3.scaleLinear()
        .domain([0, d3.max(stackedData, d => {
            let sum = 0;
            ageGroups.forEach(g => sum += d[g.label]);
            return sum;
        })])
        .range([height, 0]);
    const color = d3.scaleOrdinal()
        .domain(ageGroups.map(g => g.label))
        .range(d3.schemeCategory10);
    const stack = d3.stack()
        .keys(ageGroups.map(g => g.label));
    const series = stack(stackedData);
    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));
    svg.selectAll(".area")
        .data(series)
        .join("path")
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 1);
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Age Group: ${d.key}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.7);
            tooltip.transition().duration(500).style("opacity", 0);
        });
    const tooltip = d3.select("#ageGroupAreaChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.bottom - 5)
        .text("Year")
        .style("fill", "#111")
        .style("font-size", 13);
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Number of Patients")
        .style("fill", "#111")
        .style("font-size", 13);
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Age Group Distribution Over Time");
}

function createCriticalIndicatorsBubbleChart(data) {
    // Example: Bubble chart by Age Group and Gender, size = count, color = gender
    const ageGroups = [
        { label: '0-9', min: 0, max: 9 },
        { label: '10-19', min: 10, max: 19 },
        { label: '20-29', min: 20, max: 29 },
        { label: '30-39', min: 30, max: 39 },
        { label: '40-49', min: 40, max: 49 },
        { label: '50-59', min: 50, max: 59 },
        { label: '60-69', min: 60, max: 69 },
        { label: '70-79', min: 70, max: 79 },
        { label: '80+', min: 80, max: 200 }
    ];
    // Group by age group and gender
    let groupCounts = {};
    data.forEach(d => {
        let age = +d.Age;
        let gender = d.Gender || 'Unknown';
        let group = ageGroups.find(g => age >= g.min && age <= g.max);
        if (!group) return;
        let key = group.label + '-' + gender;
        groupCounts[key] = groupCounts[key] || { ageGroup: group.label, gender, count: 0 };
        groupCounts[key].count++;
    });
    const bubbleData = Object.values(groupCounts);
    if (bubbleData.length === 0) {
        d3.select('#criticalIndicatorsBubbleChart').append('div').text('No data available.');
        return;
    }
    const margin = {top: 30, right: 30, bottom: 50, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const svg = d3.select("#criticalIndicatorsBubbleChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // X: Age Group
    const x = d3.scalePoint()
        .domain(ageGroups.map(g => g.label))
        .range([0, width])
        .padding(0.5);
    // Y: Gender
    const genders = Array.from(new Set(bubbleData.map(d => d.gender)));
    const y = d3.scalePoint()
        .domain(genders)
        .range([height, 0])
        .padding(0.5);
    // Size: count
    const size = d3.scaleSqrt()
        .domain([0, d3.max(bubbleData, d => d.count)])
        .range([5, 40]);
    // Color: gender
    const color = d3.scaleOrdinal()
        .domain(genders)
        .range(["#00e0d3", "#ff69b4", "#ffd700"]);
    // Draw bubbles
    svg.selectAll("circle")
        .data(bubbleData)
        .join("circle")
        .attr("cx", d => x(d.ageGroup))
        .attr("cy", d => y(d.gender))
        .attr("r", d => size(d.count))
        .attr("fill", d => color(d.gender))
        .attr("opacity", 0.7)
        .attr("stroke", "#18181b");
    // Tooltip
    const tooltip = d3.select("#criticalIndicatorsBubbleChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");
    svg.selectAll("circle")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 1);
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Age Group: ${d.ageGroup}<br>Gender: ${d.gender}<br>Patients: ${d.count}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.7);
            tooltip.transition().duration(500).style("opacity", 0);
        });
    // X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill", "#111");
    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#111");
    // X axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.bottom - 5)
        .text("Age Group")
        .style("fill", "#111")
        .style("font-size", 13);
    // Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Gender")
        .style("fill", "#111")
        .style("font-size", 13);
    // Chart title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Critical Health Indicators: Age Group & Gender");
    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 120}, 10)`);
    genders.forEach((g, i) => {
        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", i * 25)
            .attr("r", 8)
            .attr("fill", color(g));
        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 25 + 5)
            .text(g)
            .style("fill", "#111")
            .style("font-size", 12);
    });
}

function createTestResultsBarChart(data) {
    // Count occurrences of each test result
    const resultCounts = {};
    data.forEach(d => {
        const result = (d["Test Results"] || "Unknown").trim();
        resultCounts[result] = (resultCounts[result] || 0) + 1;
    });
    const results = Object.keys(resultCounts);
    const counts = results.map(r => resultCounts[r]);
    const margin = {top: 30, right: 30, bottom: 50, left: 60};
    const width = 500 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    const svg = d3.select("#testResultsBarChart")
        .html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // X axis
    const x = d3.scaleBand()
        .domain(results)
        .range([0, width])
        .padding(0.2);
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    // Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(counts)])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    // Bars
    svg.selectAll("rect")
        .data(results)
        .join("rect")
        .attr("x", d => x(d))
        .attr("y", d => y(resultCounts[d]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(resultCounts[d]))
        .attr("fill", "#00e0d3")
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#ff69b4");
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`${d}: ${resultCounts[d]}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#00e0d3");
            tooltip.transition().duration(500).style("opacity", 0);
        });
    // Tooltip
    const tooltip = d3.select("#testResultsBarChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");
    // Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Number of Patients")
        .style("fill", "#111")
        .style("font-size", 14);
    // Chart title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Test Results Distribution");
}

function createAdmissionTypePieChart(data) {
    // Count occurrences of each admission type
    const typeCounts = {};
    data.forEach(d => {
        const type = (d["Admission Type"] || "Unknown").trim();
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const types = Object.keys(typeCounts);
    const pieData = types.map(type => ({ type, count: typeCounts[type] }));
    const width = 400, height = 400, radius = Math.min(width, height) / 2;
    const svg = d3.select("#admissionTypePieChart")
        .html("")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);
    const color = d3.scaleOrdinal()
        .domain(types)
        .range(d3.schemeSet2);
    const pie = d3.pie()
        .value(d => d.count);
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    // Tooltip
    const tooltip = d3.select("#admissionTypePieChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");
    svg.selectAll('path')
        .data(pie(pieData))
        .join('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.type))
        .attr('stroke', '#18181b')
        .style('stroke-width', '2px')
        .style('opacity', 0.85)
        .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 1);
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`${d.data.type}: ${d.data.count}`)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 0.85);
            tooltip.transition().duration(500).style('opacity', 0);
        });
    // Add labels
    svg.selectAll('text')
        .data(pie(pieData))
        .join('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .style('fill', '#111')
        .style('font-size', 14)
        .text(d => d.data.type);
    // Chart title
    svg.append('text')
        .attr('x', 0)
        .attr('y', -height/2 + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', '#111')
        .text('Admission Type Distribution');
}

function createMedicationUsageBarChart(data) {
    // Count occurrences of each medication
    const medCounts = {};
    data.forEach(d => {
        const med = (d["Medication"] || "Unknown").trim();
        medCounts[med] = (medCounts[med] || 0) + 1;
    });
    const meds = Object.keys(medCounts);
    const counts = meds.map(m => medCounts[m]);
    const margin = {top: 30, right: 30, bottom: 50, left: 60};
    const width = 500 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    const svg = d3.select("#medicationUsageBarChart")
        .html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // X axis
    const x = d3.scaleBand()
        .domain(meds)
        .range([0, width])
        .padding(0.2);
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    // Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(counts)])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    // Bars
    svg.selectAll("rect")
        .data(meds)
        .join("rect")
        .attr("x", d => x(d))
        .attr("y", d => y(medCounts[d]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(medCounts[d]))
        .attr("fill", "#ffd700")
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#ff69b4");
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`${d}: ${medCounts[d]}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#ffd700");
            tooltip.transition().duration(500).style("opacity", 0);
        });
    // Tooltip
    const tooltip = d3.select("#medicationUsageBarChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");
    // Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Number of Patients")
        .style("fill", "#111")
        .style("font-size", 14);
    // Chart title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Medication Usage");
}

function createAvgBillingBarChart(data, selectedDisease) {
    // Group by disease and calculate average billing
    const billing = {};
    data.forEach(d => {
        const disease = (d["Medical Condition"] || d.Disease || "Unknown").trim();
        const amount = parseFloat(d["Billing Amount"]);
        if (!isNaN(amount)) {
            if (!billing[disease]) billing[disease] = [];
            billing[disease].push(amount);
        }
    });
    const diseases = Object.keys(billing);
    const avgBilling = diseases.map(disease => ({
        disease,
        avg: billing[disease].reduce((a, b) => a + b, 0) / billing[disease].length
    }));
    // Sort so selected disease is first
    avgBilling.sort((a, b) => (a.disease === selectedDisease ? -1 : b.disease === selectedDisease ? 1 : 0));
    const margin = {top: 30, right: 30, bottom: 50, left: 80};
    const width = 500 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    const svg = d3.select("#avgBillingBarChart")
        .html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // X axis
    const x = d3.scaleBand()
        .domain(avgBilling.map(d => d.disease))
        .range([0, width])
        .padding(0.2);
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill", d => d === selectedDisease ? "#ffd700" : "#111")
        .style("font-size", 13);
    // Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(avgBilling, d => d.avg)])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    // Bars
    svg.selectAll("rect")
        .data(avgBilling)
        .join("rect")
        .attr("x", d => x(d.disease))
        .attr("y", d => y(d.avg))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.avg))
        .attr("fill", d => d.disease === selectedDisease ? "#ffd700" : "#00e0d3")
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#ff69b4");
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`${d.disease}: ₹${d.avg.toFixed(2)}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this).attr("fill", d.disease === selectedDisease ? "#ffd700" : "#00e0d3");
            tooltip.transition().duration(500).style("opacity", 0);
        });
    // Tooltip
    const tooltip = d3.select("#avgBillingBarChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");
    // Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Avg Billing Amount (₹)")
        .style("fill", "#111")
        .style("font-size", 14);
    // Chart title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Average Billing Amount by Disease");
}

function createGenderAdmissionStackedBarChart(data) {
    // Prepare data: count by gender and admission type
    const genders = Array.from(new Set(data.map(d => d.Gender)));
    const types = Array.from(new Set(data.map(d => d["Admission Type"])));
    // Build a matrix: {type, Male, Female, ...}
    const matrix = types.map(type => {
        const row = { type };
        genders.forEach(gender => {
            row[gender] = data.filter(d => d["Admission Type"] === type && d.Gender === gender).length;
        });
        return row;
    });
    const margin = {top: 30, right: 30, bottom: 50, left: 60};
    const width = 500 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    const svg = d3.select("#genderAdmissionStackedBarChart")
        .html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // X axis
    const x = d3.scaleBand()
        .domain(types)
        .range([0, width])
        .padding(0.2);
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    // Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(matrix, row => genders.reduce((sum, g) => sum + row[g], 0))])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#111")
        .style("font-size", 13);
    // Color
    const color = d3.scaleOrdinal()
        .domain(genders)
        .range(["#00e0d3", "#ff69b4", "#ffd700"]);
    // Stack
    const stack = d3.stack().keys(genders);
    const series = stack(matrix);
    // Bars
    svg.selectAll("g.layer")
        .data(series)
        .join("g")
        .attr("class", "layer")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", d => x(d.data.type))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", function(event, d) {
            const gender = this.parentNode.__data__.key;
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`${gender} - ${d.data.type}: ${d.data[gender]}`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });
    // Tooltip
    const tooltip = d3.select("#genderAdmissionStackedBarChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("color", "white");
    // Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height/2)
        .text("Number of Patients")
        .style("fill", "#111")
        .style("font-size", 14);
    // Chart title
    svg.append("text")
        .attr("x", width/2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#111")
        .text("Gender vs. Admission Type");
    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 120}, 10)`);
    genders.forEach((g, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", color(g));
        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 12)
            .text(g)
            .style("fill", "#111")
            .style("font-size", 12);
    });
}

