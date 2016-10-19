import Promise from 'bluebird';
import async from 'async';
const join = Promise.join;
const using = Promise.using;

export default class StateEngine {
  constructor(options){
    this.web3 = options.web3;
    this.eth = Promise.promisifyAll(options['web3']['eth']);
    this.contractName = options.contractName;
    this.sendObject = options.sendObject;
    this.abi = options.abi;
    this.address = options.address;
    this.deployedBlockNumber = options.deployedBlockNumber || 0;
    this.abi && this.address ?
      this.contract = this.eth.contract(this.abi).at(this.address):
      this.contract = null;
    this.contract ?
      this.events = this.contract.allEvents({fromBlock : this.deployedBlockNumber, toBlock : 'latest'}) :
      null;
  }


  abiNames() {
    return new Promise((resolve, reject) => {
      let names = [];
      async.forEach(this.abi, (a, cb) => {
        if(!a['name']){
          cb();
        } else {
          names.push(a['name']);
          cb();
        }
      }, (error) => {
        if(error){reject(error);}
        resolve(names);
      });
    })
  }

  eventNames() {
    return new Promise((resolve, reject) => {
      let names = [];
      Promise.resolve(this.abi).map((abi) => {
        if(abi['type'] == 'event'){
          names.push(abi['name']);
        }
      }).then(() => {
        resolve(names);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  watchEvents(_filterParams, _filterWindow, _eventType) {
    return (dispatch) => {
      const eventFunc = _eventType || this.contract.allEvents;
      if (!!_eventType) {
        this.events = eventFunc(_filterParams, _filterWindow);
      } else {
        this.events = eventFunc(_filterWindow);
      };

      this.events.watch((error, result) => {
        if(error){throw error;}
        let type = `LOG`;
        let method = `${result.event}`;

        let action = {type, result, method, contract : this.address}

        dispatch(action);
      });
    }
  }

  /**
   *
   */
  getEvents(_filterParams, _filterWindow, _eventType) {
    return (dispatch) => {
      const eventFunc = _eventType || this.contract.allEvents;
      if (!!_eventType) {
        this.events = eventFunc(_filterParams, _filterWindow);
      } else {
        this.events = eventFunc(_filterWindow);
      };

      this.events.get((error, logs) => {
        if(error){throw error;}
        Promise.resolve(logs).map((result) => {
          let type = `LOG`;
          let method = `${result.event}`;

          let action = {type, result, method, contract : this.address}

          dispatch(action);
        }).catch((error) => {
          throw error;
        });
      });
    }
  }

  setContract(abi, address) {
    return new Promise((resolve, reject) => {
      if(!abi || !address || address.length != 42){
        let error = new Error('Invalid ABI or Contract Address.');
        reject(error);
      } else {
        this.abi = abi;
        this.address = address;
        this.contract = this.eth.contract(this.abi).at(this.address);
        this.events = this.contract.allEvents({fromBlock : this.deployedBlockNumber, toBlock : 'latest'});
        this.promisify().then((contract) => {
          this.contract = contract;
          resolve(this.contract);
        }).catch((error) => {
          reject(error);
        });
      }
    });
  }

  promisify() {
    return new Promise((resolve, reject) => {
      this.abiNames().map((name) => {
        if(this.contract[name] && this.contract[name]['request']){
            this.contract[name] = Promise.promisifyAll(this.contract[name]);
        }
      }).then(() => {
        resolve(this.contract);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  getTransactionReceipt(txHash) {
    return new Promise((resolve, reject) => {
      Promise.delay(2000).then(() => {
        return this.eth.getTransactionReceiptAsync(txHash);
      }).then((txReceipt) => {
        if(!txReceipt){
          return this.getTransactionReceipt(txHash);
        } else {
          resolve(txReceipt);
        };
      }).then((txReceipt) => {
        resolve(txReceipt);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  send(method, params, value) {
    return (dispatch) => {
      const type = method.replace(/([A-Z])/g, '_$1').toUpperCase();

      this.actionTypes().then((types) => {
        if(types.indexOf(type) == -1){
          let error = new Error(`METHOD NOT FOUND: ${method}`);
          throw error;
        } else {
          return this.promisify();
        }
      }).then((contract) => {
        this.contract = contract;
        let numInputs;
        let inputs = Object.keys(this.contract[method])[5];

        if(inputs.length){
          if(inputs.match(/,/g)){
            numInputs = inputs.match(/,/g).length + 1;
          } else {
            numInputs = 1;
          }
        }

        if(numInputs != params.length){
          let error = new Error(`Invalid Number of Inputs. Expected ${numInputs} inputs, but found ${params.length}.`);
          throw error;
        } else {
          this.sendObject['value'] = value || 0;
          return this.contract[method].sendTransactionAsync(...params, this.sendObject);
        }

      }).then((txHash) => {
        dispatch({type, result : txHash, method : `_${method}`, contract : this.address});
        return this.getTransactionReceipt(txHash);
      }).then((result) => {
        dispatch({type, result, method : `_${method}`, contract : this.address});
        return Promise.delay(15000);
      }).then(() => {
        dispatch({type, result : undefined, method : `_${method}`, contract : this.address});
      }).catch((error) => {
        dispatch({type, result : error, method : `_${method}`, contract : this.address});
      });
    }
  }

  call(method, params) {
    return (dispatch) => {
      const type = method.replace(/([A-Z])/g, '_$1').toUpperCase();

      this.actionTypes().then((types) => {
        if(types.indexOf(type) == -1){
          let error = new Error(`METHOD NOT FOUND: ${method}`);
          throw error;
        } else {
          return this.promisify();
        }
      }).then((contract) => {
        this.contract = contract;
        let numInputs = 0;
        let inputs = Object.keys(this.contract[method])[5];

        if(inputs.length){
          if(inputs.match(/,/g)){
            numInputs = inputs.match(/,/g).length + 1;
          } else {
            numInputs = 1;
          }
        }

        if(numInputs != params.length){
          let error = new Error(`Invalid Number of Inputs. Expected ${numInputs} inputs, but found ${params.length}.`);
          throw error;
        } else {
          return this.contract[method].callAsync(...params, this.sendObject);
        }

      }).then((result) => {
        dispatch({type, result, method : `_${method}`, contract : this.address});
      }).catch((error) => {
        throw error;
      });
    }
  }

  reducer(state = {}, action) {
    switch(action.type){
      case 'INIT_STATE':
        state['undefined'] ? state = null : null;
        return {
          ...state,
          [action.contract] : action.result
        };
        break;
      case 'LOG':
        state['undefined'] ? state = null : null;
        !state[action.contract]['LOGS'] ? state[action.contract]['LOGS'] = {} : null;
        return {
          ...state,
          [action.contract] : {
            ...state[action.contract],
            'LOGS' : {
              ...state[action.contract]['LOGS'],
              [action.method] : {
                ...state[action.contract]['LOGS'][action.method],
                [action.result['transactionHash']] : action.result['args']
              }
            }
          }
        };
        break;
      case action.type:
        return {
          ...state,
          [action.contract] : {
            ...state[action.contract],
            [action.method] : action.result
          }
        };
        break;
      default:
        return state;
    }
  }

  actionTypes(){
    return new Promise((resolve, reject) => {
      let Types = [];
      this.abiNames().map((abi) => {
        let type = abi.replace(/([A-Z])/g, '_$1').toUpperCase();
        Types.push(type);
      }).then(() => {
        resolve(Types);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  getState() {
    return new Promise((resolve, reject) => {
      let State = new Object();
      this.promisify().then((Contract) => {
        this.contract = Contract;
        return this.abi;
      }).map((abi) => {
        if(this.contract[abi['name']] && this.contract[abi['name']]['callAsync'] && abi['inputs'].length == 0){
          return join(abi['name'], this.contract[abi['name']].callAsync(), (name, state) => {
            State[name] = state;
          });
        }
      }).then(() => {
        this.state = State;
        resolve(State);
      }).catch((error) => {
        reject(error);
      });
    })
  }

  initDeployed(deployed) {
    return new Promise((resolve, reject) => {
      if(!deployed || !deployed['interface'] || !deployed['txReceipt']){
        let error = new Error(`Invalid deployed object provided. Deployed object must have an interface and txReceipt object. Use .deploy() to generate first.`);
        reject(error);
      } else {
        this.abi = JSON.parse(deployed['interface']);
        this.address = deployed['txReceipt']['contractAddress'];
        this.deployedBlockNumber = deployed['txReceipt']['blockNumber'];
        this.contract = this.eth.contract(this.abi).at(this.address);
        this.events = this.contract.allEvents({fromBlock : this.deployedBlockNumber, toBlock : 'latest'});
        this.promisify().then((contract) => {
          this.contract = contract;
          resolve(this.contract);
        }).catch((error) => {
          reject(error);
        })

      }
    });
  }

  initState() {
    return (dispatch) => {
      let State = new Object();
      State['LOGS'] = {};
      Promise.resolve(this.abi).map((abi) => {
        if(abi['type'] == 'function'){
          State[abi['name']] = {};
        } else if(abi['type'] == 'event'){
          State['LOGS'][abi['name']] = [];
        }
      }).then(() => {
        return this.getState();
      }).then((state) => {
        State = {
          ...State,
          ...state
        };

        dispatch({type : 'INIT_STATE', result : State, contract : this.address});
      }).catch((error) => {
        throw error;
      });
    }
  }

}
