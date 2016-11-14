'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _ethereumjsTx = require('ethereumjs-tx');

var _ethereumjsTx2 = _interopRequireDefault(_ethereumjsTx);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var join = _bluebird2.default.join;
var using = _bluebird2.default.using;

var StateEngine = function () {
  function StateEngine(options) {
    _classCallCheck(this, StateEngine);

    this.web3 = options.web3;
    this.eth = _bluebird2.default.promisifyAll(options['web3']['eth']);
    this.contractName = options.contractName;
    this.sendObject = options.sendObject;
    this.abi = options.abi;
    this.address = options.address;
    this.privateKey = options.privateKey || null;
    this.deployedBlockNumber = options.deployedBlockNumber || 0;
    this.logs = undefined;
    this.abi && this.address ? this.contract = this.eth.contract(this.abi).at(this.address) : this.contract = null;
    this.contract ? this.events = this.contract.allEvents({ fromBlock: this.deployedBlockNumber, toBlock: 'latest' }) : null;
  }

  _createClass(StateEngine, [{
    key: 'abiNames',
    value: function abiNames() {
      var _this = this;

      return new _bluebird2.default(function (resolve, reject) {
        var names = [];
        _async2.default.forEach(_this.abi, function (a, cb) {
          if (!a['name']) {
            cb();
          } else {
            names.push(a['name']);
            cb();
          }
        }, function (error) {
          if (error) {
            reject(error);
          }
          resolve(names);
        });
      });
    }
  }, {
    key: 'eventNames',
    value: function eventNames() {
      var _this2 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var names = [];
        _bluebird2.default.resolve(_this2.abi).map(function (abi) {
          if (abi['type'] == 'event') {
            names.push(abi['name']);
          }
        }).then(function () {
          resolve(names);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'watchEvents',
    value: function watchEvents(_filterParams, _filterWindow, _eventFunc) {
      var _this3 = this;

      return function (dispatch) {
        var filterParams = _filterParams || {};
        var filterWindow = _filterWindow || { fromBlock: 0, toBlock: 'latest' };
        var eventFunc = _eventFunc || _this3.contract.allEvents;
        if (!!_eventFunc) {
          _this3.events = eventFunc(_filterParams, _filterWindow);
        } else {
          _this3.events = eventFunc(_filterWindow);
        };

        _this3.events.watch(function (error, result) {
          if (error) {
            throw error;
          }
          var type = 'LOG';
          var method = '' + result.event;

          var action = { type: type, result: result, method: method, contract: _this3.address };

          dispatch(action);
        });
      };
    }

    /**
     *
     */

  }, {
    key: 'getEvents',
    value: function getEvents(_filterParams, _filterWindow, _eventFunc) {
      var _this4 = this;

      return function (dispatch) {
        var filterParams = _filterParams || {};
        var filterWindow = _filterWindow || { fromBlock: 0, toBlock: 'latest' };
        var eventFunc = _eventFunc || _this4.contract.allEvents;
        if (!!_eventFunc) {
          _this4.events = eventFunc(_filterParams, _filterWindow);
        } else {
          _this4.events = eventFunc(_filterWindow);
        };

        _this4.events.get(function (error, logs) {
          if (error) {
            throw error;
          }
          _bluebird2.default.resolve(logs).map(function (result) {
            var type = 'LOG';
            var method = '' + result.event;

            var action = { type: type, result: result, method: method, contract: _this4.address };

            dispatch(action);
            return null;
          }).catch(function (error) {
            dispatch({ type: 'LOG_ERROR', result: error, method: null, contract: _this4.address });
            return null;
          });
        });
      };
    }
  }, {
    key: 'setContract',
    value: function setContract(abi, address) {
      var _this5 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (!abi || !address || address.length != 42) {
          var error = new Error('Invalid ABI or Contract Address.');
          reject(error);
        } else {
          _this5.abi = abi;
          _this5.address = address;
          _this5.contract = _this5.eth.contract(_this5.abi).at(_this5.address);
          _this5.events = _this5.contract.allEvents({ fromBlock: _this5.deployedBlockNumber, toBlock: 'latest' });
          _this5.promisify().then(function (contract) {
            _this5.contract = contract;
            resolve(_this5.contract);
          }).catch(function (error) {
            reject(error);
          });
        }
      });
    }
  }, {
    key: 'promisify',
    value: function promisify() {
      var _this6 = this;

      return new _bluebird2.default(function (resolve, reject) {
        _this6.abiNames().map(function (name) {
          if (_this6.contract[name] && _this6.contract[name]['request']) {
            _this6.contract[name] = _bluebird2.default.promisifyAll(_this6.contract[name]);
          }
        }).then(function () {
          resolve(_this6.contract);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'getTransactionReceipt',
    value: function getTransactionReceipt(txHash, _counter) {
      var _this7 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var counter = _counter || 0;
        if (counter > 30) {
          reject(new Error('Could not find transaction receipt.'));
        }
        _bluebird2.default.delay(5000).then(function () {
          return _this7.eth.getTransactionReceiptAsync(txHash);
        }).then(function (txReceipt) {
          if (!txReceipt) {
            return _this7.getTransactionReceipt(txHash, ++counter);
          } else {
            resolve(txReceipt);
          };
        }).then(function (txReceipt) {
          resolve(txReceipt);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'generateRawTx',
    value: function generateRawTx(_from, _to, _value, _gasLimit, _method, _params, _nonce) {
      var _this8 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var from = _from || _this8.eth.accounts[0];
        var value = _value || 0;
        var to = _to || _this8.contract.address;
        var gasLimit = _gasLimit || 4712388;
        if (!_this8.contract[_method] || !_params) {
          var error = new Error('Invalid Contract Method or Parameters');
          reject(error);
        } else {
          (function () {
            var _contract$_method;

            var data = (_contract$_method = _this8.contract[_method]).getData.apply(_contract$_method, _toConsumableArray(_params));
            _bluebird2.default.resolve([_this8.eth.getGasPriceAsync(), _this8.eth.getTransactionCountAsync(_from)]).spread(function (gasPrice, n) {
              var nonce = _nonce || Number(n.toString());
              var rawTx = {
                from: from,
                to: to,
                value: value,
                data: data,
                gasLimit: gasLimit,
                nonce: nonce,
                gasPrice: Number(gasPrice.toString())
              };

              resolve(rawTx);
            }).catch(function (error) {
              reject(error);
            });
          })();
        }
      });
    }
  }, {
    key: 'sendSigned',
    value: function sendSigned(_from, _to, _value, _gasLimit, _data, _privateKey, _nonce) {
      var _this9 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (!_from || !_data) {
          reject(new Error('Invalid _from or _data field'));
        };
        _bluebird2.default.resolve([_this9.eth.getGasPriceAsync(), _this9.eth.getTransactionCountAsync(_from)]).spread(function (gasPrice, n) {
          var nonce = _nonce || Number(n.toString());
          var rawTx = {
            from: _from,
            to: _to,
            value: _value,
            data: _data,
            gasLimit: _gasLimit,
            nonce: nonce,
            gasPrice: Number(gasPrice.toString())
          };

          var tx = new _ethereumjsTx2.default(rawTx);
          var pkey = new Buffer(_privateKey, 'hex');

          tx.sign(pkey);
          console.log('tx', tx.toJSON());
          var serialized = tx.serialize();
          return _this9.eth.sendRawTransactionAsync('0x' + serialized.toString('hex'));
        }).then(function (result) {
          resolve(result);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'send',
    value: function send(method, params, value) {
      var _this10 = this;

      return function (dispatch) {
        var type = method.replace(/([A-Z])/g, '_$1').toUpperCase();

        _this10.actionTypes().then(function (types) {
          if (types.indexOf(type) == -1) {
            var error = new Error('METHOD NOT FOUND: ' + method);
            throw error;
          } else {
            return _this10.promisify();
          }
        }).then(function (contract) {
          _this10.contract = contract;
          var numInputs = void 0;
          var inputs = Object.keys(_this10.contract[method])[5];

          if (inputs.length) {
            if (inputs.match(/,/g)) {
              numInputs = inputs.match(/,/g).length + 1;
            } else {
              numInputs = 1;
            }
          }

          if (numInputs != params.length) {
            var error = new Error('Invalid Number of Inputs. Expected ' + numInputs + ' inputs, but found ' + params.length + '.');
            throw error;
          } else {
            var _contract$method;

            _this10.sendObject['value'] = value || 0;
            return (_contract$method = _this10.contract[method]).sendTransactionAsync.apply(_contract$method, _toConsumableArray(params).concat([_this10.sendObject]));
          }
        }).then(function (txHash) {
          dispatch({ type: type, result: txHash, method: '_' + method, contract: _this10.address });
          return _this10.getTransactionReceipt(txHash);
        }).then(function (result) {
          dispatch({ type: type, result: result, method: '_' + method, contract: _this10.address });
          return _bluebird2.default.delay(15000);
        }).then(function () {
          dispatch({ type: type, result: undefined, method: '_' + method, contract: _this10.address });
        }).catch(function (error) {
          dispatch({ type: type, result: error, method: '_' + method, contract: _this10.address });
        });
      };
    }
  }, {
    key: 'call',
    value: function call(method, params) {
      var _this11 = this;

      return function (dispatch) {
        var type = method.replace(/([A-Z])/g, '_$1').toUpperCase();

        _this11.actionTypes().then(function (types) {
          if (types.indexOf(type) == -1) {
            var error = new Error('METHOD NOT FOUND: ' + method);
            throw error;
          } else {
            return _this11.promisify();
          }
        }).then(function (contract) {
          _this11.contract = contract;
          var numInputs = 0;
          var inputs = Object.keys(_this11.contract[method])[5];

          if (inputs.length) {
            if (inputs.match(/,/g)) {
              numInputs = inputs.match(/,/g).length + 1;
            } else {
              numInputs = 1;
            }
          }

          if (numInputs != params.length) {
            var error = new Error('Invalid Number of Inputs. Expected ' + numInputs + ' inputs, but found ' + params.length + '.');
            throw error;
          } else {
            var _contract$method2;

            return (_contract$method2 = _this11.contract[method]).callAsync.apply(_contract$method2, _toConsumableArray(params).concat([_this11.sendObject]));
          }
        }).then(function (result) {
          dispatch({ type: type, result: result, method: '_' + method, contract: _this11.address });
        }).catch(function (error) {
          throw error;
        });
      };
    }
  }, {
    key: 'reducer',
    value: function reducer() {
      var state = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
      var action = arguments[1];

      switch (action.type) {
        case 'INIT_STATE':
          state['undefined'] ? state = null : null;
          return _extends({}, state, _defineProperty({}, action.contract, action.result));
          break;
        case 'LOG':
          !state[action.contract] ? state = _extends({}, state, _defineProperty({}, action.contract, {
            'LOGS': {}
          })) : null;
          return _extends({}, state, _defineProperty({}, action.contract, _extends({}, state[action.contract], {
            'LOGS': _extends({}, state[action.contract]['LOGS'], _defineProperty({}, action.method, _extends({}, state[action.contract]['LOGS'][action.method], _defineProperty({}, action.result['transactionHash'], action.result['args']))))
          })));
          break;
        case action.type:
          return _extends({}, state, _defineProperty({}, action.contract, _extends({}, state[action.contract], _defineProperty({}, action.method, action.result))));
          break;
        default:
          return state;
      }
    }
  }, {
    key: 'actionTypes',
    value: function actionTypes() {
      var _this12 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var Types = [];
        _this12.abiNames().map(function (abi) {
          var type = abi.replace(/([A-Z])/g, '_$1').toUpperCase();
          Types.push(type);
        }).then(function () {
          resolve(Types);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'getState',
    value: function getState() {
      var _this13 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var State = new Object();
        _this13.promisify().then(function (Contract) {
          _this13.contract = Contract;
          return _this13.abi;
        }).map(function (abi) {
          if (_this13.contract[abi['name']] && _this13.contract[abi['name']]['callAsync'] && abi['inputs'].length == 0) {
            return join(abi['name'], _this13.contract[abi['name']].callAsync(), function (name, state) {
              State[name] = state;
            });
          }
        }).then(function () {
          _this13.state = State;
          resolve(State);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'initDeployed',
    value: function initDeployed(deployed) {
      var _this14 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (!deployed || !deployed['interface'] || !deployed['txReceipt']) {
          var error = new Error('Invalid deployed object provided. Deployed object must have an interface and txReceipt object. Use .deploy() to generate first.');
          reject(error);
        } else {
          _this14.abi = JSON.parse(deployed['interface']);
          _this14.address = deployed['txReceipt']['contractAddress'];
          _this14.deployedBlockNumber = deployed['txReceipt']['blockNumber'];
          _this14.contract = _this14.eth.contract(_this14.abi).at(_this14.address);
          _this14.events = _this14.contract.allEvents({ fromBlock: _this14.deployedBlockNumber, toBlock: 'latest' });
          _this14.promisify().then(function (contract) {
            _this14.contract = contract;
            resolve(_this14.contract);
          }).catch(function (error) {
            reject(error);
          });
        }
      });
    }
  }, {
    key: 'initState',
    value: function initState() {
      var _this15 = this;

      return function (dispatch) {
        var State = new Object();
        State['LOGS'] = {};
        _bluebird2.default.resolve(_this15.abi).map(function (abi) {
          if (abi['type'] == 'function') {
            State[abi['name']] = {};
          } else if (abi['type'] == 'event') {
            State['LOGS'][abi['name']] = [];
          }
        }).then(function () {
          return _this15.getState();
        }).then(function (state) {
          State = _extends({}, State, state);
          dispatch({ type: 'INIT_STATE', result: State, contract: _this15.address });
          return null;
        }).catch(function (error) {
          throw error;
        });
      };
    }
  }]);

  return StateEngine;
}();

exports.default = StateEngine;
