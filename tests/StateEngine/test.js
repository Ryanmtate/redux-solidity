import Promise from 'bluebird';
import { default as StateEngine } from '../../dist/StateEngine';
import { name, directory } from '../test_contracts/config';
import Web3 from 'web3';
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const join = Promise.join;

const Contract = require(`${directory}/${name}.deployed.json`);

import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';


// Create New ContractStateEngine;

let engine = new StateEngine({
  name,
  abi : JSON.parse(Contract['interface']),
  address : Contract['txReceipt']['contractAddress'],
  web3,
  sendObject : {
    from : web3.eth.accounts[0],
    value : 0,
    gas : 4712388
  }
});



// Setup Redux Store;

const store = createStore(engine.reducer, applyMiddleware(thunk));

// dispatch engine initState, getEvents, and watchEvents first
store.dispatch(engine.initState());
store.dispatch(engine.getEvents());
store.dispatch(engine.watchEvents());
store.dispatch(engine.send('newCase', [["0xbd9611ea1674f2e4b1784e7a923675f65ea07afe", "0x24d24bb4e500cdc31ae4f508acff2494ec5f14ae"]], 3));

Promise.delay(15000).then(() => {
  let state = store.getState();
  console.log(state);

  // optionally stop listening to events -- use in componentWillUnmount() React Component Life Cycle
  engine.events.stopWatching();
});
