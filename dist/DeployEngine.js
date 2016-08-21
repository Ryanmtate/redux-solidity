'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _StateEngine2 = require('../dist/StateEngine');

var _StateEngine3 = _interopRequireDefault(_StateEngine2);

var _solc = require('solc');

var _solc2 = _interopRequireDefault(_solc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = _bluebird2.default.promisifyAll(require('fs'));
var join = _bluebird2.default.join;
var jsonfile = _bluebird2.default.promisifyAll(require('jsonfile'));

var DeployEngine = function (_StateEngine) {
  _inherits(DeployEngine, _StateEngine);

  function DeployEngine(options) {
    _classCallCheck(this, DeployEngine);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DeployEngine).call(this, options));

    _this.directory = options.directory;
    _this.compiled = {};
    _this.deployed = {};
    _this.params = options.params;
    return _this;
  }

  _createClass(DeployEngine, [{
    key: 'compile',
    value: function compile() {
      var _this2 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var sources = new Object();
        fs.readdirAsync(_this2.directory + '/src').map(function (file) {
          return join(file, fs.readFileAsync(_this2.directory + '/src/' + file, 'utf-8'), function (file, src) {
            sources[file] = src;
          });
        }).then(function () {
          return _solc2.default.compile({ sources: sources }, 1);
        }).then(function (compiled) {
          if (!compiled.contracts) {
            reject(compiled);
          } else {
            _this2.compiled = compiled;
            resolve(compiled);
          }
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'saveCompiled',
    value: function saveCompiled() {
      var _this3 = this;

      return new _bluebird2.default(function (resolve, reject) {
        jsonfile.writeFileAsync(_this3.directory + '/compiled.json', _this3.compiled).then(function () {
          resolve(true);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'getCompiled',
    value: function getCompiled() {
      var _this4 = this;

      return new _bluebird2.default(function (resolve, reject) {
        jsonfile.readFileAsync(_this4.directory + '/compiled.json').then(function (compiled) {
          _this4.compiled = compiled;
          _this4.abi = JSON.parse(compiled['contracts'][_this4.name]['interface']);
          _this4.bytecode = compiled['contracts'][_this4.name]['bytecode'];
          resolve(compiled);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'deploy',
    value: function deploy() {
      var _this5 = this;

      return new _bluebird2.default(function (resolve, reject) {
        _this5.deployed = new Object();
        _this5.compile().then(function (compiled) {
          _this5.deployed = compiled['contracts'][_this5.name];
          _this5.abi = JSON.parse(compiled['contracts'][_this5.name]['interface']);
          _this5.bytecode = compiled['contracts'][_this5.name]['bytecode'];
          return _this5.eth.contract(_this5.abi);
        }).then(function (contract) {
          _this5.sendObject['data'] = _this5.bytecode;
          if (typeof _this5.params == 'undefined' || _this5.params.length == 0) {
            return contract.new(_this5.sendObject);
          } else {
            return contract.new.apply(contract, _toConsumableArray(_this5.params).concat([_this5.sendObject]));
          };
        }).then(function (result) {
          return _this5.getTransactionReceipt(result['transactionHash']);
        }).then(function (txReceipt) {
          _this5.deployed['txReceipt'] = txReceipt;
          _this5.contract = _this5.eth.contract(_this5.abi).at(txReceipt['contractAdress']);
          resolve(_this5.deployed);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'saveDeployed',
    value: function saveDeployed() {
      var _this6 = this;

      return new _bluebird2.default(function (resolve, reject) {
        jsonfile.writeFileAsync(_this6.directory + '/' + _this6.name + '.deployed.json', _this6.deployed).then(function () {
          resolve(true);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'initDeployed',
    value: function initDeployed(deployed) {
      var _this7 = this;

      return new _bluebird2.default(function (resolve, reject) {
        if (!deployed || deployed['interface'] || deployed['txReceipt']) {
          var error = new Error('Invalid deployed object provided. Deployed object must have an interface and txReceipt object. Use .deploy() to generate first.');
          reject(error);
        } else {
          _this7.abi = JSON.parse(deployed['interface']);
          _this7.address = deployed['txReceipt']['contractAddress'];
          _this7.contract = _this7.eth.contract(_this7.abi).at(_this7.address);
          resolve(_this7.contract);
        }
      });
    }
  }]);

  return DeployEngine;
}(_StateEngine3.default);

exports.default = DeployEngine;
