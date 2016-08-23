import Promise from 'bluebird';
import StateEngine from '../../src/contractStateEngine';
import { name, directory } from '../test_contracts/config';
import Web3 from 'web3';
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const join = Promise.join;

const Contract = require(`${directory}/${name}.deployed.json`);

import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';


// // Create New ContractStateEngine;
//
// let engine = new StateEngine({
//   name,
//   abi : JSON.parse(Contract['interface']),
//   address : Contract['txReceipt']['contractAddress'],
//   web3,
//   sendObject : {
//     from : web3.eth.accounts[0],
//     value : 0,
//     gas : 4712388
//   }
// });
//
//
//
// // Setup Redux Store;
//
// const store = createStore(engine.reducer, applyMiddleware(thunk));
//
// // dispatch engine initState, getEvents, and watchEvents first
// store.dispatch(engine.initState());
// store.dispatch(engine.getEvents());
// store.dispatch(engine.watchEvents());
// store.dispatch(engine.send('newCase', [["0xbd9611ea1674f2e4b1784e7a923675f65ea07afe", "0x24d24bb4e500cdc31ae4f508acff2494ec5f14ae"]], 3));
//
// Promise.delay(15000).then(() => {
//   let state = store.getState();
//   console.log(state);
//
//   // optionally stop listening to events -- use in componentWillUnmount() React Component Life Cycle
//   engine.events.stopWatching();
// });


const ExchangeContract = `0x1b6b5407af0e6d104457360b321c6fe1d68b7325`;
const CasesContract = `0x6ce5f93a6e4baf569f9b20b17d0a2a4cd28b88c0`; // This contract is just a default token-- not necessary in production


let TokenExchange = new StateEngine({
    name : `Exchange`,
    abi : [{"constant":false,"inputs":[{"name":"_token","type":"address"},{"name":"_bidID","type":"bytes32"},{"name":"_quantity","type":"uint256"},{"name":"_price","type":"uint256"}],"name":"settleAsk","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_token","type":"address"},{"name":"_quantity","type":"uint256"},{"name":"_price","type":"uint256"}],"name":"newAsk","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_live","type":"bool"}],"name":"setExchangeStatus","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_bidID","type":"bytes32"}],"name":"deleteBid","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_admin","type":"address"}],"name":"addAdmin","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_token","type":"address"},{"name":"_quantity","type":"uint256"},{"name":"_price","type":"uint256"}],"name":"newBid","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":true,"inputs":[{"name":"_bidID","type":"bytes32"}],"name":"getBid","outputs":[{"name":"_id","type":"bytes32"},{"name":"_buyer","type":"address"},{"name":"_token","type":"address"},{"name":"_quantity","type":"uint256"},{"name":"_price","type":"uint256"},{"name":"_dateIssued","type":"uint256"},{"name":"_open","type":"bool"}],"type":"function"},{"constant":true,"inputs":[],"name":"live","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":true,"inputs":[{"name":"_askID","type":"bytes32"}],"name":"getAsk","outputs":[{"name":"_id","type":"bytes32"},{"name":"_seller","type":"address"},{"name":"_token","type":"address"},{"name":"_quantity","type":"uint256"},{"name":"_price","type":"uint256"},{"name":"_dateIssued","type":"uint256"},{"name":"_open","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_token","type":"address"},{"name":"_askID","type":"bytes32"},{"name":"_quantity","type":"uint256"},{"name":"_price","type":"uint256"}],"name":"settleBid","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_askID","type":"bytes32"}],"name":"deleteAsk","outputs":[{"name":"","type":"bool"}],"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_token","type":"address"},{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_id","type":"bytes32"},{"indexed":false,"name":"_quantity","type":"uint256"},{"indexed":false,"name":"_price","type":"uint256"},{"indexed":false,"name":"_date","type":"uint256"}],"name":"NewAsk","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_token","type":"address"},{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_id","type":"bytes32"},{"indexed":false,"name":"_quantity","type":"uint256"},{"indexed":false,"name":"_price","type":"uint256"},{"indexed":false,"name":"_date","type":"uint256"}],"name":"NewBid","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_token","type":"address"},{"indexed":true,"name":"_id","type":"bytes32"},{"indexed":false,"name":"_quantity","type":"uint256"},{"indexed":false,"name":"_price","type":"uint256"},{"indexed":false,"name":"_date","type":"uint256"}],"name":"SettledTrade","type":"event"}],
    address : ExchangeContract,
    web3,
    sendObject : {
      from : web3.eth.accounts[0],
      value : 0,
      gas : 4712388
    }
  });

let Cases = new StateEngine({
    name : `Cases`,
    abi : [{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"ok","type":"bool"}],"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"supply","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"ok","type":"bool"}],"type":"function"},{"constant":true,"inputs":[{"name":"who","type":"address"}],"name":"balanceOf","outputs":[{"name":"value","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"transfer","outputs":[{"name":"ok","type":"bool"}],"type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"_allowance","type":"uint256"}],"type":"function"},{"inputs":[{"name":"initial_balance","type":"uint256"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}],
    address : CasesContract,
    web3,
    sendObject : {
      from : web3.eth.accounts[0],
      value : 0,
      gas : 4712388
    }
  });


const reducer = combineReducers({ "contracts" : Cases.reducer});
const store = createStore(reducer, applyMiddleware(thunk));


function initContracts() {
  return (dispatch) => {
    dispatch(TokenExchange.initState());
    // dispatch(TokenBase.initState());
  }
}

function watchEvents(){
  return (dispatch) => {
    setInterval(() => {
      let _state = store.getState();
      console.log(JSON.stringify(_state, null, 2));

      dispatch(TokenExchange.getEvents());
      // dispatch(TokenExchange.watchEvents());
      // dispatch(TokenBase.getEvents());
      // dispatch(TokenBase.watchEvents());
    }, 5000);
  }
}



store.dispatch(initContracts());
store.dispatch(watchEvents());
