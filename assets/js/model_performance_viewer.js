/**
 * Created by eamonnmaguire on 05/01/15.
 */

var ModelViewer = {};

ModelViewer.colors = d3.scale.category10();
ModelViewer.date_format = d3.time.format("%d/%m/%y %H:%M");

ModelViewer.functions = {

    /**
     *
     * @param data_url
     * @param placement
     * @param legend
     * @param width
     * @param height
     */
    draw_chart: function (data_url, placement, legend, width, height) {
        d3.json(data_url, function (data) {
            ModelViewer.functions.render(data, placement, width, height);
            ModelViewer.functions.draw_legend(data, legend);
        });
    },

    /**
     *
     * @param data
     * @param placement
     */
    draw_legend: function (data, placement) {
        var data_summary = {};
        data.model_results.forEach(function (d) {
            if (Object.keys(data_summary).indexOf(d.model) == -1) {
                data_summary[d.model] = {}
            }
            data_summary[d.model][d.time] = d.value;
        });

        var table = d3.select(placement).append("table").attr("class", "legend-table").style("table-layout", "fixed");
        var tbody = table.append("tbody");

        var row = tbody.selectAll("tr")
            .data(Object.keys(data_summary))
            .enter()
            .append("tr").attr("id", function (d) {
                return d.replace(/\s+/, "");
            }).attr("class", "model-legend-item");

        // create a cell in each row for each column
        row.append("td").attr("id", function (d) {
            return "icon-" + d.replace(/\s+/, "");
        });

        row.append("td").attr("id", function (d) {
            return "text-" + d.replace(/\s+/, "");
        }).text(function (d) {
            return d;
        });

        row.append("td").attr("id", function (d) {
            return "plot-" + d.replace(/\s+/, "");
        });

        var min_max_values = d3.extent(data.model_results, function (d) {
            return d.value;
        });

        var mini_plot_height = 15;

        var y_scale = d3.scale.linear().domain([0, min_max_values[1]]).range([mini_plot_height, 0]);
        var x_scale = d3.time.scale().domain(d3.extent(data.data, function (d) {
            return new Date(d.time);
        })).range([0, 100]);

        for (var data_key in data_summary) {

            d3.select("#icon-" + data_key.replace(/\s+/, "")).append("svg").attr({
                "width": 10,
                "height": 20
            }).append("circle")
                .attr("r", 3)
                .attr({"cx": 5, "cy": 10})
                .style("fill", function (d) {
                    return ModelViewer.colors(d);
                });

            var sub_plot = d3.select("#plot-" + data_key.replace(/\s+/, "")).append("svg").attr({
                "width": 140,
                "height": 20
            });

            sub_plot.append("rect").attr({
                "width": 105,
                "height": 1,
                "x": 0,
                "y": mini_plot_height
            }).style("fill", "#ccc");

            var value_extent = d3.extent(data.data, function (d) {
                return d.value;
            });

            var value_y_scale = d3.scale.linear().domain([0, value_extent[1]]).range([mini_plot_height, 0]);

            var line = d3.svg.line()
                .x(function (d) {
                    return x_scale(new Date(d.time));
                })
                .y(function (d) {
                    return value_y_scale(d.value);
                });

            sub_plot.append("path")
                .datum(data.data)
                .attr("class", "line")
                .attr("d", line)
                .style({"fill": "none", "stroke": "#ECF0F1"});

            sub_plot.selectAll("rect")
                .data(data.data)
                .enter()
                .append("rect")
                .attr("width", 1)
                .attr("height", function (d) {
                    if (Object.keys(data_summary[data_key]).indexOf(d.time) != -1) {
                        return mini_plot_height - y_scale(data_summary[data_key][d.time]);
                    } else {
                        return 0;
                    }
                }).attr("x", function (d) {
                    return x_scale(new Date(d.time));
                }).attr("y", function (d) {

                    if (Object.keys(data_summary[data_key]).indexOf(d.time) != -1) {
                        return y_scale(data_summary[data_key][d.time]);
                    } else {
                        return 0;
                    }

                }).style("fill", "#7F8C8D");
        }

        $(".model-legend-item").bind('click', function () {
            var item_id = this.id;
            d3.selectAll("." + this.id).transition().duration(300).style("opacity", function () {
                var opacity = d3.select(this).style("opacity") == 0 ? 1 : 0;
                d3.select("#" + item_id).transition().duration(300).style("opacity", opacity == 0 ? 0.4 : 1);
                return opacity;
            });
        })
    },

    /**
     *
     * @param svg
     * @param data
     * @param height
     * @param x_scale
     */
    draw_time_series: function (svg, data, height, x_scale) {
        var value_extent = d3.extent(data.data, function (d) {
            return d.value;
        });

        var value_y_scale = d3.scale.linear().domain([0, value_extent[1]]).range([height, 0]);

        var line = d3.svg.line()
            .x(function (d) {
                return x_scale(new Date(d.time));
            })
            .y(function (d) {
                return value_y_scale(d.value);
            });

        svg.append("path")
            .datum(data.data)
            .attr("class", "line")
            .attr("d", line)
            .style({"fill": "none", "stroke": "#BDC3C7"});

        svg.append("g")
            .attr("class", "y axis")
            .call(d3.svg.axis()
                .scale(value_y_scale)
                .orient("left"))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -30)
            .style("text-anchor", "end")
            .text(data.data_type);
    },

    /**
     *
     * @param d
     * @returns {string}
     */
    get_date_key: function (d) {
        var date = new Date(d.time);
        return "detail-" + date.getMonth() + date.getYear() + date.getDay() + date.getHours() + date.getMinutes();
    },

    /**
     *
     * @param svg
     * @param data
     * @param x_scale
     * @param height
     */
    create_hover_line: function (svg, data, x_scale, height) {
        var hover_line_node = svg.selectAll("g.hover-line").data(data.model_results).enter();

        hover_line_node.append("line").attr("x1", function (d) {
            return x_scale(new Date(d.time));
        }).attr("y1", 0).attr("y2", height).attr("x2", function (d) {
            return x_scale(new Date(d.time));
        }).style("stroke", "#ECF0F1")
            .attr("class", function (d) {
                return ModelViewer.functions.get_date_key(d) + " hidden";
            });

        hover_line_node.append("text").text(function (d) {
            return ModelViewer.date_format(new Date(d.time));
        }).style("text-anchor", "right")
            .attr("dy", -10)
            .attr("dx", function (d) {
                return x_scale(new Date(d.time)) - 35;
            })
            .attr("class", function (d) {
                return ModelViewer.functions.get_date_key(d) + " hidden time-text";
            });
    }, /**
     *
     * @param data
     * @param placement
     * @param width
     * @param height
     */
    render: function (data, placement, width, height) {
        //var data = d3.range(200).map(Math.random);
        var margin = {top: 20, right: 50, bottom: 40, left: 50};

        width = width - margin.left - margin.right;
        height = height + margin.top + margin.bottom;

        var x_scale = d3.time.scale().domain(d3.extent(data.data, function (d) {
            return new Date(d.time);
        })).range([0, width]);


        var svg = d3.select(placement).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.svg.axis()
                .scale(x_scale)
                .orient("bottom"));

        ModelViewer.functions.draw_time_series(svg, data, height, x_scale);

        var values = data.model_results.map(function (d) {
            return d.value;
        });

        var percentiles = ModelViewer.functions.calculate_percentile(values);

        var model_value_extent = d3.extent(percentiles, function (d) {
            return d.percentile;
        });

        var percentile_map = {};
        percentiles.forEach(function (d) {
            percentile_map[d.value] = d.percentile;
        });

        var model_y_scale = d3.scale.linear().domain([0, model_value_extent[1]]).range([height, 0]);

        svg.append("g")
            .attr("class", "y axis")
            .call(d3.svg.axis()
                .scale(model_y_scale)
                .orient("right"))
            .attr("transform", "translate(" + width + ", 0)")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 35)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Model Result (%ile)");

        ModelViewer.functions.create_hover_line(svg, data, x_scale, height);

        var dataItems = svg.selectAll("g.node").data(data.model_results);

        var dotGroup = dataItems.enter().append("g").attr("class", "node")
            // this is how we set the position of the items. Translate is an incredibly useful function for rotating and positioning items
            .attr('transform', function (d) {
                return "translate(" + x_scale(new Date(d.time)) + "," + model_y_scale(percentile_map[d.value]) + ")";
            })
            .attr("class", function (d) {
                return d.model.replace(/\s+/, "")
            });

        dotGroup.on("mouseover", function (d) {
            var detail_class = ModelViewer.functions.get_date_key(d);
            d3.selectAll("." + detail_class).classed("hidden", false);
        });

        dotGroup.on("mouseout", function (d) {
            var detail_class = ModelViewer.functions.get_date_key(d);
            d3.selectAll("." + detail_class).classed("hidden", true);
        });

        // we add our first graphics element! A circle!
        dotGroup.append("circle")
            .attr("r", 3)
            .attr("class", "dot")
            .style("fill", function (d) {
                return ModelViewer.colors(d.model)
            });

        // now we add some text, so we can see what each item is
        dotGroup.append("text")
            .attr("dy", 4)
            .attr("dx", 8)
            .attr("class", function (d) {
                return ModelViewer.functions.get_date_key(d) + " hidden detail-text";
            })
            .style("font-size", "0.6em")
            .text(function (d) {
                return d.value + " (" + d3.round(percentile_map[d.value], 2) + " %ile)";
            });
    },

    /**
     *
     * @param values
     * @returns {Array}
     */
    calculate_percentile: function (values) {
        var copy, result;
        var formula = function (rank, sampleSize) {
            return (rank - 0.5) / sampleSize;
        };

        var length = values.length;
        copy = values.slice(0);
        copy.sort(function (a, b) {
            return a - b;
        });

        var dictionary = {};
        for (var i = 0; i < length; i += 1) {
            dictionary[copy[i]] = formula(i + 1, length);
        }

        result = [];
        for (var i = 0; i < length; i += 1) {
            result.push({"value": copy[i], "percentile": dictionary[copy[i]]});
        }
        return result;
    }
}
