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
    this.name = options.name;
    this.sendObject = options.sendObject;
    this.abi = options.abi;
    this.address = options.address;
    this.abi && this.address ? this.contract = this.eth.contract(this.abi).at(this.address) : this.contract = null;
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
    value: function watchEvents() {
      var _this3 = this;

      return function (dispatch) {
        _this3.events = _this3.contract.allEvents({ fromBlock: 0, toBlock: 'latest' });
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
  }, {
    key: 'getEvents',
    value: function getEvents() {
      var _this4 = this;

      return function (dispatch) {
        _this4.events = _this4.contract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        _this4.events.get(function (error, logs) {
          if (error) {
            throw error;
          }
          _bluebird2.default.resolve(logs).map(function (result) {
            var type = 'LOG';
            var method = '' + result.event;

            var action = { type: type, result: result, method: method, contract: _this4.address };

            dispatch(action);
          }).catch(function (error) {
            throw error;
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
          _this5.contract = eth.contract(_this5.abi).at(_this5.address);
          resolve(_this5.contract);
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
    value: function getTransactionReceipt(txHash) {
      var _this7 = this;

      return new _bluebird2.default(function (resolve, reject) {
        _bluebird2.default.delay(5000).then(function () {
          return _this7.eth.getTransactionReceiptAsync(txHash);
        }).then(function (txReceipt) {
          if (!txReceipt) {
            return _this7.getTransactionReceipt(txHash);
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
    key: 'send',
    value: function send(method, params, value) {
      var _this8 = this;

      return function (dispatch) {
        var type = method.replace(/([A-Z])/g, '_$1').toUpperCase();

        _this8.actionTypes().then(function (types) {
          if (types.indexOf(type) == -1) {
            var error = new Error('METHOD NOT FOUND: ' + method);
            throw error;
          } else {
            return _this8.promisify();
          }
        }).then(function (contract) {
          _this8.contract = contract;
          var numInputs = void 0;
          var inputs = Object.keys(_this8.contract[method])[5];

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

            _this8.sendObject['value'] = value || 0;
            return (_contract$method = _this8.contract[method]).sendTransactionAsync.apply(_contract$method, _toConsumableArray(params).concat([_this8.sendObject]));
          }
        }).then(function (txHash) {
          return _this8.getTransactionReceipt(txHash);
        }).then(function (result) {
          dispatch({ type: type, result: result, method: method, contract: _this8.address });
        }).catch(function (error) {
          throw error;
        });
      };
    }
  }, {
    key: 'call',
    value: function call(method, params) {
      var _this9 = this;

      return function (dispatch) {
        var type = method.replace(/([A-Z])/g, '_$1').toUpperCase();

        _this9.actionTypes().then(function (types) {
          if (types.indexOf(type) == -1) {
            var error = new Error('METHOD NOT FOUND: ' + method);
            throw error;
          } else {
            return _this9.promisify();
          }
        }).then(function (contract) {
          _this9.contract = contract;
          var numInputs = 0;
          var inputs = Object.keys(_this9.contract[method])[5];

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

            return (_contract$method2 = _this9.contract[method]).callAsync.apply(_contract$method2, _toConsumableArray(params).concat([_this9.sendObject]));
          }
        }).then(function (result) {
          dispatch({ type: type, result: result, method: method, contract: _this9.address });
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
      var _this10 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var Types = [];
        _this10.abiNames().map(function (abi) {
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
      var _this11 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var State = new Object();
        _this11.promisify().then(function (Contract) {
          _this11.contract = Contract;
          return _this11.abi;
        }).map(function (abi) {
          if (_this11.contract[abi['name']] && _this11.contract[abi['name']]['callAsync'] && abi['inputs'].length == 0) {
            return join(abi['name'], _this11.contract[abi['name']].callAsync(), function (name, state) {
              State[name] = state;
            });
          }
        }).then(function () {
          _this11.state = State;
          resolve(State);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'initDeployed',
    value: function initDeployed(deployed) {
      var _this12 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (!deployed || !deployed['interface'] || !deployed['txReceipt']) {
          var error = new Error('Invalid deployed object provided. Deployed object must have an interface and txReceipt object. Use .deploy() to generate first.');
          reject(error);
        } else {
          _this12.abi = JSON.parse(deployed['interface']);
          _this12.address = deployed['txReceipt']['contractAddress'];
          _this12.contract = _this12.eth.contract(_this12.abi).at(_this12.address);
          resolve(_this12.contract);
        }
      });
    }
  }, {
    key: 'initState',
    value: function initState() {
      var _this13 = this;

      return function (dispatch) {
        var State = new Object();
        State['LOGS'] = {};
        _bluebird2.default.resolve(_this13.abi).map(function (abi) {
          if (abi['type'] == 'function') {
            State[abi['name']] = {};
          } else if (abi['type'] == 'event') {
            State['LOGS'][abi['name']] = [];
          }
        }).then(function () {
          return _this13.getState();
        }).then(function (state) {
          State = _extends({}, State, state);

          dispatch({ type: 'INIT_STATE', result: State, contract: _this13.address });
        }).catch(function (error) {
          throw error;
        });
      };
    }
  }]);

  return StateEngine;
}();

exports.default = StateEngine;
