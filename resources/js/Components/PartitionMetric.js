import { useEffect, useState } from "react";
import { Chart, ArcElement, DoughnutController } from 'chart.js';

import Card from "./Card";
import LoadingView from "./LoadingView";

Chart.register(ArcElement, DoughnutController);

export default function PartitionMetric({ name, graphql_query, ranges, relation }) {
    const [data, setData] = useState(null);
    const [selectedRange, setSelectedRange] = useState(ranges[0].key);
    const [chartRef, setChartRef] = useState(null);
    const [relationData, setRelationData] = useState([]);
    const [selectedRelationId, setSelectedRelationId] = useState(0);

    useEffect(() => {
        if(! relation) { return; }

        Api.query(relation.graphql_query + `{ id ${relation.display_using} }`)
            .then(({data}) => {
                setRelationData(data.data[relation.graphql_query])
                setSelectedRelationId(data.data[relation.graphql_query][0].id)
            })
            .catch(console.error)
    }, [])

    useEffect(() => {
        setData(null);

        if(relation) {
            if (selectedRelationId) {
                Api.query(graphql_query + `(range: """${selectedRange}""" ${relation.foreign_key}: ${selectedRelationId})`)
                    .then(({data}) => setData(JSON.parse(data.data[graphql_query])))
                    .catch(console.error)
            }

            return;
        }
        
        Api.query(graphql_query, selectedRange)
            .then(({data}) => setData(JSON.parse(data.data[graphql_query])))
            .catch(console.error)
    }, [selectedRelationId, selectedRange])

    useEffect(() => {
        if(data == null) { return; }
        
        if(chartRef != null) {
            chartRef.destroy()
        }

        const ctx = document.getElementById(graphql_query).getContext('2d');
        setChartRef(new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                  data: data.map(item => item.value),
                  backgroundColor: Engine.colors().map(color => color.hex),
                  cutout: '75%',
                  borderWidth: 0
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        enabled: false,
                    }
                }
            }
        }));
    }, [data]);

    if(data == null) {
        return (
            <Card className="relative">
                <LoadingView  />
            </Card>
        )
    }

    let total = _.sumBy(data, 'value');

    return ( 
        <Card className="relative">
            <div className="px-6 py-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                        <h3 className="mr-2 text-base text-gray-700 font-bold">{ name }</h3>

                        {relation && relationData && <select className="ml-auto min-w-24 h-8 text-xs border-none appearance-none pl-2 pr-6 active:outline-none active:shadow-outline focus:outline-none focus:shadow-outline"
                            name="relation"
                            value={selectedRelationId}
                            onChange={(e) => {setSelectedRelationId(e.target.value)}}>
                            {relationData.map(relationItem => <option key={relationItem.id} value={relationItem.id}>{relationItem[relation.display_using]}</option>)}
                        </select>}
                    </div>

                    <select className="ml-auto min-w-24 h-8 text-xs border-none appearance-none bg-gray-100 pl-2 pr-6 rounded active:outline-none active:shadow-outline focus:outline-none focus:shadow-outline"
                        name="range"
                        value={selectedRange}
                        onChange={(e) => {setSelectedRange(e.target.value)}}>
                        {ranges.map(range => <option key={range.key} value={range.key}>{range.name}</option>)}
                    </select>
                </div>

                <div className="absolute w-20 h-20" style={{right: '35px', top: '40%'}}>
                    <canvas id={graphql_query}></canvas>
                </div>

                <div className="min-h-22">
                    <div className="overflow-hidden overflow-y-auto max-h-22">
                        <ul className="list-reset">
                            {data.map((item, index) => <li key={index} className="text-xs text-gray-700 leading-normal">
                                <span className={`inline-block rounded-full w-2 h-2 mr-2 ${Engine.getTailwindColor(index)}`} />
                                {item.label} ({AppCurrency} {item.value} - {total > 0 && Engine.formatNumber(item.value * 100 / total) + "%"})
                            </li>)}
                        </ul>
                    </div>
                </div>
            </div>
        </Card>
    );
}