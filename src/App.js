import React from 'react';
import './App.css';

import request from 'superagent';
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

const API_KEY = process.env.REACT_APP_API_KEY;
const GET_PREFECTURES_URL = 'https://opendata.resas-portal.go.jp/api/v1/prefectures';
const GET_POPULATION_COMPOSITION_URL = 'https://opendata.resas-portal.go.jp/api/v1/population/composition/perYear';

const POINT_START = 1960;
const POINT_INTERVAL = 5;

const CONNECTION_ERROR_MESSAGE = '通信に失敗しました。';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      prefectures: [],
      checked: [],
      series: [],
      message: ''
    };

    request
      .get(GET_PREFECTURES_URL)
      .set('X-API-KEY', API_KEY)
      .then(res => {
        if (res.body.result === undefined) {
          this.setState({
            message: CONNECTION_ERROR_MESSAGE
          });
          return;
        }
        
        this.setState({
          prefectures: res.body.result
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({
          message: CONNECTION_ERROR_MESSAGE
        });
      });
  }

  _changeSelection(index) {
    const pref = this.state.prefectures[index];
    const prefCode = pref.prefCode;
    const checkedList = this.state.checked;
    const seriesList = this.state.series;

    this.setState({
      message: ''
    });

    const checkedIndex = checkedList.indexOf(prefCode);
    if (checkedIndex === -1) {

      request
        .get(GET_POPULATION_COMPOSITION_URL)
        .set('X-API-KEY', API_KEY)
        .query({
          prefCode: prefCode,
          cityCode: '-'
        })
        .then(res => {
          if (res.body.result === undefined) {
            this.setState({
              message: CONNECTION_ERROR_MESSAGE
            });
            return;
          }

          let totalPopulation = [];
          for (const d of res.body.result.data) {
            if (d.label === '総人口') {
              totalPopulation = d.data;
              break;
            }
          }

          const firstYear = totalPopulation[0].year;
          if (firstYear !== POINT_START) {
            if (firstYear > POINT_START) {
              const count = (firstYear - POINT_START) / POINT_INTERVAL;
              for (let i = 0; i < count; i++) {
                totalPopulation.unshift({
                  value: null
                });
              }
            }
            else {
              const count = (POINT_START - firstYear) / POINT_INTERVAL;
              for (let i = 0; i < count; i++) {
                totalPopulation.shift();
              }
            }
          }

          let data = [];
          for (const tp of totalPopulation) {
            data.push(tp.value);
          }

          checkedList.push(prefCode);

          seriesList.push({
            name: pref.prefName,
            code: pref.prefCode,
            data: data
          });

          this.setState({
            checked: checkedList,
            series: seriesList
          });
        })
        .catch(err => {
          console.log(err);

          this.setState({
            message: CONNECTION_ERROR_MESSAGE
          });
        });
    }
    else {
      checkedList.splice(checkedIndex, 1)

      for (const [i, v] of seriesList.entries()) {
        if (v.code === prefCode) {
          seriesList.splice(i, 1);
          break;
        }
      }

      this.setState({
        checked: checkedList,
        series: seriesList
      });
    }
  }

  renderPrefectures(pref, index) {
    return(
    <span className="pref_item" key={pref.prefCode}>
      <input 
        type="checkbox" 
        checked={this.state.checked.indexOf(pref.prefCode) !== -1} 
        onChange={this._changeSelection.bind(this, index)} 
        value={pref.prefCode} 
      />{pref.prefName}
    </span>
    );
  }

  render() {

    const options = {
      title: {
        text: '都道府県別人口推移'
      },
      yAxis: {
        title: {
          text: '人口'
        }
      },
      xAxis: {
        title: {
          text: '年'
        }
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle'
      },
      plotOptions: {
        series: {
          pointStart: POINT_START,
          pointInterval: POINT_INTERVAL
        }
      },
      series: this.state.series
    };
    return (
      <div>
        <h1>都道府県別人口推移</h1>
        <div className="error_message">{this.state.message}</div>
        {this.state.prefectures.map((value, index) => this.renderPrefectures(value, index))}

        <div className="chart">
          <HighchartsReact highcharts={Highcharts} options={options}/>
        </div>
      </div>
    );
  }
}

export default App;
