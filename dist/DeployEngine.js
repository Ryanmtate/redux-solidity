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

    _this.contractDir = options.contractDir || process.cwd() + '/contracts';
    _this.deployedDir = options.deployedDir || process.cwd() + '/deployed';
    _this.compiledDir = options.compiledDir || process.cwd() + '/compiled';
    _this.compiled = options.compiled || null;
    _this.fileName = options.fileName || options.contractName;
    _this.deployed = {};
    _this.params = options.params;
    _this.libraries = options.libraries || {};
    return _this;
  }

  _createClass(DeployEngine, [{
    key: 'compile',
    value: function compile() {
      var _this2 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var sources = new Object();
        fs.readdirAsync('' + _this2.contractDir).map(function (file) {
          if (file.match(RegExp(".sol"))) {
            return join(file, fs.readFileAsync(_this2.contractDir + '/' + file, 'utf-8'), function (file, src) {
              sources[file] = src;
            });
          }
        }).then(function () {
          return _solc2.default.compile({ sources: sources }, 1);
        }).then(function (compiled) {
          if (!compiled.contracts) {
            reject(compiled);
          } else {
            _this2.compiled = compiled;
            return _this2.saveCompiled();
          }
        }).then(function () {
          resolve(_this2.compiled);
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
        _bluebird2.default.resolve(fs.existsSync('' + _this3.compiledDir)).then(function (exists) {
          if (!exists) {
            return fs.mkdirAsync('' + _this3.compiledDir);
          } else {
            return true;
          }
        }).then(function () {
          return jsonfile.writeFileAsync(_this3.compiledDir + '/compiled.json', _this3.compiled);
        }).then(function () {
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
        _bluebird2.default.resolve(fs.existsSync(_this4.compiledDir + '/compiled.json')).then(function (exists) {
          if (!exists) {
            _this4.compiled ? resolve(_this4.compiled) : resolve(null);
          } else {
            return jsonfile.readFileAsync(_this4.compiledDir + '/compiled.json');
          }
        }).then(function (compiled) {
          _this4.compiled = compiled;
          _this4.abi = JSON.parse(compiled['contracts'][_this4.contractName]['interface']);
          _this4.bytecode = compiled['contracts'][_this4.contractName]['bytecode'];
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
        _this5.getCompiled().then(function (compiled) {
          if (!compiled) {
            return _this5.compile();
          } else {
            return compiled;
          }
        }).then(function (compiled) {
          _this5.deployed = compiled['contracts'][_this5.contractName];
          _this5.abi = JSON.parse(compiled['contracts'][_this5.contractName]['interface']);
          return _this5.linkBytecode(compiled['contracts'][_this5.contractName]['bytecode']);
        }).then(function (bytecode) {
          _this5.bytecode = bytecode;
          _this5.sendObject['data'] = _this5.bytecode;
          return _this5.eth.contract(_this5.abi);
        }).then(function (contract) {
          if (typeof _this5.params == 'undefined' || _this5.params.length == 0) {
            if (!_this5.privateKey) {
              return contract.new(_this5.sendObject);
            } else {
              var _sendObject = _this5.sendObject;
              var from = _sendObject.from;
              var value = _sendObject.value;
              var gas = _sendObject.gas;

              var data = contract.new.getData({ data: '0x' + _this5.bytecode });
              var to = null;
              return _this5.sendSigned(from, to, value, gas, data, _this5.privateKey, null);
            }
          } else {
            if (!_this5.privateKey) {
              return contract.new.apply(contract, _toConsumableArray(_this5.params).concat([_this5.sendObject]));
            } else {
              var _contract$new;

              var _sendObject2 = _this5.sendObject;
              var _from = _sendObject2.from;
              var _value = _sendObject2.value;
              var _gas = _sendObject2.gas;

              var _data = (_contract$new = contract.new).getData.apply(_contract$new, _toConsumableArray(_this5.params).concat([{ data: '0x' + _this5.bytecode }]));
              var _to = null;
              return _this5.sendSigned(_from, _to, _value, _gas, _data, _this5.privateKey, null);
            }
          };
        }).then(function (result) {
          if (!result['transactionHash']) {
            return _this5.getTransactionReceipt(result);
          } else {
            return _this5.getTransactionReceipt(result['transactionHash']);
          }
        }).then(function (txReceipt) {
          _this5.deployed['txReceipt'] = txReceipt;
          _this5.deployed['bytecode'] = _this5.bytecode;
          _this5.deployed['runtimeBytecode'] = _this5.bytecode;
          _this5.address = txReceipt['contractAddress'];
          return _this5.saveDeployed();
        }).then(function (saved) {
          _this5.contract = _this5.eth.contract(_this5.abi).at(_this5.address);
          return _this5.promisify();
        }).then(function (contract) {
          _this5.contract = contract;
          resolve(_this5.contract);
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
        _bluebird2.default.delay(500, fs.existsSync('' + _this6.deployedDir)).then(function (exists) {
          if (!exists) {
            return fs.mkdirAsync('' + _this6.deployedDir);
          } else {
            return true;
          }
        }).then(function () {
          return jsonfile.writeFileAsync(_this6.deployedDir + '/' + _this6.fileName + '.deployed.json', _this6.deployed);
        }).then(function () {
          resolve(true);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'linkBytecode',
    value: function linkBytecode(bytecode) {
      var _this7 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var lib = bytecode.match(RegExp("__"));
        if (!bytecode) {
          var error = new Error('Invalid Bytecode.');
        } else if (!lib) {
          _this7.bytecode = bytecode;
          resolve(_this7.bytecode);
        } else {
          _this7.deployAndReplace(lib).then(function (bytecode) {
            _this7.bytecode = bytecode;
            resolve(bytecode);
          }).catch(function (error) {
            reject(error);
          });
        }
      });
    }
  }, {
    key: 'deployAndReplace',
    value: function deployAndReplace(lib) {
      var _this8 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var index = lib['index'];
        var bytecode = lib['input'];
        var placeholder = bytecode.slice(index, index + 40);
        _this8.findAndDeployLibrary(placeholder).then(function (libraries) {
          _this8.bytecode = _solc2.default.linkBytecode(bytecode, libraries);
          return _this8.linkBytecode(_this8.bytecode);
        }).then(function (bytecode) {
          resolve(bytecode);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'findAndDeployLibrary',
    value: function findAndDeployLibrary(placeholder) {
      var _this9 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var library = void 0;
        var deployed = void 0;
        fs.readdirAsync('' + _this9.contractDir).map(function (file) {
          var target = file.replace('.sol', '');
          var m = placeholder.match(new RegExp(target));
          if (m) {
            library = target;
          }
        }).then(function () {
          if (!library) {
            var error = new Error('Library was not found in source folder!!');
            reject(error);
          } else {
            deployed = _this9.compiled['contracts'][library];
            var abi = JSON.parse(_this9.compiled['contracts'][library].interface);
            var bytecode = _this9.compiled['contracts'][library]['bytecode'];
            var contract = _this9.eth.contract(abi);
            _this9.sendObject['data'] = bytecode;

            return contract.new(_this9.sendObject);
          }
        }).then(function (contract) {
          return _this9.getTransactionReceipt(contract['transactionHash']);
        }).then(function (txReceipt) {
          deployed['txReceipt'] = txReceipt;
          return _this9.saveDeployed(library, deployed);
        }).then(function (saved) {
          _this9.libraries[library] = deployed['txReceipt']['contractAddress'];
          resolve(_this9.libraries);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }]);

  return DeployEngine;
}(_StateEngine3.default);

exports.default = DeployEngine;
