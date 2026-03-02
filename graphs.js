const svg = d3.select("#chart");
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const xScale = d3.scaleTime().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);
const line = d3.line().x(d => xScale(d.date)).y(d => yScale(d.close));
let selectedRangeDays = 30; // default: 1 month
const color = d3.scaleOrdinal(d3.schemeCategory10);

g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
g.append("g").attr("class", "y-axis");

const testdata = [
    {
        symbol: "AAA",
        values: generateTrendData({
            days: 400,
            startPrice: 80,
            trend: "up",
            volatility: 1.2
        })
    },
    {
        symbol: "BBB",
        values: generateTrendData({
            days: 400,
            startPrice: 220,
            trend: "down",
            volatility: 1.5
        })
    },
    {
        symbol: "CCC",
        values: generateTrendData({
            days: 400,
            startPrice: 120,
            trend: "flat",
            volatility: 0.8
        })
    }
];


function generateTrendData({
                               days = 365,
                               startPrice = 100,
                               trend = "flat", // "up" | "down" | "flat"
                               volatility = 1, // daily randomness
                           }) {
    let drift;

    switch (trend) {
        case "up":
            drift = 0.05;   // +$0.05 per day
            break;
        case "down":
            drift = -0.05;  // -$0.05 per day
            break;
        default:
            drift = 0;
    }

    let price = startPrice;
    const today = new Date();

    return d3.range(days).map(i => {
        const noise = d3.randomNormal(0, volatility)();
        price = Math.max(1, price + drift + noise);

        return {
            date: d3.timeDay.offset(today, -days + i),
            close: +price.toFixed(2)
        };
    });
}

function filterStockByRange(stock, days) {
    const cutoff = d3.timeDay.offset(new Date(), -days);

    return {
        symbol: stock.symbol,
        values: stock.values.filter(d => d.date >= cutoff)
    };
}

function getFilteredStocks() {
    return stocks.map(stock => filterStockByRange(stock, selectedRangeDays));
}


function addStock(stock) {
    if (stocks.find(s => s.symbol === stock.symbol)) return;
    stocks.push(stock);
    updateChart(stocks);
}

function loadTestStock(symbol) {
    return testdata.find(d => d.symbol === symbol) || null;
}

const stocks = [];

function updateChart(stocks) {
    if (stocks.length === 0) {
        g.selectAll(".stock-line").remove();
        updateLegend(stocks);
        return;
    }

    const allValues = stocks.flatMap(d => d.values);

    xScale.domain(d3.extent(allValues, d => d.date));
    yScale.domain([
        d3.min(allValues, d => d.close),
        d3.max(allValues, d => d.close)
    ]);

    g.select(".x-axis").call(d3.axisBottom(xScale));
    g.select(".y-axis").call(d3.axisLeft(yScale));

    const stockLines = g.selectAll(".stock-line")
        .data(stocks, d => d.symbol);

    stockLines.enter()
        .append("path")
        .attr("class", "stock-line")
        .merge(stockLines)
        .attr("stroke", d => color(d.symbol))
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("d", d => line(d.values));

    stockLines.exit().remove();

    updateLegend(stocks);
}

function updateLegend(stocks) {
    const legend = d3.select("#legend")
        .selectAll("li")
        .data(stocks, d => d.symbol);

    legend.exit().remove();
}

// async function fetchStock(symbol) {
//     // Replace with real API later
//     return {
//         symbol,
//         values: d3.range(30).map(i => ({
//             date: d3.timeDay.offset(new Date(), -i),
//             close: 100 + Math.random() * 50
//         })).reverse()
//     };
// }

function exportChartState() {
    return {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        chart: {
            type: "line",
            rangeDays: selectedRangeDays,
            xField: "date",
            yField: "close"
        },
        stocks: stocks.map(stock => ({
            symbol: stock.symbol,
            color: color(stock.symbol),
            values: stock.values.map(d => ({
                date: d.date.toISOString().slice(0, 10),
                close: d.close
            }))
        }))
    };
}

function importChartState(payload) {
    if (!payload || payload.version !== "1.0") {
        alert("Unsupported chart format");
        return;
    }

    if (!Array.isArray(payload.stocks)) {
        alert("Invalid chart data");
        return;
    }

    selectedRangeDays = payload.chart.rangeDays;

    stocks.length = 0;

    payload.stocks.forEach(stock => {
        stocks.push({
            symbol: stock.symbol,
            values: stock.values.map(d => ({
                date: new Date(d.date),
                close: +d.close
            }))
        });
    });

    updateChart(getFilteredStocks());
}


const importButton = document.getElementById("import-json");
const importFileInput = document.getElementById("import-file");

importButton.addEventListener("click", () => {
    importFileInput.click();
});

importFileInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        try {
            const payload = JSON.parse(e.target.result);
            importChartState(payload);
        } catch (err) {
            alert("Invalid chart file");
            console.error(err);
        }
    };

    reader.readAsText(file);

    // Reset input so importing the same file twice works
    importFileInput.value = "";
});


document.getElementById("add-stock").addEventListener("click", () => {
    const symbol = document.getElementById("symbol-input").value.toUpperCase();
    if (!symbol) return;

    const stock = loadTestStock(symbol);
    if (!stock) {
        alert("Stock not found in test data");
        return;
    }

    addStock(stock);
});

document.querySelectorAll("#range-controls button")
    .forEach(button => {
        button.addEventListener("click", () => {
            selectedRangeDays = +button.dataset.range;
            updateChart(getFilteredStocks());
        });
    });

document.getElementById("export-json").addEventListener("click", () => {
    const payload = exportChartState();
    const blob = new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-chart.json";
    a.click();
    URL.revokeObjectURL(url);
});


stocks.push(...testdata);
updateChart(getFilteredStocks());