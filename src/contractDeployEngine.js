import Promise from 'bluebird';
import async from 'async';
import StateEngine from '../dist/StateEngine';
import solc from 'solc';

const fs = Promise.promisifyAll(require('fs'));
const join = Promise.join;
const jsonfile = Promise.promisifyAll(require('jsonfile'));

export default class DeployEngine extends StateEngine {
  constructor(options){
    super(options);
    this.contractDir = options.contractDir || `${process.cwd()}/contracts`;
    this.deployedDir = options.deployedDir || `${process.cwd()}/deployed`;
    this.compiledDir = options.compiledDir || `${process.cwd()}/compiled`;
    this.compiled = options.compiled || {};
    this.fileName = options.fileName || options.contractName;
    this.deployed = {};
    this.params = options.params;
    this.libraries = options.libraries || {};
  }

  compile(directory) {
    return new Promise((resolve, reject) => {
      let sources = new Object();
      fs.readdirAsync(`${this.contractDir}`).map((file) => {
        if(file.match(RegExp(".sol"))){
          return join(file, fs.readFileAsync(`${this.contractDir}/${file}`, `utf-8`), (file, src) => {
            sources[file] = src;
          });
        }
      }).then(() => {
        return solc.compile({sources : sources}, 1);
      }).then((compiled) => {
        if(!compiled.contracts){
          reject(compiled);
        } else {
          this.compiled = compiled;
          return this.saveCompiled();
        }
      }).then(() => {
        resolve(this.compiled);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  saveCompiled() {
    return new Promise((resolve, reject) => {
      Promise.resolve(fs.existsSync(`${this.compiledDir}`)).then((exists) => {
        if(!exists){
          return fs.mkdirAsync(`${this.compiledDir}`);
        } else {
          return true;
        }
      }).then(() => {
        return jsonfile.writeFileAsync(`${this.compiledDir}/compiled.json`, this.compiled);
      }).then(() => {
        resolve(true);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  getCompiled() {
    return new Promise((resolve, reject) => {
      Promise.resolve(fs.existsSync(`${this.compiledDir}/compiled.json`)).then((exists) => {
        if(!exists){
          resolve(undefined);
        } else {
          return jsonfile.readFileAsync(`${this.compiledDir}/compiled.json`);
        }
      }).then((compiled) => {
        this.compiled = compiled;
        this.abi = JSON.parse(compiled['contracts'][this.contractName]['interface']);
        this.bytecode = compiled['contracts'][this.contractName]['bytecode'];
        resolve(compiled);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  deploy() {
    return new Promise((resolve, reject) => {
      this.deployed = new Object();
      this.getCompiled().then((compiled) => {
        if (!compiled) {
          return this.compile();
        } else {
          return compiled;
        }
      }).then((compiled) => {
        this.deployed = compiled['contracts'][this.contractName];
        this.abi = JSON.parse(compiled['contracts'][this.contractName]['interface']);
        return this.linkBytecode(compiled['contracts'][this.contractName]['bytecode']);
      }).then((bytecode) => {
        this.bytecode = bytecode;
        this.sendObject['data'] = this.bytecode;
        return this.eth.contract(this.abi);
      }).then((contract) => {
        if(typeof this.params == 'undefined' || this.params.length == 0){
          if (!this.privateKey) {
            return contract.new(this.sendObject);
          } else {
            const { from, value, gas } = this.sendObject;
            let data = contract.new.getData();
            let to = null;
            return this.sendSigned(from, to, value, gas, data, this.privateKey);
          }
        } else {
          if (!this.privateKey) {
            return contract.new(...this.params, this.sendObject);
          } else {
            const { from, gas } = this.sendObject;
            let value = 0;
            let data = contract.new.getData([...this.params]);
            console.log('contract.new.getData(...this.params)', data);
            let to = null;
            return this.sendSigned(from, to, value, gas, data, this.privateKey);
          }
        };
      }).then((result) => {
        return this.getTransactionReceipt(result['transactionHash']);
      }).then((txReceipt) => {
        this.deployed['txReceipt'] = txReceipt;
        this.deployed['bytecode'] = this.bytecode;
        this.deployed['runtimeBytecode'] = this.bytecode;
        this.address = txReceipt['contractAddress'];
        return this.saveDeployed();
      }).then((saved) => {
        this.contract = this.eth.contract(this.abi).at(this.address);
        return this.promisify();
      }).then((contract) => {
        this.contract = contract;
        resolve(this.contract);
      }).catch((error) => {
        reject(error);
      });
    })
  }

  saveDeployed() {
    return new Promise((resolve, reject) => {
      Promise.delay(500, fs.existsSync(`${this.deployedDir}`)).then((exists) => {
        if(!exists){
          return fs.mkdirAsync(`${this.deployedDir}`);
        } else {
          return true;
        }
      }).then(() => {
        return jsonfile.writeFileAsync(`${this.deployedDir}/${this.fileName}.deployed.json`, this.deployed);
      }).then(() => {
        resolve(true);
      }).catch((error) => {
        reject(error);
      });

    });
  }

  linkBytecode(bytecode) {
    return new Promise((resolve, reject) => {
      let lib = bytecode.match(RegExp("__"));
      if(!bytecode){
        let error = new Error('Invalid Bytecode.');
      } else if(!lib){
        this.bytecode = bytecode;
        resolve(this.bytecode);
      } else {
        this.deployAndReplace(lib).then((bytecode) => {
          this.bytecode = bytecode;
          resolve(bytecode);
        }).catch((error) => {
          reject(error);
        });
      }
    });
  }

  deployAndReplace(lib) {
    return new Promise((resolve, reject) => {
      let index = lib['index'];
      let bytecode = lib['input'];
      let placeholder = bytecode.slice(index, index+40);
      this.findAndDeployLibrary(placeholder).then((libraries) => {
        this.bytecode = solc.linkBytecode(bytecode, libraries);
        return this.linkBytecode(this.bytecode);
      }).then((bytecode) => {
        resolve(bytecode);
      }).catch((error) => {
        reject(error);
      })
    })
  }

  findAndDeployLibrary(placeholder) {
    return new Promise((resolve, reject) => {
      let library;
      let deployed;
      fs.readdirAsync(`${this.contractDir}`).map((file) => {
        let target = file.replace('.sol', '');
        let m = placeholder.match(new RegExp(target))
        if(m){
          library = target;
        }
      }).then(() => {
        if(!library){
          let error = new Error('Library was not found in source folder!!');
          reject(error);
        } else {
          deployed = this.compiled['contracts'][library];
          let abi = JSON.parse(this.compiled['contracts'][library].interface);
          let bytecode = this.compiled['contracts'][library]['bytecode'];
          let contract = this.eth.contract(abi);
          this.sendObject['data'] = bytecode;

          return contract.new(this.sendObject);
        }
      }).then((contract) => {
        return this.getTransactionReceipt(contract['transactionHash']);
      }).then((txReceipt) => {
        deployed['txReceipt'] = txReceipt;
        return this.saveDeployed(library, deployed);
      }).then((saved) => {
        this.libraries[library] = deployed['txReceipt']['contractAddress'];
        resolve(this.libraries);
      }).catch((error) => {
        reject(error);
      });
    })
  }


}
